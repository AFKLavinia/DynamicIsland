use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct ForecastDay {
    pub date: String,
    pub max_c: String,
    pub min_c: String,
    pub code: String,
    pub desc: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct WeatherData {
    pub success: bool,
    pub query: String,
    pub location: String,
    pub temp_c: String,
    pub feels_c: String,
    pub today_max_c: String,
    pub today_min_c: String,
    pub humidity: String,
    pub wind_kmh: String,
    pub wind_dir: String,
    pub pressure_mb: String,
    pub uv: String,
    pub visibility_km: String,
    pub cloud_pct: String,
    pub precip_mm: String,
    pub code: String,
    pub desc: String,
    pub night: bool,
    pub sunrise: String,
    pub sunset: String,
    pub forecast: Vec<ForecastDay>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct MusicData {
    pub has_music: bool,
    pub playing: bool,
    pub title: String,
    pub artist: String,
    pub app: String,
    pub cover_url: String,
    pub spotify_available: bool,
    pub position_secs: u32,
    pub duration_secs: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct GameData {
    pub in_game: bool,
}

pub struct AppState {
    pub weather: Mutex<WeatherData>,
    pub custom_city: Mutex<String>,
}
