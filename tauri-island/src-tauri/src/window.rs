use crate::models::GameData;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn open_settings_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    if let Some(settings_win) = app_handle.get_webview_window("settings") {
        let _ = settings_win.show();
        let _ = settings_win.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(&app_handle, "settings", WebviewUrl::App("settings.html".into()))
            .title("AFK Dynamic Island Ayarları")
            .inner_size(720.0, 520.0)
            .resizable(false)
            .center()
            .always_on_top(false)
            .build();
    }
    Ok(())
}

#[tauri::command]
pub fn set_island_size(width: u32, height: u32, window: tauri::Window) -> Result<(), String> {
    // Monitörü al (mevcut veya birincil)
    let maybe_monitor = window.current_monitor().ok().flatten().or_else(|| window.primary_monitor().ok().flatten());
    if let Some(monitor) = maybe_monitor {
        let scale = monitor.scale_factor();
        let mon_phys_w = monitor.size().width as f64;
        let mon_phys_x = monitor.position().x as f64;
        let mon_phys_y = monitor.position().y as f64;

        let target_phys_w = (width as f64 * scale).round();
        let target_phys_h = (height as f64 * scale).round();
        let target_phys_x = (mon_phys_x + (mon_phys_w - target_phys_w) / 2.0).round();
        let target_phys_y = mon_phys_y;

        #[cfg(target_os = "windows")]
        {
            use windows::Win32::UI::WindowsAndMessaging::{SetWindowPos, SWP_NOACTIVATE, SWP_NOZORDER};
            use windows::Win32::Foundation::HWND;

            if let Ok(hwnd) = window.hwnd() {
                unsafe {
                    let _ = SetWindowPos(
                        HWND(hwnd.0),
                        None,
                        target_phys_x as i32,
                        target_phys_y as i32,
                        target_phys_w as i32,
                        target_phys_h as i32,
                        SWP_NOACTIVATE | SWP_NOZORDER,
                    );
                }
                return Ok(());
            }
        }

        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: target_phys_w as u32,
            height: target_phys_h as u32,
        }));
        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
            x: target_phys_x as i32,
            y: target_phys_y as i32,
        }));
    }
    Ok(())
}

#[tauri::command]
pub fn check_game_mode() -> Result<GameData, String> {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Shell::SHQueryUserNotificationState;
        use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowRect, GetDesktopWindow};
        use windows::Win32::Foundation::RECT;

        unsafe {
            // 1. D3D Exclusive Fullscreen Tespiti
            if let Ok(state) = SHQueryUserNotificationState() {
                if state.0 == 3 {
                    return Ok(GameData { in_game: true });
                }
            }

            // 2. Borderless Windowed (Pencereli Tam Ekran) Oyun Tespiti
            let fg = GetForegroundWindow();
            let desktop = GetDesktopWindow();
            if !fg.0.is_null() && fg != desktop {
                let mut rect = RECT::default();
                let mut screen_rect = RECT::default();
                if GetWindowRect(fg, &mut rect).is_ok() && GetWindowRect(desktop, &mut screen_rect).is_ok() {
                    let w = rect.right - rect.left;
                    let h = rect.bottom - rect.top;
                    let sw = screen_rect.right - screen_rect.left;
                    let sh = screen_rect.bottom - screen_rect.top;

                    // Eğer ön plandaki pencere tüm ekranı kaplıyorsa tam ekran oyundur
                    if w >= sw && h >= sh && rect.top <= 0 && rect.left <= 0 {
                        return Ok(GameData { in_game: true });
                    }
                }
            }
        }
    }
    Ok(GameData { in_game: false })
}

#[tauri::command]
pub fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}
