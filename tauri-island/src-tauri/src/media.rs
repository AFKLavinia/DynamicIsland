use crate::models::MusicData;
use crate::utils::{base64_encode, sniff_mime};
use std::sync::Mutex;
use std::time::{Duration, Instant};

#[allow(dead_code)]
pub(crate) enum Art {
    Skip,
    None,
    Bytes(Vec<u8>),
    Url(String),
}

pub(crate) struct RawMedia {
    pub title: String,
    pub artist: String,
    pub app: String,
    pub playing: bool,
    pub art: Art,
    pub position_secs: u32,
    pub duration_secs: u32,
}

pub(crate) fn media_key(app: &str, artist: &str, title: &str) -> String {
    format!("{}\u{1}{}\u{1}{}", app, artist, title)
}

struct CoverCache {
    key: String,
    cover: String,
    from_system: bool,
    at: Option<Instant>,
}

static COVER_CACHE: Mutex<CoverCache> = Mutex::new(CoverCache {
    key: String::new(),
    cover: String::new(),
    from_system: false,
    at: None,
});

#[cfg(target_os = "windows")]
mod sysmedia {
    use super::{Art, RawMedia};
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession as Session,
        GlobalSystemMediaTransportControlsSessionManager as SessionManager,
        GlobalSystemMediaTransportControlsSessionMediaProperties as MediaProps,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
    };
    use windows::Storage::Streams::DataReader;

    fn is_dedicated_music_app(app_id: &str) -> bool {
        let low = app_id.to_lowercase();
        low.contains("spotify")
            || low.contains("vlc")
            || low.contains("musicbee")
            || low.contains("foobar2000")
            || low.contains("aimp")
            || low.contains("applemusic")
            || low.contains("apple music")
            || low.contains("tidal")
            || low.contains("deezer")
            || low.contains("groove")
    }

    fn pick_session(manager: &SessionManager) -> Option<Session> {
        let current_playing = manager
            .GetCurrentSession()
            .ok()
            .filter(|s| {
                s.GetPlaybackInfo()
                    .and_then(|i| i.PlaybackStatus())
                    .map(|p| p == PlaybackStatus::Playing)
                    .unwrap_or(false)
            });

        let mut playing_music = None;
        let mut playing_other = None;
        let mut paused_music = None;
        let mut first = None;

        if let Ok(list) = manager.GetSessions() {
            for s in list {
                let app = s.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default();
                let is_music = is_dedicated_music_app(&app);
                let playing = s
                    .GetPlaybackInfo()
                    .and_then(|i| i.PlaybackStatus())
                    .map(|p| p == PlaybackStatus::Playing)
                    .unwrap_or(false);

                if playing {
                    if is_music && playing_music.is_none() {
                        playing_music = Some(s.clone());
                    } else if playing_other.is_none() {
                        playing_other = Some(s.clone());
                    }
                } else if is_music && paused_music.is_none() {
                    paused_music = Some(s.clone());
                }

                if first.is_none() {
                    first = Some(s);
                }
            }
        }

        // 1. Çalan adanmış müzik çalar (Spotify, Apple Music, VLC vb.)
        if let Some(s) = playing_music {
            return Some(s);
        }

        // 2. Windows'un aktif odaklı çalan oturumu
        if let Some(s) = current_playing {
            return Some(s);
        }

        // 3. Herhangi bir çalan oturum (tarayıcı vs.)
        if let Some(s) = playing_other {
            return Some(s);
        }

        // 4. Duraklatılmış adanmış müzik çalar
        if let Some(s) = paused_music {
            return Some(s);
        }

        // 5. Windows GetCurrentSession veya ilk oturum
        manager.GetCurrentSession().ok().or(first)
    }

    fn get_image_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
        if bytes.len() >= 24 && &bytes[0..8] == b"\x89PNG\r\n\x1a\n" {
            let w = u32::from_be_bytes(bytes[16..20].try_into().ok()?);
            let h = u32::from_be_bytes(bytes[20..24].try_into().ok()?);
            return Some((w, h));
        }
        if bytes.len() >= 4 && bytes[0] == 0xFF && bytes[1] == 0xD8 {
            let mut i = 2;
            while i + 9 < bytes.len() {
                if bytes[i] != 0xFF {
                    i += 1;
                    continue;
                }
                let marker = bytes[i + 1];
                if marker == 0xC0 || marker == 0xC1 || marker == 0xC2 {
                    let h = u16::from_be_bytes([bytes[i + 5], bytes[i + 6]]) as u32;
                    let w = u16::from_be_bytes([bytes[i + 7], bytes[i + 8]]) as u32;
                    return Some((w, h));
                }
                if marker == 0xDA || marker == 0xD9 {
                    break;
                }
                if i + 3 < bytes.len() {
                    let len = u16::from_be_bytes([bytes[i + 2], bytes[i + 3]]) as usize;
                    if len < 2 {
                        break;
                    }
                    i += 2 + len;
                } else {
                    break;
                }
            }
        }
        None
    }

    fn read_thumbnail(props: &MediaProps) -> Option<Vec<u8>> {
        let reference = props.Thumbnail().ok()?;
        let stream = reference.OpenReadAsync().ok()?.get().ok()?;
        let size = stream.Size().ok()? as u32;
        if size == 0 || size > 6_000_000 {
            return None;
        }
        let reader = DataReader::CreateDataReader(&stream).ok()?;
        reader.LoadAsync(size).ok()?.get().ok()?;
        let mut buf = vec![0u8; size as usize];
        reader.ReadBytes(&mut buf).ok()?;
        Some(buf)
    }

    pub fn read(skip_key: &str) -> Option<RawMedia> {
        let manager = SessionManager::RequestAsync().ok()?.get().ok()?;
        let session = pick_session(&manager)?;

        let app = session.SourceAppUserModelId().map(|h| h.to_string()).unwrap_or_default();
        let props = session.TryGetMediaPropertiesAsync().ok()?.get().ok()?;
        let raw_title = props.Title().map(|h| h.to_string()).unwrap_or_default();
        let mut title = raw_title.clone();
        let mut artist = props.Artist().map(|h| h.to_string()).unwrap_or_default();
        if title.trim().is_empty() {
            return None;
        }

        let app_lower = app.to_lowercase();
        let is_browser = app_lower.contains("edge")
            || app_lower.contains("chrome")
            || app_lower.contains("brave")
            || app_lower.contains("firefox")
            || app_lower.contains("opera");

        if is_browser || artist.is_empty() || artist.to_lowercase().contains("youtube") {
            if title.contains(" - ") {
                let parts: Vec<&str> = title.split(" - ").collect();
                if parts.len() >= 2 {
                    artist = parts[0].trim().to_string();
                    title = parts[1..].join(" - ").trim().to_string();
                }
            }
        }

        let playing = session
            .GetPlaybackInfo()
            .and_then(|i| i.PlaybackStatus())
            .map(|p| p == PlaybackStatus::Playing)
            .unwrap_or(false);

        let key = super::media_key(&app, &artist, &title);
        let art = if !skip_key.is_empty() && key == skip_key {
            Art::Skip
        } else {
            let thumb = read_thumbnail(&props);
            if is_browser {
                if let Some(bytes) = thumb {
                    // Tarayıcı oturumlarında video kareleri (16:9 geniş ekran) ile gerçek müzik albüm kapaklarını (kare ~1:1) ayırt et:
                    // Bir şarkı çalarken tarayıcının açık video sekmesinden sızdırdığı 16:9 ekran görüntüsünü (örn: Helluva Boss) reddet!
                    if let Some((w, h)) = get_image_dimensions(&bytes) {
                        let ratio = w as f32 / (h.max(1) as f32);
                        if ratio > 1.32 {
                            // 16:9 / geniş ekran video yakalaması -> Gerçek albüm kapağı değil, sızan video karesi.
                            Art::None
                        } else {
                            // Kare (1:1) gerçek albüm kapağı (Spotify Web, SoundCloud, Apple Music)
                            Art::Bytes(bytes)
                        }
                    } else {
                        Art::None
                    }
                } else {
                    Art::None
                }
            } else {
                match thumb {
                    Some(bytes) => Art::Bytes(bytes),
                    None => Art::None,
                }
            }
        };

        let (position_secs, duration_secs) = session
            .GetTimelineProperties()
            .ok()
            .and_then(|t| {
                let base_pos = t.Position().ok().map(|d| d.Duration).unwrap_or(0);
                let start_time = t.StartTime().ok().map(|d| d.Duration).unwrap_or(0);
                let end_time = t.EndTime().ok().map(|d| d.Duration).unwrap_or(0);
                let dur_100ns = end_time.saturating_sub(start_time);
                let dur_secs = (dur_100ns / 10_000_000).max(0) as u32;

                let mut pos_100ns = base_pos.saturating_sub(start_time);
                if playing {
                    if let Ok(last_updated) = t.LastUpdatedTime() {
                        if let Ok(now) = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
                            let unix_100ns = (now.as_secs() as i64) * 10_000_000 + (now.subsec_nanos() as i64) / 100;
                            let windows_100ns = unix_100ns + 116_444_736_000_000_000i64;
                            let lut = last_updated.UniversalTime;
                            if lut > 0 && windows_100ns >= lut {
                                let elapsed = windows_100ns - lut;
                                if elapsed < 86_400 * 10_000_000 {
                                    pos_100ns = pos_100ns.saturating_add(elapsed);
                                }
                            }
                        }
                    }
                }
                if dur_100ns > 0 {
                    pos_100ns = pos_100ns.min(dur_100ns);
                }
                let pos_secs = (pos_100ns / 10_000_000).max(0) as u32;
                Some((pos_secs, dur_secs))
            })
            .unwrap_or((0, 0));

        Some(RawMedia {
            title,
            artist,
            app,
            playing,
            art,
            position_secs,
            duration_secs,
        })
    }

    pub fn control(op: u8) {
        let done = (|| -> windows::core::Result<bool> {
            let manager = SessionManager::RequestAsync()?.get()?;
            let Some(session) = pick_session(&manager) else { return Ok(false) };
            let ok = match op {
                0 => session.TryTogglePlayPauseAsync()?.get()?,
                1 => session.TrySkipNextAsync()?.get()?,
                _ => session.TrySkipPreviousAsync()?.get()?,
            };
            Ok(ok)
        })()
        .unwrap_or(false);

        if !done {
            use windows::Win32::UI::Input::KeyboardAndMouse::{
                keybd_event, KEYBD_EVENT_FLAGS, KEYEVENTF_KEYUP, VK_MEDIA_NEXT_TRACK, VK_MEDIA_PLAY_PAUSE,
                VK_MEDIA_PREV_TRACK,
            };
            let vk = match op {
                0 => VK_MEDIA_PLAY_PAUSE.0,
                1 => VK_MEDIA_NEXT_TRACK.0,
                _ => VK_MEDIA_PREV_TRACK.0,
            };
            unsafe {
                keybd_event(vk as u8, 0, KEYBD_EVENT_FLAGS(0), 0);
                keybd_event(vk as u8, 0, KEYEVENTF_KEYUP, 0);
            }
        }
    }
}

