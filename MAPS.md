# Project Architecture & Directory Map (MAPS.md)

Bu dosya, Dynamic Island projesinin mimari haritasını, bileşenlerini ve dizin yapısını açıklar. Her yapısal değişiklikte güncellenir.

---

## 🗺️ Dizin Ağacı

```
DynamicIsland/
├── Baslat.bat                 # Tek tıkla bağımsız Rust ikili dosyasını başlatan script
├── AGENT.md                   # Ajan yönergeleri, uzmanlık rolleri ve operasyon kuralları
├── MAPS.md                    # Mimari harita ve modül rehberi (bu dosya)
├── LOG.md                     # Yapılan tüm işlerin, kararların ve değişikliklerin geçmişi
└── tauri-island/              # Rust + Tauri v2 ana proje çalışma alanı
    ├── src/                   # Modüler Webview Arayüzü (Frontend - SRP Mimarisi)
    │   ├── index.html         # Yalın, semantik HTML kapsülü (126 satır)
    │   ├── styles.css         # Apple squircle, iOS yay animasyonları ve tüm stiller (285 satır)
    │   ├── island.js          # Ada geometrisi, mod geçişleri ve olay dinleyicileri (170 satır)
    │   ├── weather.js         # Hava durumu vektörel SVG, WMO kodları ve tahmin kartları (135 satır)
    │   ├── audio.js           # iOS ses kaydırıcı, mute toggle ve fare tekerlek kontrolü (60 satır)
    │   ├── music.js           # GSMTC/MPRIS medya, Spotify, kapak, rozet ve zaman çizelgesi (240 satır)
    │   └── settings.html      # Bağımsız sabit Ayarlar penceresi arayüzü
    ├── package.json           # Node / Tauri CLI bağımlılıkları
    └── src-tauri/             # Saf Rust Çekirdek (Backend - SRP & DRY Mimarisi)
        ├── Cargo.toml         # Rust bağımlılıkları (windows GSMTC, mpris Linux, reqwest, serde, tokio)
        ├── tauri.conf.json    # Pencere konfigürasyonu (transparent, frameless, topmost)
        ├── capabilities/      # Tauri v2 güvenlik yetki bildirimleri
        └── src/
            ├── main.rs        # Konsolsuz minimal giriş noktası (15 satır)
            ├── models.rs      # Veri modelleri ve AppState (55 satır)
            ├── utils.rs       # DRY yardımcıları (base64, percent encode, mime, sanitize) (70 satır)
            ├── audio.rs       # Donanımsal ses kontrolü (35 satır)
            ├── window.rs      # Pencere geometrisi, ayarlar penceresi, oyun modu (55 satır)
            ├── weather.rs     # Geolocation, Open-Meteo REST API, wttr.in yedek motoru (360 satır)
            ├── media.rs       # WinRT GSMTC + Linux MPRIS medya ve kapak arayıcı (370 satır)
            ├── app.rs         # Tauri builder, setup, loop ve invoke kayıtları (80 satır)
            └── commands.rs    # Geriye dönük uyumlu modül re-export cephesi (15 satır)
```

---

## 🧩 Modül ve Servis Mimarisi

### 1. Backend (Rust - `tauri-island/src-tauri/src/`)
- **`models.rs`**: Tüm veri transfer nesneleri (`ForecastDay`, `WeatherData`, `MusicData`, `GameData`, `AppState`).
- **`utils.rs`**: `percent_encode`, `base64_encode`, `sniff_mime`, `sanitize_music_query` gibi genel yardımcılar.
- **`audio.rs`**: Windows `keybd_event` ve Linux `pactl` ile çalışan `change_volume(step)` komutu.
- **`window.rs`**: `open_settings_window`, dinamik DPI ofsetli `set_island_size`, `check_game_mode`.
- **`weather.rs`**: Windows Geolocation, IP telemetrisi, Open-Meteo REST API (20ms), wttr.in fallback ve otonom arka plan sorgulayıcı.
- **`media.rs`**: WinRT GSMTC (Windows) / MPRIS (Linux) oturum okuma, Spotify tespiti/başlatma (`open_spotify`), Web müzik/YouTube Music başlatma (`open_web_music`), yerel klasör taraması ve Deezer/iTunes kapak arayıcısı.
- **`app.rs`**: Tauri runtime builder, setup hook, başlangıç boyutlandırması ve invoke registry.

### 2. Frontend (`tauri-island/src/`)
- **`styles.css`**: Apple estetiği, spring animasyonları, ambient glow, visualizer, ses kaydırıcı, telemetri hapı ve hızlı başlatıcı düzenleri.
- **`island.js`**: Ada modu geçişleri (`bar`, `compact`, `expanded`, `game-hidden`), fare animasyonları, Tauri olay dinleyicileri.
- **`weather.js`**: SVG ikon haritası, WMO kod çözücü, 3 günlük tahmin, kompakt mod derece aralığı (`↑ max° · ↓ min°`) ve canlı telemetri (`💧 %58` / `💨 14km/s`).
- **`audio.js`**: Dahili iOS tarzı ses kaydırıcı ve ada üzerinde fare tekerleğiyle (`wheel`) donanımsal ses kontrolü.
- **`music.js`**: Parça metadata'sı, kaynak rozetleri (Spotify, YouTube, Tarayıcı vb.), 8 çubuklu animasyonlu visualizer, geçen/toplam süre (`01:24 / 03:45`), akıcı zaman çizelgesi, idle hızlı medya başlatıcı hub (Spotify & YT Music).
- **`index.html`**: Sadece semantik DOM iskeletini içeren temiz ve hafif HTML kapsülü.
