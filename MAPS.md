# Project Architecture & Directory Map (MAPS.md)

Bu dosya, Dynamic Island projesinin mimari haritasını, bileşenlerini ve dizin yapısını açıklar. Her yapısal değişiklikte güncellenir.

---

## 🗺️ Dizin Ağacı

```
DynamicIsland/
├── Baslat.bat                 # Tek tıkla bağımsız Rust ikili dosyasını başlatan script
├── settings.json              # Kullanıcı ayarları (şehir, koordinat, manuel oyun listesi)
├── AGENT.md                   # Ajan yönergeleri, uzmanlık rolleri ve operasyon kuralları
├── MAPS.md                    # Mimari harita ve modül rehberi (bu dosya)
├── LOG.md                     # Yapılan tüm işlerin, kararların ve değişikliklerin geçmişi
└── tauri-island/              # Rust + Tauri v2 ana proje çalışma alanı
    ├── index.html (dist/src)  # Webview arayüzü (Düz vektörel SVG, Albüm Kapağı, iOS Spring Animasyonu)
    ├── settings.html          # Bağımsız sabit Ayarlar penceresi arayüzü
    ├── package.json           # Node / Tauri CLI bağımlılıkları
    └── src-tauri/             # Saf Rust Çekirdek (Backend)
        ├── Cargo.toml         # Rust crate bağımlılıkları (windows, reqwest, serde, tokio)
        ├── tauri.conf.json    # Pencere konfigürasyonu (transparent, frameless, topmost)
        ├── capabilities/      # Tauri v2 güvenlik yetki bildirimleri
        │   └── default.json   # Ana pencere çekirdek izinleri
        └── src/
            ├── main.rs        # Konsolsuz giriş noktası (#![windows_subsystem = "windows"])
            └── commands.rs    # Dinamik pencere boyutlandırma, Müzik/Albüm Kapağı, Hava, Oyun Modu, Bağımsız Ayarlar Penceresi
```

---

## 🧩 Modül ve Servis Mimarisi

### 1. Backend (Rust - `tauri-island/src-tauri/src/commands.rs`)
- **`open_settings_window`**: Ana adadan bağımsız, sabit (`always_on_top: true`, `440x320 px`), ortalanmış ayrı bir OS penceresi başlatır. Ada kapansa bile ayarlar penceresi açık kalır.
- **`set_island_size(width, height)`**: Dinamik tıklama/hit-test yönetimi. Ada büyürken pencereyi anında genişletir, küçülürken animasyon sonrası donanım penceresini küçülterek arka planı serbest bırakır.
- **`check_music` & Albüm Kapağı Motoru (`fetch_album_art`)**: Win32 `EnumWindows` ile yakalanan parçanın sanatçı ve başlığını iTunes/Apple Music CDN API'si ile eşleştirerek yüksek çözünürlüklü kapak görselini (`cover_url`) çözer.
- **`get_weather` / `set_city`**: Hardcoded ham meteoroloji veri motoru (`wttr.in/NOAA format=j1`).
- **`check_game_mode`**: Direct3D / OS Shell çekirdek oyun modu tespiti.

### 2. Frontend (`tauri-island/src/index.html`)
- **Tasarım**: Modern düz (flat) minimalist SVG simgeler (Lucide/Feather tarzı).
- **Müzik Çalar**: 90x90 px albüm kapağı alanı, parça başlığı, sanatçı bilgisi ve modern kontrol düğmeleri.
- **Animasyon**: iOS Spring / physics-based `cubic-bezier(0.16, 1, 0.3, 1)` pürüzsüz yay animasyonu.
- **Geometri**:
  - `bar`: 140x6 px
  - `compact`: 360x42 px (Daha uzun dikdörtgen)
  - `expanded`: 500x195 px (Geniş dikdörtgen)
  - `game-hidden`: 40x2 px