#[cfg(target_os = "linux")]
mod sysmedia {
    use super::{Art, RawMedia};
    use mpris::{PlaybackStatus, PlayerFinder};

    fn percent_decode(s: &str) -> String {
        let b = s.as_bytes();
        let mut out = Vec::with_capacity(b.len());
        let mut i = 0;
        while i < b.len() {
            if b[i] == b'%' && i + 2 < b.len() {
                if let Ok(h) = std::str::from_utf8(&b[i + 1..i + 3]) {
                    if let Ok(v) = u8::from_str_radix(h, 16) {
                        out.push(v);
                        i += 3;
                        continue;
                    }
                }
            }
            out.push(b[i]);
            i += 1;
        }
        String::from_utf8_lossy(&out).to_string()
    }

    pub fn read(skip_key: &str) -> Option<RawMedia> {
        let finder = PlayerFinder::new().ok()?;
        let player = finder.find_active().ok().or_else(|| {
            finder.iter_players().ok()?.flatten().find(|p| {
                matches!(p.get_playback_status(), Ok(PlaybackStatus::Paused))
            })
        })?;

        let meta = player.get_metadata().ok()?;
        let mut title = meta.title().unwrap_or("").to_string();
        if title.is_empty() {
            return None;
        }
        let mut artist = meta.artists().map(|a| a.join(", ")).unwrap_or_default();
        let app = player.identity().to_string();
        let playing = matches!(player.get_playback_status(), Ok(PlaybackStatus::Playing));

        if artist.is_empty() && title.contains(" - ") {
            let parts: Vec<&str> = title.split(" - ").collect();
            if parts.len() >= 2 {
                artist = parts[0].trim().to_string();
                title = parts[1..].join(" - ").trim().to_string();
            }
        }

        let key = super::media_key(&app, &artist, &title);
        let art = if !skip_key.is_empty() && key == skip_key {
            Art::Skip
        } else {
            match meta.art_url() {
                Some(u) if u.starts_with("file://") => match std::fs::read(percent_decode(&u[7..])) {
                    Ok(bytes) => Art::Bytes(bytes),
                    Err(_) => Art::None,
                },
                Some(u) if u.starts_with("http://") || u.starts_with("https://") => Art::Url(u.to_string()),
                _ => Art::None,
            }
        };

        let position_secs = player.get_position().ok().map(|d| d.as_secs() as u32).unwrap_or(0);
        let duration_secs = meta.length().map(|d| d.as_secs() as u32).unwrap_or(0);

        Some(RawMedia {
            title,
            artist,
            app,
            playing,
            art,
            position_secs,
            duration_secs,
        })
    }

