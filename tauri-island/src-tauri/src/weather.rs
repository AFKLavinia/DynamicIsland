use crate::models::{AppState, ForecastDay, WeatherData};
use crate::utils::percent_encode;
use std::time::Duration;
use tauri::{Emitter, Manager, State};

pub fn city_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("city.txt"))
}

#[cfg(target_os = "windows")]
fn get_device_os_location() -> Option<(f64, f64)> {
    use windows::Devices::Geolocation::Geolocator;
    let geolocator = Geolocator::new().ok()?;
    let timeout = windows::Foundation::TimeSpan { Duration: 30_000_000 };
    let max_age = windows::Foundation::TimeSpan { Duration: 3_000_000_000 };
    let pos = geolocator
        .GetGeopositionAsyncWithAgeAndTimeout(max_age, timeout)
        .ok()?
        .get()
        .ok()?;
    let coord = pos.Coordinate().ok()?;
    if let Ok(point) = coord.Point() {
        if let Ok(pos) = point.Position() {
            if pos.Latitude != 0.0 || pos.Longitude != 0.0 {
                return Some((pos.Latitude, pos.Longitude));
            }
        }
    }
    None
}

#[cfg(not(target_os = "windows"))]
fn get_device_os_location() -> Option<(f64, f64)> {
    None
}

async fn detect_location(client: &reqwest::Client) -> Option<(String, Option<(f64, f64)>)> {
    // 1. Cihazın yerel sensöründen dene (Windows Geolocator)
    let device_coords = tokio::task::spawn_blocking(get_device_os_location).await.ok().flatten();

    // 2. IP telemetrisinden şehir ve koordinatları çöz (HTTPS ipwho.is)
    if let Ok(resp) = client.get("https://ipwho.is/").send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if json.get("success").and_then(|s| s.as_bool()).unwrap_or(false) {
                let city = json.get("city").and_then(|c| c.as_str()).unwrap_or("");
                let region = json.get("region").and_then(|r| r.as_str()).unwrap_or("");
                let country = json.get("country").and_then(|c| c.as_str()).unwrap_or("");
                let lat = json.get("latitude").and_then(|l| l.as_f64());
                let lon = json.get("longitude").and_then(|l| l.as_f64());

                let display = if !city.is_empty() {
                    if !region.is_empty() && region != city {
                        format!("{}, {}", city, region)
                    } else if !country.is_empty() && country != city {
                        format!("{}, {}", city, country)
                    } else {
                        city.to_string()
                    }
                } else if !region.is_empty() {
                    region.to_string()
                } else {
                    country.to_string()
                };

                let coords = device_coords.or_else(|| match (lat, lon) {
                    (Some(la), Some(lo)) if la != 0.0 || lo != 0.0 => Some((la, lo)),
                    _ => None,
                });

                return Some((display, coords));
            }
        }
    }

    // 3. İkinci HTTPS IP servisi (freeipapi.com)
    if let Ok(resp) = client.get("https://freeipapi.com/api/json").send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            let city = json.get("cityName").and_then(|c| c.as_str()).unwrap_or("");
            let region = json.get("regionName").and_then(|r| r.as_str()).unwrap_or("");
            let country = json.get("countryName").and_then(|c| c.as_str()).unwrap_or("");
            let lat = json.get("latitude").and_then(|l| l.as_f64());
            let lon = json.get("longitude").and_then(|l| l.as_f64());

            let display = if !city.is_empty() {
                if !region.is_empty() && region != city {
                    format!("{}, {}", city, region)
                } else {
                    city.to_string()
                }
            } else {
                country.to_string()
            };

            let coords = device_coords.or_else(|| match (lat, lon) {
                (Some(la), Some(lo)) if la != 0.0 || lo != 0.0 => Some((la, lo)),
                _ => None,
            });

            if !display.is_empty() || coords.is_some() {
                return Some((display, coords));
            }
        }
    }

    // 4. Cihaz koordinatları varsa
    if let Some(coords) = device_coords {
        return Some((String::new(), Some(coords)));
    }

    None
}

fn wmo_code_to_desc(code: i64) -> &'static str {
    match code {
        0 => "Açık",
        1 => "Çoğunlukla Açık",
        2 => "Parçalı Bulutlu",
        3 => "Bulutlu",
        45 | 48 => "Sisli",
        51 | 53 | 55 => "Çisenti",
        56 | 57 => "Dondurucu Çisenti",
        61 => "Hafif Yağmurlu",
        63 => "Yağmurlu",
        65 => "Kuvvetli Yağmur",
        66 | 67 => "Dondurucu Yağmur",
        71 => "Hafif Kar",
        73 => "Kar Yağışlı",
        75 => "Yoğun Kar",
        77 => "Kar Taneleri",
        80 => "Hafif Sağanak",
        81 => "Sağanak Yağış",
        82 => "Şiddetli Sağanak",
        85 => "Kar Sağanağı",
        86 => "Yoğun Kar Sağanağı",
        95 => "Gök Gürültülü Fırtına",
        96 | 99 => "Dolu ve Fırtına",
        _ => "Açık",
    }
}

