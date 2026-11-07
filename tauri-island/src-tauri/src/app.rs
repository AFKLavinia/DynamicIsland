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
                let maybe_monitor = window.current_monitor().ok().flatten().or_else(|| window.primary_monitor().ok().flatten());
                if let Some(monitor) = maybe_monitor {
                    let scale = monitor.scale_factor();
                    let mon_phys_w = monitor.size().width as f64;
                    let mon_phys_x = monitor.position().x as f64;
                    let mon_phys_y = monitor.position().y as f64;
                    let bar_phys_w = (140.0 * scale).round();
                    let bar_phys_h = (6.0 * scale).round();
                    let x = (mon_phys_x + (mon_phys_w - bar_phys_w) / 2.0).round();
                    let y = mon_phys_y;
                    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: bar_phys_w as u32, height: bar_phys_h as u32 }));
                    let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 }));
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
            crate::window::check_game_mode,
            crate::window::exit_app,
            crate::weather::get_weather,
            crate::weather::set_city,
            crate::media::check_music,
            crate::media::open_spotify,
            crate::media::open_web_music,
            crate::audio::change_volume,
            crate::media::media_play_pause,
            crate::media::media_next,
            crate::media::media_prev
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