    pub fn control(op: u8) {
        if let Ok(finder) = PlayerFinder::new() {
            if let Ok(player) = finder.find_active() {
                let _ = match op {
                    0 => player.play_pause(),
                    1 => player.next(),
                    _ => player.previous(),
                };
            }
        }
    }
}

#[cfg(not(any(target_os = "windows", target_os = "linux")))]
mod sysmedia {
    use super::RawMedia;
    pub fn read(_skip_key: &str) -> Option<RawMedia> {
        None
    }
    pub fn control(_op: u8) {}
}

fn is_spotify_installed_or_running() -> bool {
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            if std::path::Path::new(&appdata).join("Spotify").join("Spotify.exe").is_file() {
                return true;
            }
        }
        if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
            if std::path::Path::new(&localappdata)
                .join("Microsoft")
                .join("WindowsApps")
                .join("Spotify.exe")
                .is_file()
            {
                return true;
            }
        }
        if let Ok(programfiles) = std::env::var("ProgramFiles") {
            if std::path::Path::new(&programfiles).join("Spotify").join("Spotify.exe").is_file() {
                return true;
            }
        }
        if let Ok(programfiles_x86) = std::env::var("ProgramFiles(x86)") {
            if std::path::Path::new(&programfiles_x86).join("Spotify").join("Spotify.exe").is_file() {
                return true;
            }
        }

        use windows::Win32::System::ProcessStatus::{EnumProcesses, GetModuleBaseNameW};
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_READ};
        let mut pids = [0u32; 1024];
        let mut bytes_returned = 0u32;
        if unsafe {
            EnumProcesses(
                pids.as_mut_ptr(),
                (pids.len() * std::mem::size_of::<u32>()) as u32,
                &mut bytes_returned,
            )
            .is_ok()
        } {
            let count = (bytes_returned as usize) / std::mem::size_of::<u32>();
            for &pid in &pids[..count] {
                if pid == 0 {
                    continue;
                }
                if let Ok(handle) =
                    unsafe { OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, false, pid) }
                {
                    let mut name_buf = [0u16; 128];
                    let len = unsafe { GetModuleBaseNameW(handle, None, &mut name_buf) };
                    let _ = unsafe { windows::Win32::Foundation::CloseHandle(handle) };
                    if len > 0 {
                        let name = String::from_utf16_lossy(&name_buf[..len as usize]).to_lowercase();
                        if name.contains("spotify") {
                            return true;
                        }
                    }
                }
            }
        }

        false
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("which")
            .arg("spotify")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        false
    }
}

