use std::sync::Mutex;

static FALLBACK_VOLUME: Mutex<u32> = Mutex::new(70);
static FALLBACK_MUTED: Mutex<bool> = Mutex::new(false);

#[cfg(target_os = "windows")]
mod wasapi {
    use super::{FALLBACK_MUTED, FALLBACK_VOLUME};
    use windows::core::Interface;
    use windows::Win32::Foundation::CloseHandle;
    use windows::Win32::Media::Audio::{
        eMultimedia, eRender, AudioSessionStateActive, IAudioSessionControl, IAudioSessionControl2,
        IAudioSessionManager2, IMMDeviceEnumerator, ISimpleAudioVolume, MMDeviceEnumerator,
    };
    use windows::Win32::System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED};
    use windows::Win32::System::ProcessStatus::GetProcessImageFileNameW;
    use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

    fn matches_app(proc_name: &str, app_filter: &str) -> bool {
        let p = proc_name.to_lowercase();
        let a = app_filter.to_lowercase();
        if a.is_empty() {
            return true;
        }
        let keywords = [
            "edge", "msedge", "spotify", "chrome", "firefox", "brave", "opera", "vlc", "musicbee",
            "foobar2000", "aimp", "apple", "tidal", "deezer", "groove", "wmplayer",
        ];
        for kw in &keywords {
            if a.contains(kw) && p.contains(kw) {
                return true;
            }
        }
        let p_file = p.split('\\').last().unwrap_or(&p).trim_end_matches(".exe");
        if !p_file.is_empty() && a.contains(p_file) {
            return true;
        }
        false
    }

    struct SessionMatch {
        session: IAudioSessionControl,
        is_active: bool,
    }

    fn find_sessions(app_filter: &str) -> Vec<SessionMatch> {
        let mut results = Vec::new();
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            let Ok(enumerator) = CoCreateInstance::<_, IMMDeviceEnumerator>(&MMDeviceEnumerator, None, CLSCTX_ALL) else {
                return results;
            };
            let Ok(device) = enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia) else {
                return results;
            };
            let Ok(session_manager) = device.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else {
                return results;
            };
            let Ok(session_enumerator) = session_manager.GetSessionEnumerator() else {
                return results;
            };
            let Ok(count) = session_enumerator.GetCount() else {
                return results;
            };

            let mut all_active_fallback = Vec::new();

            for i in 0..count {
                let Ok(session) = session_enumerator.GetSession(i) else { continue };
                let Ok(ctrl2) = session.cast::<IAudioSessionControl2>() else { continue };
                let Ok(pid) = ctrl2.GetProcessId() else { continue };
                let state = ctrl2.GetState().unwrap_or_default();
                let is_active = state == AudioSessionStateActive;

                if pid == 0 {
                    continue;
                }

                let mut proc_name = String::new();
                if let Ok(h) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                    let mut buf = [0u16; 512];
                    let len = GetProcessImageFileNameW(h, &mut buf);
                    let _ = CloseHandle(h);
                    if len > 0 {
                        proc_name = String::from_utf16_lossy(&buf[..len as usize]);
                    }
                }

                if matches_app(&proc_name, app_filter) {
                    results.push(SessionMatch { session: session.clone(), is_active });
                } else if is_active {
                    all_active_fallback.push(SessionMatch { session, is_active: true });
                }
            }

            if results.is_empty() && !all_active_fallback.is_empty() {
                return all_active_fallback;
            }
        }
        results
    }

    pub fn get_app_volume(app_filter: &str) -> (u32, bool) {
        let sessions = find_sessions(app_filter);
        if let Some(target) = sessions.iter().find(|s| s.is_active).or_else(|| sessions.first()) {
            if let Ok(vol) = target.session.cast::<ISimpleAudioVolume>() {
                unsafe {
                    if let (Ok(level), Ok(muted)) = (vol.GetMasterVolume(), vol.GetMute()) {
                        let pct = (level * 100.0).round().clamp(0.0, 100.0) as u32;
                        let m = muted.as_bool();
                        if let Ok(mut lk) = FALLBACK_VOLUME.lock() { *lk = pct; }
                        if let Ok(mut lk) = FALLBACK_MUTED.lock() { *lk = m; }
                        return (pct, m);
                    }
                }
            }
        }
        let pct = FALLBACK_VOLUME.lock().map(|l| *l).unwrap_or(70);
        let m = FALLBACK_MUTED.lock().map(|l| *l).unwrap_or(false);
        (pct, m)
    }

    pub fn set_app_volume(percent: u32, app_filter: &str) -> u32 {
        let pct = percent.min(100);
        let level = pct as f32 / 100.0;
        let sessions = find_sessions(app_filter);

        for s in &sessions {
            if let Ok(vol) = s.session.cast::<ISimpleAudioVolume>() {
                unsafe {
                    let _ = vol.SetMasterVolume(level, std::ptr::null());
                    if pct > 0 {
                        let _ = vol.SetMute(false, std::ptr::null());
                    }
                }
            }
        }

        if let Ok(mut lk) = FALLBACK_VOLUME.lock() { *lk = pct; }
        if pct > 0 {
            if let Ok(mut lk) = FALLBACK_MUTED.lock() { *lk = false; }
        }
        pct
    }

    pub fn toggle_app_mute(app_filter: &str) -> bool {
        let (_, currently_muted) = get_app_volume(app_filter);
        let new_mute = !currently_muted;
        let sessions = find_sessions(app_filter);

        for s in &sessions {
            if let Ok(vol) = s.session.cast::<ISimpleAudioVolume>() {
                unsafe {
                    let _ = vol.SetMute(new_mute, std::ptr::null());
                }
            }
        }

        if let Ok(mut lk) = FALLBACK_MUTED.lock() { *lk = new_mute; }
        new_mute
    }
}