fn wind_deg_to_16point(deg: f64) -> &'static str {
    let dirs = ["K", "KKD", "KD", "DKD", "D", "DGD", "GD", "GGD", "G", "GGB", "GB", "BGB", "B", "BKB", "KB", "KKB"];
    let idx = ((deg + 11.25) / 22.5).floor() as usize % 16;
    dirs[idx]
}

async fn geocode_city(client: &reqwest::Client, city: &str) -> Option<(String, f64, f64)> {
    let url = format!(
        "https://geocoding-api.open-meteo.com/v1/search?name={}&count=1&language=tr&format=json",
        percent_encode(city)
    );
    let resp = client.get(&url).send().await.ok()?;
    let json = resp.json::<serde_json::Value>().await.ok()?;
    let first = json.get("results")?.as_array()?.first()?;
    let name = first.get("name").and_then(|v| v.as_str()).unwrap_or(city);
    let country = first.get("country").and_then(|v| v.as_str()).unwrap_or("");
    let lat = first.get("latitude").and_then(|v| v.as_f64())?;
    let lon = first.get("longitude").and_then(|v| v.as_f64())?;
    let display = if !country.is_empty() && country != name {
        format!("{}, {}", name, country)
    } else {
        name.to_string()
    };
    Some((display, lat, lon))
}

