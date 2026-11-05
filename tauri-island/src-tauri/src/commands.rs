use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WeatherData {
    pub city: String,
    pub temp: String,
    pub feels_like: String,
    pub humidity: String,
    pub wind: String,
    pub desc: String,
    pub success: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MusicData {
    pub has_music: bool,
    pub title: String,
    pub artist: String,
    pub app: String,
    pub cover_url: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct GameData {
    pub in_game: bool,
    pub game_title: String,
}

pub struct AppState {
    pub weather: Mutex<WeatherData>,
    pub music: Mutex<MusicData>,
    pub game: Mutex<GameData>,
    pub custom_city: Mutex<String>,
}

// BAĞIMSIZ SABİT AYARLAR PENCERESİ
#[tauri::command]
pub async fn open_settings_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(settings_win) = app_handle.get_webview_window("settings") {
        let _ = settings_win.show();
        let _ = settings_win.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(&app_handle, "settings", WebviewUrl::App("settings.html".into()))
            .title("Dynamic Island Ayarları")
            .inner_size(440.0, 320.0)
            .resizable(false)
            .center()
            .always_on_top(true)
            .build();
    }
    Ok(())
}

#[tauri::command]
pub fn set_island_size(width: u32, height: u32, window: tauri::Window) -> Result<(), String> {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let screen_width = monitor.size().width;
        let x = (screen_width as i32 - width as i32) / 2;
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }));
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y: 0 }));
    }
    Ok(())
}

#[tauri::command]
pub async fn get_weather(state: State<'_, AppState>) -> Result<WeatherData, String> {
    let city = {
        let lock = state.custom_city.lock().map_err(|e| e.to_string())?;
        lock.clone()
    };

    let client = reqwest::Client::new();
    let url = format!("https://wttr.in/{}?format=j1", urlencoding(&city));
    
    if let Ok(resp) = client.get(&url).header("User-Agent", "curl/7.68.0").send().await {
        if let Ok(json_val) = resp.json::<serde_json::Value>().await {
            if let Some(cur) = json_val.get("current_condition").and_then(|v| v.get(0)) {
                let temp = cur.get("temp_C").and_then(|v| v.as_str()).unwrap_or("--");
                let feels = cur.get("FeelsLikeC").and_then(|v| v.as_str()).unwrap_or(temp);
                let humidity = cur.get("humidity").and_then(|v| v.as_str()).unwrap_or("--");
                let wind = cur.get("windspeedKmph").and_then(|v| v.as_str()).unwrap_or("--");
                let raw_desc = cur.get("weatherDesc").and_then(|v| v.get(0)).and_then(|v| v.get("value")).and_then(|v| v.as_str()).unwrap_or("");
                
                let desc_tr = translate_desc(raw_desc);
                let result = WeatherData {
                    city: city.clone(),
                    temp: format!("{}°C", temp),
                    feels_like: format!("Hissedilen: {}°C", feels),
                    humidity: format!("Nem: %{}", humidity),
                    wind: format!("Rüzgar: {} km/s", wind),
                    desc: desc_tr,
                    success: true,
                };
                if let Ok(mut lock) = state.weather.lock() {
                    *lock = result.clone();
                }
                return Ok(result);
            }
        }
    }

    Ok(WeatherData {
        city,
        temp: "--°C".to_string(),
        feels_like: "".to_string(),
        humidity: "".to_string(),
        wind: "".to_string(),
        desc: "Bağlantı Yok".to_string(),
        success: false,
    })
}

#[tauri::command]
pub fn set_city(city: String, state: State<'_, AppState>) -> Result<String, String> {
    let mut lock = state.custom_city.lock().map_err(|e| e.to_string())?;
    *lock = city.clone();
    Ok(city)
}

#[tauri::command]
pub async fn check_music() -> Result<MusicData, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::HWND;
        use windows::Win32::UI::WindowsAndMessaging::{EnumWindows, GetWindowTextW, IsWindowVisible};

        struct DetectState {
            title: String,
            artist: String,
            app: String,
        }
        let mut detect = DetectState {
            title: String::new(),
            artist: String::new(),
            app: String::new(),
        };

        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: windows::Win32::Foundation::LPARAM) -> windows::Win32::Foundation::BOOL {
            let detect_ptr = lparam.0 as *mut DetectState;
            unsafe {
                if IsWindowVisible(hwnd).as_bool() {
                    let mut buf = [0u16; 512];
                    let len = GetWindowTextW(hwnd, &mut buf);
                    if len > 0 {
                        let title = String::from_utf16_lossy(&buf[..len as usize]);
                        if title.contains("Spotify") && title != "Spotify Free" && title != "Spotify Premium" && title != "Spotify" {
                            let clean = title.replace("Spotify - ", "").replace(" - Spotify", "");
                            let parts: Vec<&str> = clean.split(" - ").collect();
                            if parts.len() >= 2 {
                                (*detect_ptr).artist = parts[0].trim().to_string();
                                (*detect_ptr).title = parts[1..].join(" - ").trim().to_string();
                            } else {
                                (*detect_ptr).title = clean;
                                (*detect_ptr).artist = "Spotify".to_string();
                            }
                            (*detect_ptr).app = "Spotify".to_string();
                            return windows::Win32::Foundation::BOOL(0);
                        } else if title.contains("YouTube") {
                            let clean = title.replace(" - YouTube", "");
                            let parts: Vec<&str> = clean.split(" - ").collect();
                            if parts.len() >= 2 {
                                (*detect_ptr).artist = parts[0].trim().to_string();
                                (*detect_ptr).title = parts[1..].join(" - ").trim().to_string();
                            } else {
                                (*detect_ptr).title = clean;
                                (*detect_ptr).artist = "YouTube".to_string();
                            }
                            (*detect_ptr).app = "YouTube".to_string();
                            return windows::Win32::Foundation::BOOL(0);
                        }
                    }
                }
            }
            windows::Win32::Foundation::BOOL(1)
        }

        unsafe {
            let _ = EnumWindows(Some(enum_proc), windows::Win32::Foundation::LPARAM(&mut detect as *mut _ as isize));
        }

        if !detect.title.is_empty() {
            let query = format!("{} {}", detect.artist, detect.title);
            let cover = fetch_album_art(&query).await;
            return Ok(MusicData {
                has_music: true,
                title: detect.title,
                artist: detect.artist,
                app: detect.app,
                cover_url: cover,
            });
        }
    }

    Ok(MusicData {
        has_music: false,
        title: "Müzik Algılanmadı".to_string(),
        artist: "".to_string(),
        app: "Çalan medya yok".to_string(),
        cover_url: "".to_string(),
    })
}

