use crate::models::MusicData;
use crate::utils::{base64_encode, percent_encode, sanitize_music_query, sniff_mime};
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

fn scan_local_folder_for_cover(title: &str, artist: &str) -> Option<Vec<u8>> {
    let title_clean = title.trim();
    let artist_clean = artist.trim();
    if title_clean.len() < 3 && artist_clean.len() < 3 {
        return None;
    }

    let mut dirs_to_check = Vec::new();
    #[cfg(target_os = "windows")]
    {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            let p = std::path::PathBuf::from(userprofile);
            dirs_to_check.push(p.join("Music"));
            dirs_to_check.push(p.join("Downloads"));
        }
    }
    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let p = std::path::PathBuf::from(home);
            dirs_to_check.push(p.join("Music"));
            dirs_to_check.push(p.join("Downloads"));
        }
    }

    let title_lower = title_clean.to_lowercase();
    let artist_lower = artist_clean.to_lowercase();

    for dir in dirs_to_check {
        if !dir.is_dir() { continue; }
        if let Ok(entries) = std::fs::read_dir(&dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();

                if path.is_dir() {
                    let matched = (!artist_lower.is_empty() && name.contains(&artist_lower))
                        || (!title_lower.is_empty() && name.contains(&title_lower));
                    if matched {
                        if let Some(bytes) = find_cover_in_dir(&path) {
                            return Some(bytes);
                        }
                    }
                } else if !title_lower.is_empty() && name.contains(&title_lower) {
                    if let Some(parent) = path.parent() {
                        if let Some(bytes) = find_cover_in_dir(parent) {
                            return Some(bytes);
                        }
                    }
                }
            }
        }
    }
    None
}

fn find_cover_in_dir(dir: &std::path::Path) -> Option<Vec<u8>> {
    let cover_names = [
        "cover.jpg", "cover.png", "cover.jpeg", "cover.webp",
        "folder.jpg", "folder.png", "folder.jpeg",
        "albumart.jpg", "albumart.png",
        "front.jpg", "front.png", "front.jpeg",
    ];
    for name in cover_names {
        let p = dir.join(name);
        if p.is_file() {
            if let Ok(metadata) = p.metadata() {
                if metadata.len() > 0 && metadata.len() < 4_000_000 {
                    if let Ok(bytes) = std::fs::read(p) {
                        return Some(bytes);
                    }
                }
            }
        }
    }
    None
}

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

    fn pick_session(manager: &SessionManager) -> Option<Session> {
        let mut first = None;
        if let Ok(list) = manager.GetSessions() {
            for s in list {
                let playing = s
                    .GetPlaybackInfo()
                    .and_then(|i| i.PlaybackStatus())
                    .map(|p| p == PlaybackStatus::Playing)
                    .unwrap_or(false);
                if playing {
                    return Some(s);
                }
                if first.is_none() {
                    first = Some(s);
                }
            }
        }
        manager.GetCurrentSession().ok().or(first)
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
        let mut title = props.Title().map(|h| h.to_string()).unwrap_or_default();
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
            match read_thumbnail(&props) {
                Some(bytes) => Art::Bytes(bytes),
                None => Art::None,
            }
        };

        let (position_secs, duration_secs) = session
            .GetTimelineProperties()
            .ok()
            .and_then(|t| {
                let pos = t.Position().ok().map(|d| (d.Duration / 10_000_000).max(0) as u32).unwrap_or(0);
                let dur = t.EndTime().ok().map(|d| (d.Duration / 10_000_000).max(0) as u32).unwrap_or(0);
                Some((pos, dur))
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
        let c = COVER_CACHE.lock().map_err(|e| e.to_string())?;
        let recent = c.at.map(|t| t.elapsed() < Duration::from_secs(12)).unwrap_or(false);
        if (c.from_system && !c.cover.is_empty()) || recent {
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
        return Ok(MusicData {
            has_music: false,
            spotify_available: check_spotify_cached(),
            ..Default::default()
        });
    };

    let key = media_key(&raw.app, &raw.artist, &raw.title);
    let cover = match raw.art {
        Art::Skip => COVER_CACHE.lock().map(|c| c.cover.clone()).unwrap_or_default(),
        art => {
            let (cover, from_system) = match art {
                Art::Bytes(bytes) => (
                    format!("data:{};base64,{}", sniff_mime(&bytes), base64_encode(&bytes)),
                    true,
                ),
                Art::Url(u) => (u, true),
                _ => {
                    let title_clone = raw.title.clone();
                    let artist_clone = raw.artist.clone();
                    let local_bytes = tokio::task::spawn_blocking(move || {
                        scan_local_folder_for_cover(&title_clone, &artist_clone)
                    })
                    .await
                    .ok()
                    .flatten();

                    if let Some(bytes) = local_bytes {
                        (
                            format!("data:{};base64,{}", sniff_mime(&bytes), base64_encode(&bytes)),
                            true,
                        )
                    } else {
                        let query = if !raw.artist.is_empty() && !raw.title.is_empty() {
                            format!("{} {}", raw.artist, raw.title)
                        } else {
                            raw.title.clone()
                        };
                        let mut cover = fetch_album_art(&query).await;
                        if cover.is_empty() && !raw.artist.is_empty() {
                            cover = fetch_album_art(&raw.title).await;
                        }
                        (cover, false)
                    }
                }
            };
            if let Ok(mut c) = COVER_CACHE.lock() {
                c.key = key;
                c.cover = cover.clone();
                c.from_system = from_system;
                c.at = Some(Instant::now());
            }
            cover
        }
    };

    Ok(MusicData {
        has_music: true,
        playing: raw.playing,
        title: raw.title,
        artist: raw.artist,
        app: raw.app,
        cover_url: cover,
        spotify_available: true,
        position_secs: raw.position_secs,
        duration_secs: raw.duration_secs,
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

async fn fetch_album_art(query: &str) -> String {
    let clean = sanitize_music_query(query);
    if clean.is_empty() {
        return String::new();
    }

    let client = match reqwest::Client::builder().timeout(Duration::from_millis(3000)).build() {
        Ok(c) => c,
        Err(_) => return String::new(),
    };

    // 1. Öncelik: Deezer API
    let deezer_url = format!("https://api.deezer.com/search?q={}&limit=1", percent_encode(&clean));
    if let Ok(resp) = client.get(&deezer_url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(cover) = json
                .get("data")
                .and_then(|d| d.get(0))
                .and_then(|f| f.get("album"))
                .and_then(|a| {
                    a.get("cover_big")
                        .or_else(|| a.get("cover_medium"))
                        .or_else(|| a.get("cover"))
                })
                .and_then(|c| c.as_str())
            {
                if !cover.is_empty() {
                    return cover.to_string();
                }
            }
        }
    }

    // 2. Yedek: iTunes API
    let itunes_url = format!(
        "https://itunes.apple.com/search?term={}&entity=song&limit=1",
        percent_encode(&clean)
    );
    if let Ok(resp) = client.get(&itunes_url).send().await {
        if let Ok(json) = resp.json::<serde_json::Value>().await {
            if let Some(art) = json
                .get("results")
                .and_then(|r| r.get(0))
                .and_then(|f| f.get("artworkUrl100"))
                .and_then(|a| a.as_str())
            {
                if !art.is_empty() {
                    return art.replace("100x100bb", "300x300bb");
                }
            }
        }
    }

    String::new()
}