pub fn get_app_volume_info(app_filter: &str) -> (u32, bool) {
    #[cfg(target_os = "windows")]
    {
        wasapi::get_app_volume(app_filter)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let pct = FALLBACK_VOLUME.lock().map(|l| *l).unwrap_or(70);
        let m = FALLBACK_MUTED.lock().map(|l| *l).unwrap_or(false);
        (pct, m)
    }
}

#[tauri::command]
pub fn get_app_volume(app: Option<String>) -> (u32, bool) {
    get_app_volume_info(app.as_deref().unwrap_or(""))
}

#[tauri::command]
pub fn set_app_volume(percent: u32, app: Option<String>) -> u32 {
    let filter = app.as_deref().unwrap_or("");
    #[cfg(target_os = "windows")]
    {
        wasapi::set_app_volume(percent, filter)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let pct = percent.min(100);
        if let Ok(mut lk) = FALLBACK_VOLUME.lock() { *lk = pct; }
        pct
    }
}

#[tauri::command]
pub fn toggle_app_mute(app: Option<String>) -> bool {
    let filter = app.as_deref().unwrap_or("");
    #[cfg(target_os = "windows")]
    {
        wasapi::toggle_app_mute(filter)
    }
    #[cfg(not(target_os = "windows"))]
    {
        let mut m = false;
        if let Ok(mut lk) = FALLBACK_MUTED.lock() {
            *lk = !*lk;
            m = *lk;
        }
        m
    }
}

#[tauri::command]
pub fn change_volume(step: i32, app: Option<String>) -> u32 {
    let filter = app.as_deref().unwrap_or("");
    if step == 0 {
        let _ = toggle_app_mute(app.clone());
        let (vol, _) = get_app_volume_info(filter);
        vol
    } else {
        let (cur, _) = get_app_volume_info(filter);
        let delta = step * 4;
        let new_vol = (cur as i32 + delta).clamp(0, 100) as u32;
        set_app_volume(new_vol, app)
    }
}