async fn fetch_album_art(query: &str) -> String {
    let client = reqwest::Client::new();
    let url = format!("https://itunes.apple.com/search?term={}&entity=song&limit=1", urlencoding(query));
    if let Ok(resp) = client.get(&url).send().await {
        if let Ok(json_val) = resp.json::<serde_json::Value>().await {
            if let Some(first) = json_val.get("results").and_then(|r| r.get(0)) {
                if let Some(art) = first.get("artworkUrl100").and_then(|a| a.as_str()) {
                    return art.replace("100x100bb", "300x300bb");
                }
            }
        }
    }
    "".to_string()
}

#[tauri::command]
pub fn media_play_pause() {
    #[cfg(target_os = "windows")]
    send_vk(windows::Win32::UI::Input::KeyboardAndMouse::VK_MEDIA_PLAY_PAUSE.0);
}

#[tauri::command]
pub fn media_next() {
    #[cfg(target_os = "windows")]
    send_vk(windows::Win32::UI::Input::KeyboardAndMouse::VK_MEDIA_NEXT_TRACK.0);
}

#[tauri::command]
pub fn media_prev() {
    #[cfg(target_os = "windows")]
    send_vk(windows::Win32::UI::Input::KeyboardAndMouse::VK_MEDIA_PREV_TRACK.0);
}

#[cfg(target_os = "windows")]
fn send_vk(vk: u16) {
    use windows::Win32::UI::Input::KeyboardAndMouse::{keybd_event, KEYEVENTF_KEYUP};
    unsafe {
        keybd_event(vk as u8, 0, windows::Win32::UI::Input::KeyboardAndMouse::KEYBD_EVENT_FLAGS(0), 0);
        keybd_event(vk as u8, 0, KEYEVENTF_KEYUP, 0);
    }
}

#[tauri::command]
pub fn check_game_mode() -> Result<GameData, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Shell::SHQueryUserNotificationState;
        unsafe {
            if let Ok(state) = SHQueryUserNotificationState() {
                if state.0 == 3 {
                    return Ok(GameData {
                        in_game: true,
                        game_title: "Direct3D Fullscreen Oyun".to_string(),
                    });
                }
            }
        }
    }

    Ok(GameData {
        in_game: false,
        game_title: "".to_string(),
    })
}

fn urlencoding(s: &str) -> String {
    s.replace(" ", "%20")
}

fn translate_desc(raw: &str) -> String {
    let low = raw.to_lowercase();
    if low.contains("sunny") || low.contains("clear") {
        "Açık".to_string()
    } else if low.contains("partly cloudy") {
        "Parçalı Bulutlu".to_string()
    } else if low.contains("overcast") || low.contains("cloudy") {
        "Kapalı Bulutlu".to_string()
    } else if low.contains("rain") || low.contains("patchy") {
        "Yağmurlu".to_string()
    } else if low.contains("snow") {
        "Karlı".to_string()
    } else if low.contains("thunder") || low.contains("storm") {
        "Fırtına".to_string()
    } else {
        "Açık".to_string()
    }
}

pub fn run_app() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let screen_width = monitor.size().width;
                    let bar_w = 140u32;
                    let bar_h = 6u32;
                    let x = (screen_width as i32 - bar_w as i32) / 2;
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: bar_w, height: bar_h }));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y: 0 }));
                }
            }
            Ok(())
        })
        .manage(AppState {
            weather: Mutex::new(WeatherData {
                city: "İstanbul".to_string(),
                temp: "--°C".to_string(),
                feels_like: "".to_string(),
                humidity: "".to_string(),
                wind: "".to_string(),
                desc: "".to_string(),
                success: false,
            }),
            music: Mutex::new(MusicData {
                has_music: false,
                title: "Müzik Algılanmadı".to_string(),
                artist: "".to_string(),
                app: "Çalan medya yok".to_string(),
                cover_url: "".to_string(),
            }),
            game: Mutex::new(GameData {
                in_game: false,
                game_title: "".to_string(),
            }),
            custom_city: Mutex::new("İstanbul".to_string()),
        })
        .invoke_handler(tauri::generate_handler![
            open_settings_window,
            set_island_size,
            get_weather,
            set_city,
            check_music,
            media_play_pause,
            media_next,
            media_prev,
            check_game_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