async fn fetch_open_meteo(
    client: &reqwest::Client,
    lat: f64,
    lon: f64,
    location_name: &str,
) -> Option<WeatherData> {
    let url = format!(
        "https://api.open-meteo.com/v1/forecast?latitude={:.4}&longitude={:.4}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,cloud_cover&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max&timezone=auto",
        lat, lon
    );
    let resp = client.get(&url).send().await.ok()?;
    let json = resp.json::<serde_json::Value>().await.ok()?;
    let current = json.get("current")?;
    let daily = json.get("daily");

    let temp_c = current.get("temperature_2m").and_then(|v| v.as_f64()).map(|t| format!("{:.0}", t.round())).unwrap_or_default();
    let feels_c = current.get("apparent_temperature").and_then(|v| v.as_f64()).map(|t| format!("{:.0}", t.round())).unwrap_or_default();
    let humidity = current.get("relative_humidity_2m").and_then(|v| v.as_i64()).map(|h| h.to_string()).unwrap_or_default();
    let wind_kmh = current.get("wind_speed_10m").and_then(|v| v.as_f64()).map(|w| format!("{:.0}", w.round())).unwrap_or_default();
    let wind_deg = current.get("wind_direction_10m").and_then(|v| v.as_f64()).unwrap_or(0.0);
    let wind_dir = wind_deg_to_16point(wind_deg).to_string();
    let pressure_mb = current.get("surface_pressure").and_then(|v| v.as_f64()).map(|p| format!("{:.0}", p.round())).unwrap_or_default();
    let cloud_pct = current.get("cloud_cover").and_then(|v| v.as_i64()).map(|c| c.to_string()).unwrap_or_default();
    let precip_mm = current.get("precipitation").and_then(|v| v.as_f64()).map(|p| format!("{:.1}", p)).unwrap_or_default();
    let wmo_code = current.get("weather_code").and_then(|v| v.as_i64()).unwrap_or(0);
    let code = wmo_code.to_string();
    let desc = wmo_code_to_desc(wmo_code).to_string();
    let is_day = current.get("is_day").and_then(|v| v.as_i64()).unwrap_or(1);
    let night = is_day == 0;

    let uv = daily.and_then(|d| d.get("uv_index_max"))
        .and_then(|a| a.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_f64())
        .map(|u| format!("{:.0}", u.round()))
        .unwrap_or_default();

    let sunrise = daily.and_then(|d| d.get("sunrise"))
        .and_then(|a| a.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .and_then(|s| s.split('T').nth(1))
        .unwrap_or_default()
        .to_string();

    let sunset = daily.and_then(|d| d.get("sunset"))
        .and_then(|a| a.as_array())
        .and_then(|a| a.first())
        .and_then(|v| v.as_str())
        .and_then(|s| s.split('T').nth(1))
        .unwrap_or_default()
        .to_string();

    let forecast = daily.and_then(|d| {
        let times = d.get("time")?.as_array()?;
        let maxs = d.get("temperature_2m_max")?.as_array()?;
        let mins = d.get("temperature_2m_min")?.as_array()?;
        let codes = d.get("weather_code")?.as_array()?;
        let days = times.iter().enumerate().take(3).map(|(i, t)| {
            let date = t.as_str().unwrap_or("").to_string();
            let max_c = maxs.get(i).and_then(|v| v.as_f64()).map(|v| format!("{:.0}", v.round())).unwrap_or_default();
            let min_c = mins.get(i).and_then(|v| v.as_f64()).map(|v| format!("{:.0}", v.round())).unwrap_or_default();
            let c = codes.get(i).and_then(|v| v.as_i64()).unwrap_or(0);
            ForecastDay {
                date,
                max_c,
                min_c,
                code: c.to_string(),
                desc: wmo_code_to_desc(c).to_string(),
            }
        }).collect();
        Some(days)
    }).unwrap_or_default();

    let (today_max_c, today_min_c) = daily.and_then(|d| {
        let maxs = d.get("temperature_2m_max")?.as_array()?;
        let mins = d.get("temperature_2m_min")?.as_array()?;
        let max_val = maxs.first().and_then(|v| v.as_f64()).map(|v| format!("{:.0}", v.round())).unwrap_or_default();
        let min_val = mins.first().and_then(|v| v.as_f64()).map(|v| format!("{:.0}", v.round())).unwrap_or_default();
        Some((max_val, min_val))
    }).unwrap_or_default();

    Some(WeatherData {
        success: true,
        query: String::new(),
        location: location_name.to_string(),
        temp_c,
        feels_c,
        today_max_c,
        today_min_c,
        humidity,
        wind_kmh,
        wind_dir,
        pressure_mb,
        uv,
        visibility_km: String::new(),
        cloud_pct,
        precip_mm,
        code,
        desc,
        night,
        sunrise,
        sunset,
        forecast,
    })
}

fn val(v: &serde_json::Value, key: &str) -> String {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("").trim().to_string()
}

fn first_val(v: &serde_json::Value, key: &str) -> String {
    v.get(key)
        .and_then(|a| a.get(0))
        .and_then(|o| o.get("value"))
        .and_then(|x| x.as_str())
        .unwrap_or("")
        .trim()
        .to_string()
}

fn lang_desc(v: &serde_json::Value) -> String {
    let d = first_val(v, "lang_tr");
    if d.is_empty() { first_val(v, "weatherDesc") } else { d }
}

fn parse_weather(json: &serde_json::Value, query_city: &str, detected_location: &str) -> Option<WeatherData> {
    let cur = json.get("current_condition")?.get(0)?;
    let area = json.get("nearest_area").and_then(|a| a.get(0));
    let area_name = area.map(|a| first_val(a, "areaName")).unwrap_or_default();
    let region = area.map(|a| first_val(a, "region")).unwrap_or_default();
    let country = area.map(|a| first_val(a, "country")).unwrap_or_default();

    let location = if !query_city.trim().is_empty() {
        query_city.trim().to_string()
    } else if !detected_location.is_empty() {
        detected_location.to_string()
    } else if !area_name.is_empty() && !region.is_empty() && region != area_name {
        format!("{}, {}", area_name, region)
    } else if !area_name.is_empty() && !country.is_empty() {
        format!("{}, {}", area_name, country)
    } else if !area_name.is_empty() {
        area_name
    } else {
        country
    };

    let days = json.get("weather").and_then(|w| w.as_array());
    let astronomy = days
        .and_then(|d| d.first())
        .and_then(|d| d.get("astronomy"))
        .and_then(|a| a.get(0));

    let forecast = days
        .map(|list| {
            list.iter()
                .map(|day| {
                    let hourly = day.get("hourly").and_then(|h| h.as_array());
                    let noon = hourly.and_then(|h| h.get(4).or_else(|| h.last()));
                    ForecastDay {
                        date: val(day, "date"),
                        max_c: val(day, "maxtempC"),
                        min_c: val(day, "mintempC"),
                        code: noon.map(|h| val(h, "weatherCode")).unwrap_or_default(),
                        desc: noon.map(lang_desc).unwrap_or_default(),
                    }
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    let (today_max_c, today_min_c) = days
        .and_then(|d| d.first())
        .map(|day| (val(day, "maxtempC"), val(day, "mintempC")))
        .unwrap_or_default();

    Some(WeatherData {
        success: true,
        query: query_city.to_string(),
        location,
        temp_c: val(cur, "temp_C"),
        feels_c: val(cur, "FeelsLikeC"),
        today_max_c,
        today_min_c,
        humidity: val(cur, "humidity"),
        wind_kmh: val(cur, "windspeedKmph"),
        wind_dir: val(cur, "winddir16Point"),
        pressure_mb: val(cur, "pressure"),
        uv: val(cur, "uvIndex"),
        visibility_km: val(cur, "visibility"),
        cloud_pct: val(cur, "cloudcover"),
        precip_mm: val(cur, "precipMM"),
        code: val(cur, "weatherCode"),
        desc: lang_desc(cur),
        night: first_val(cur, "weatherIconUrl").to_lowercase().contains("night"),
        sunrise: astronomy.map(|a| val(a, "sunrise")).unwrap_or_default(),
        sunset: astronomy.map(|a| val(a, "sunset")).unwrap_or_default(),
        forecast,
    })
}

pub async fn fetch_weather_autonomous(custom_city: &str) -> Option<WeatherData> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .ok()?;

    if !custom_city.trim().is_empty() {
        let city = custom_city.trim();
        // 1. Open-Meteo Geocoding + Telemetri
        if let Some((loc, lat, lon)) = geocode_city(&client, city).await {
            if let Some(mut w) = fetch_open_meteo(&client, lat, lon, &loc).await {
                w.query = city.to_string();
                return Some(w);
            }
        }
        // Yedek: wttr.in
        let url = format!("https://wttr.in/{}?format=j1&lang=tr", percent_encode(city));
        if let Ok(resp) = client.get(&url).send().await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(w) = parse_weather(&json, city, city) {
                    return Some(w);
                }
            }
        }
        return None;
    }

    // Otonom Konum Tespiti
    if let Some((loc, coords)) = detect_location(&client).await {
        if let Some((lat, lon)) = coords {
            // Birincil Yüksek Hızlı Motor: Open-Meteo (20ms, ham istasyon telemetrisi)
            if let Some(w) = fetch_open_meteo(&client, lat, lon, &loc).await {
                return Some(w);
            }

            // Yedek: wttr.in koordinat
            let url = format!("https://wttr.in/{:.4},{:.4}?format=j1&lang=tr", lat, lon);
            if let Ok(resp) = client.get(&url).send().await {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(w) = parse_weather(&json, "", &loc) {
                        return Some(w);
                    }
                }
            }
        } else if !loc.is_empty() {
            let url = format!("https://wttr.in/{}?format=j1&lang=tr", percent_encode(&loc));
            if let Ok(resp) = client.get(&url).send().await {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(w) = parse_weather(&json, "", &loc) {
                        return Some(w);
                    }
                }
            }
        }
    }

    // Son çare wttr.in IP endpoint
    let url = "https://wttr.in/?format=j1&lang=tr";
    if let Ok(resp) = client.get(url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(w) = parse_weather(&json, "", "") {
                return Some(w);
            }
        }
    }

    None
}