pub fn check_spotify_cached() -> bool {
    static SPOTIFY_CACHE: Mutex<(Option<Instant>, bool)> = Mutex::new((None, false));
    if let Ok(mut lock) = SPOTIFY_CACHE.lock() {
        if let (Some(inst), val) = *lock {
            if inst.elapsed() < Duration::from_secs(5) {
                return val;
            }
        }
        let res = is_spotify_installed_or_running();
        *lock = (Some(Instant::now()), res);
        return res;
    }
    is_spotify_installed_or_running()
}

#[tauri::command]
pub async fn check_music() -> Result<MusicData, String> {
    let skip_key = {
        let c = match COVER_CACHE.lock() {
            Ok(guard) => guard,
            Err(poisoned) => poisoned.into_inner(),
        };
        if !c.cover.is_empty() {
            c.key.clone()
        } else {
            String::new()
        }
    };

    let raw = tokio::task::spawn_blocking(move || sysmedia::read(&skip_key))
        .await
        .ok()
        .flatten();

    let Some(raw) = raw else {
        let (vol, muted) = crate::audio::get_app_volume_info("");
        return Ok(MusicData {
            has_music: false,
            spotify_available: check_spotify_cached(),
            volume: Some(vol),
            muted: Some(muted),
            ..Default::default()
        });
    };

    let key = media_key(&raw.app, &raw.artist, &raw.title);
    let (cover, cover_changed) = match raw.art {
        Art::Skip => (String::new(), false),
        Art::Bytes(bytes) => {
            // SADECE SİSTEMDEN GELEN HAM VERİ (Raw Thumbnail Bytes)
            let data_url = format!("data:{};base64,{}", sniff_mime(&bytes), base64_encode(&bytes));
            if let Ok(mut c) = COVER_CACHE.lock() {
                c.key = key;
                c.cover = data_url.clone();
                c.from_system = true;
                c.at = Some(Instant::now());
            }
            (data_url, true)
        }
        Art::Url(u) => {
            // SADECE SİSTEMDEN GELEN HAM URL
            if let Ok(mut c) = COVER_CACHE.lock() {
                c.key = key;
                c.cover = u.clone();
                c.from_system = true;
                c.at = Some(Instant::now());
            }
            (u, true)
        }
        _ => {
            // Sistem ham veri vermediyse boş bırak (Asla harici arama veya uydurma kapak yok!)
            if let Ok(mut c) = COVER_CACHE.lock() {
                c.key = key;
                c.cover = String::new();
                c.from_system = false;
                c.at = Some(Instant::now());
            }
            (String::new(), true)
        }
    };

    let (vol, muted) = crate::audio::get_app_volume_info(&raw.app);

    Ok(MusicData {
        has_music: true,
        playing: raw.playing,
        title: raw.title,
        artist: raw.artist,
        app: raw.app,
        cover_url: cover,
        cover_changed,
        spotify_available: true,
        position_secs: raw.position_secs,
        duration_secs: raw.duration_secs,
        volume: Some(vol),
        muted: Some(muted),
    })
}

