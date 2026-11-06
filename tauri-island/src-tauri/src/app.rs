use crate::models::AppState;
use crate::weather::{city_path, fetch_weather_autonomous};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Emitter, Manager};

pub fn run_app() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(path) = city_path(app.handle()) {
                if let Ok(saved) = std::fs::read_to_string(path) {
                    let state = app.state::<AppState>();
                    if let Ok(mut lock) = state.custom_city.lock() {
                        *lock = saved.trim().to_string();
                    }
                }
            }

            if let Some(window) = app.get_webview_window("main") {
                if let Ok(Some(monitor)) = window.current_monitor() {
                    let scale = monitor.scale_factor();
                    let mon_w = monitor.size().width as f64 / scale;
                    let mon_pos_x = monitor.position().x as f64 / scale;
                    let mon_pos_y = monitor.position().y as f64 / scale;
                    let bar_w = 140.0;
                    let bar_h = 6.0;
                    let x = mon_pos_x + (mon_w - bar_w) / 2.0;
                    let y = mon_pos_y;
                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize { width: bar_w, height: bar_h }));
                    let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
                }
            }

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    let city = {
                        let state = app_handle.state::<AppState>();
                        state.custom_city.lock().map(|c| c.clone()).unwrap_or_default()
                    };

                    if let Some(w) = fetch_weather_autonomous(&city).await {
                        {
                            let state = app_handle.state::<AppState>();
                            if let Ok(mut lock) = state.weather.lock() {
                                *lock = w.clone();
                            }
                        }
                        let _ = app_handle.emit("weather-updated", &w);
                        tokio::time::sleep(Duration::from_secs(600)).await;
                    } else {
                        tokio::time::sleep(Duration::from_secs(25)).await;
                    }
                }
            });

            Ok(())
        })
        .manage(AppState {
            weather: Mutex::new(Default::default()),
            custom_city: Mutex::new(String::new()),
        })
        .invoke_handler(tauri::generate_handler![
            crate::window::open_settings_window,
            crate::window::set_island_size,
            crate::weather::get_weather,
            crate::weather::set_city,
            crate::media::check_music,
            crate::media::open_spotify,
            crate::media::open_web_music,
            crate::audio::change_volume,
            crate::media::media_play_pause,
            crate::media::media_next,
            crate::media::media_prev,
            crate::window::check_game_mode
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