#[tauri::command]
pub async fn get_weather(state: State<'_, AppState>) -> Result<WeatherData, String> {
    let city = state.custom_city.lock().map(|c| c.clone()).unwrap_or_default();

    if let Ok(lock) = state.weather.lock() {
        if lock.success && lock.query == city {
            return Ok(lock.clone());
        }
    }

    if let Some(w) = fetch_weather_autonomous(&city).await {
        if let Ok(mut lock) = state.weather.lock() {
            *lock = w.clone();
        }
        return Ok(w);
    }

    if let Ok(lock) = state.weather.lock() {
        if lock.success {
            return Ok(lock.clone());
        }
    }

    Ok(WeatherData { query: city, ..Default::default() })
}

#[tauri::command]
pub async fn set_city(city: String, app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let city = city.trim().to_string();
    if let Ok(mut lock) = state.custom_city.lock() {
        *lock = city.clone();
    }

    if let Ok(mut w) = state.weather.lock() {
        *w = WeatherData::default();
    }

    if let Some(path) = city_path(&app) {
        if let Some(dir) = path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        let _ = std::fs::write(path, &city);
    }

    let app_clone = app.clone();
    let city_clone = city.clone();
    tauri::async_runtime::spawn(async move {
        if let Some(w) = fetch_weather_autonomous(&city_clone).await {
            let state = app_clone.state::<AppState>();
            if let Ok(mut lock) = state.weather.lock() {
                *lock = w.clone();
            }
            let _ = app_clone.emit("weather-updated", &w);
        }
    });

    let _ = app.emit("weather-refresh", ());
    Ok(city)
}