#[tauri::command]
pub fn open_spotify() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use windows::core::w;
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;

        let res = unsafe {
            ShellExecuteW(
                None,
                w!("open"),
                w!("spotify:"),
                None,
                None,
                SW_SHOWNORMAL,
            )
        };

        if (res.0 as isize) <= 32 {
            if let Ok(appdata) = std::env::var("APPDATA") {
                let exe = std::path::Path::new(&appdata).join("Spotify").join("Spotify.exe");
                if exe.is_file() {
                    let _ = std::process::Command::new(exe).spawn();
                    return Ok(());
                }
            }
            if let Ok(localappdata) = std::env::var("LOCALAPPDATA") {
                let exe = std::path::Path::new(&localappdata)
                    .join("Microsoft")
                    .join("WindowsApps")
                    .join("Spotify.exe");
                if exe.is_file() {
                    let _ = std::process::Command::new(exe).spawn();
                    return Ok(());
                }
            }
            return Err("Spotify açılamadı".into());
        }
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open")
            .arg("spotify:")
            .spawn()
            .or_else(|_| std::process::Command::new("spotify").spawn());
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Err("Desteklenmeyen platform".into())
    }
}

#[tauri::command]
pub fn open_web_music(url: Option<String>) -> Result<(), String> {
    let target = url.unwrap_or_else(|| "https://music.youtube.com".to_string());
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
        use windows::core::PCWSTR;

        let wide_url: Vec<u16> = target.encode_utf16().chain(std::iter::once(0)).collect();
        let wide_op: Vec<u16> = "open".encode_utf16().chain(std::iter::once(0)).collect();

        let res = unsafe {
            ShellExecuteW(
                None,
                PCWSTR(wide_op.as_ptr()),
                PCWSTR(wide_url.as_ptr()),
                None,
                None,
                SW_SHOWNORMAL,
            )
        };

        if (res.0 as isize) <= 32 {
            let _ = std::process::Command::new("cmd")
                .args(["/c", "start", &target])
                .spawn();
        }
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&target).spawn();
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Err("Desteklenmeyen platform".into())
    }
}

async fn control_media(op: u8) {
    let _ = tokio::task::spawn_blocking(move || sysmedia::control(op)).await;
}

#[tauri::command]
pub async fn media_play_pause() {
    control_media(0).await;
}

#[tauri::command]
pub async fn media_next() {
    control_media(1).await;
}

#[tauri::command]
pub async fn media_prev() {
    control_media(2).await;
}
