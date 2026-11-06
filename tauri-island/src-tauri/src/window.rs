use crate::models::GameData;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

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
        let scale = monitor.scale_factor();
        let mon_w = monitor.size().width as f64 / scale;
        let mon_pos_x = monitor.position().x as f64 / scale;
        let mon_pos_y = monitor.position().y as f64 / scale;
        let x = mon_pos_x + (mon_w - width as f64) / 2.0;
        let y = mon_pos_y;
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: width as f64,
            height: height as f64,
        }));
        let _ = window.set_position(tauri::Position::Logical(tauri::LogicalPosition { x, y }));
    }
    Ok(())
}

#[tauri::command]
pub fn check_game_mode() -> Result<GameData, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Shell::SHQueryUserNotificationState;
        unsafe {
            if let Ok(state) = SHQueryUserNotificationState() {
                if state.0 == 3 {
                    return Ok(GameData { in_game: true });
                }
            }
        }
    }
    Ok(GameData { in_game: false })
}
