#[tauri::command]
pub fn change_volume(step: i32) {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Input::KeyboardAndMouse::{
            keybd_event, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VK_VOLUME_DOWN, VK_VOLUME_MUTE, VK_VOLUME_UP,
        };
        unsafe {
            let vk = match step {
                0 => VK_VOLUME_MUTE.0,
                s if s > 0 => VK_VOLUME_UP.0,
                _ => VK_VOLUME_DOWN.0,
            };
            let count = if step == 0 { 1 } else { step.abs().min(10) };
            for _ in 0..count {
                keybd_event(vk as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
                keybd_event(vk as u8, 0, KEYEVENTF_KEYUP, 0);
            }
        }
    }
    #[cfg(target_os = "linux")]
    {
        if step > 0 {
            let _ = std::process::Command::new("pactl").args(["set-sink-volume", "@DEFAULT_SINK@", "+5%"]).spawn();
        } else if step < 0 {
            let _ = std::process::Command::new("pactl").args(["set-sink-volume", "@DEFAULT_SINK@", "-5%"]).spawn();
        } else {
            let _ = std::process::Command::new("pactl").args(["set-sink-mute", "@DEFAULT_SINK@", "toggle"]).spawn();
        }
    }
}
