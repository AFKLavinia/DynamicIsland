<div align="center">

# 🏝️ AFK Dynamic Island for Windows 11

**Windows 11 için ultra hafif, donanım ivmeli ve modern Apple Dynamic Island deneyimi.**

[![Rust](https://img.shields.io/badge/Rust-2024_Edition-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Windows 11](https://img.shields.io/badge/Windows%2011-Fluent%20Design-0078D4?style=for-the-badge&logo=windows11&logoColor=white)](https://microsoft.com/windows)
[![Open-Meteo](https://img.shields.io/badge/Weather-Open--Meteo%20API-FFA500?style=for-the-badge&logo=weather&logoColor=white)](https://open-meteo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br/>

</div>

---

## ✨ Öne Çıkan Özellikler

### 🎵 1. Medya ve Müzik Çalar Entegrasyonu
- **Windows Media Session (GSMTC):** Spotify, YouTube Music, Apple Music, VLC ve web tarayıcılarındaki (Chrome, Edge, Firefox, Brave) parçaları anında algılar.
- **Dinamik Ambient Glow:** Çalan albüm kapağının renk tonunu dinamik olarak adanın arka planına yansıtan lüks ortam aydınlatması.
- **Akıllı Duraklatma:** Müzik duraklatıldığında şarkı bilgisi ve albüm kapağı ekrandan kaybolmaz, duraklatılmış vaziyette kalır.
- **Donanımsal Ses Kaydırıcı:** Fare tekerleğiyle (wheel) ve arayüz üzerinden donanımsal ses kontrolü.
- **GPU Hızlandırmalı Spektrum:** CPU'ya yük bindirmeyen `transform: scaleY` tabanlı 60/120 FPS akıcı ses dalgası görselleştiricisi.

### 🌤️ 2. Nokta Atışı Meteoroloji İstasyonu
- **Türkiye Altyapı Veritabanı:** 81 İl, 973 İlçe ve 80.689 Köy/Mahalle içeren modüler veritabanı.
- **Akıllı Arama & Seçim:** Serbest hatalı metin girişi yerine, yazarak aranan ve yalnızca resmi kayıtlı yerlerin seçilebildiği adres sistemi.
- **Yüksek Hassasiyetli Geocoding:** Open-Meteo & OpenStreetMap ağları üzerinden milimetrik koordinat kilitlenmesi.
- **Canlı Telemetri & 3 Günlük Tahmin:** Sıcaklık, hissedilen, nem, rüzgar hızı ve 3 günlük hava durumu tahminleri.
- **Tek Tıkla Otomatik Konum (GPS):** Mobil baz istasyonu ve IP kaymalarından bağımsız, istendiğinde tek tıkla otomatik konuma dönüş.

### 🎮 3. Hibrit Oyun Modu Koruması (Anti-Interference)
- **DirectX, Vulkan & Pencereli Tam Ekran (Borderless):** CS2, Valorant, LoL, Cyberpunk gibi oyunların %80'inde kullanılan Borderless Fullscreen modunu otomatik tanır.
- **Fare Tıklama Yutmasını Önleme:** Oyuna girildiğinde ada 40x2 px gizli moda geçer; FPS ve rekabetçi oyunlarda fare yukarı çıktığında oyunu engellemez.

### 🖥️ 4. Windows 11 Fluent Mica Arayüzü
- **Mica Dark Theme:** Windows 11 tasarım kılavuzuna sadık kalan modern Denetim Merkezi.
- **Sıfır Kırpılma (Smooth Transitions):** Genişletilmiş moddan daralırken CSS animasyonu ile OS penceresi mükemmel senkronize çalışır.
- **Hover-Intent:** Tarayıcı sekmelerini kapatırken adanın yanlışlıkla açılmasını engelleyen 90ms mikro eşik kontrolü.
- **Serbest Ayarlar Penceresi:** Dinamik Ada masaüstünün en üstünde kalırken, Ayarlar penceresi arkaya alınabilir veya küçültülebilir.

---

## 📐 Ada Geometri Profilleri

| Mod | Boyut (Genişlik x Yükseklik) | Davranış |
| :--- | :--- | :--- |
| **Bar Modu** | `140 x 6 px` | Boşta dururken ekranın üst merkezinde zarif ince çizgi |
| **Kompakt Mod** | `440 x 44 px` | Fare üzerine geldiğinde beliren kompakt müzik veya hava durumu şeridi |
| **Genişletilmiş Mod** | `520 x 220 px` | Tıklandığında açılan tam teşekküllü medya ve istasyon kontrol merkezi |
| **Oyun Modu** | `40 x 2 px` | Tam ekran bir oyun algılandığında minimum boyuta geçip tıklamaları yutmaz |

---

## 🛠️ Mimari ve Proje Yapısı

Proje **Tek Sorumluluk İlkesi (SRP)** ve **DRY** prensiplerine tam uyumlu modüler bir mimariyle geliştirilmiştir:

```
DynamicIsland/
├── Baslat.bat                       # Tek tıkla uygulamayı başlatan script
├── README.md                        # Dokümantasyon
└── tauri-island/
    ├── src/                         # Modern Frontend Arayüzü
    │   ├── index.html               # Dinamik Ada pencere iskeleti
    │   ├── styles.css               # Ada stilleri ve GPU animasyonları
    │   ├── island.js                # Geometri, mod geçişleri & hover yönetimi
    │   ├── music.js                 # GSMTC medya oynatma & platform rozetleri
    │   ├── audio.js                 # Donanımsal ses kaydırıcı & tekerlek kontrolü
    │   ├── settings.html            # Windows 11 Ayarlar Arayüzü
    │   ├── settings.css             # Mica Dark Mode stilleri
    │   ├── settings-core.js         # IPC köprüsü, bildirimler & navigasyon
    │   ├── settings-weather.js      # Canlı telemetri & hava durumu servisleri
    │   ├── settings-location.js     # 81 İl, İlçe ve Köy akıllı arama/seçici
    │   └── locations/               # 81 İl Modüler JSON Veritabanı
    │       ├── provinces.json       # 81 il hafif indeks dosyası (~5 KB)
    │       ├── 01_adana.json        # Lazy-loaded ilçe ve köy verileri
    │       └── ... (81 il)
    │
    └── src-tauri/                   # Rust + Tauri Çekirdeği
        ├── Cargo.toml               # Bağımlılıklar ve derleme profilleri
        ├── tauri.conf.json          # Pencere şeffaflık & boyutlandırma ayarları
        └── src/
            ├── main.rs              # Uygulama giriş noktası
            ├── app.rs               # Setup, state ve invoke handler yönetimi
            ├── window.rs            # DPI duyarlı boyutlandırma & Borderless Oyun Modu
            ├── media.rs             # Windows WinRT GSMTC & albüm kapağı motoru
            ├── audio.rs             # Win32 donanımsal ses kontrol köprüsü
            ├── weather.rs           # Multi-tiered otonom hava durumu motoru
            ├── models.rs            # Veri modelleri ve durum yapıları
            └── utils.rs             # Yardımcı kodlama fonksiyonları
```

---

## 🚀 Başlarken & Kurulum

### Ön Koşullar
1. [Rust](https://www.rust-lang.org/tools/install) (1.75 veya üzeri)
2. [Node.js](https://nodejs.org/) (İsteğe bağlı, Tauri CLI için)
3. Windows 10 / 11 (64-bit)

### Doğrudan Çalıştırma
Projeyi klonladıktan sonra proje ana dizinindeki başlatıcıyı çalıştırabilirsiniz:
```cmd
Baslat.bat
```

### Kaynak Koddan Derleme
```bash
# Bağımlılıkları kontrol et ve derle
cd tauri-island
cargo build --release
```
Derlenen binary `tauri-island/src-tauri/target/release/tauri-island.exe` konumunda hazır olacaktır.

---

## ⌨️ Klavye ve Fare Kısayolları

- **Fareyle Üzerine Gelme (Hover):** Bar modundan Kompakt moda geçiş yapar.
- **Tıklama (Click):** Kompakt moddan Genişletilmiş moda geçer.
- **Fare Tekerleği (Scroll Wheel):** Ada üzerindeyken donanımsal ses seviyesini artırır / azaltır.
- **Sağ Üst Çıkış Butonu:** İsteğe bağlı teyit penceresiyle uygulamayı güvenli kapatır.
- **Dişli İkonu (Settings):** Windows 11 Denetim Merkezi ayarlar penceresini açar.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır. Katkıda bulunmaktan çekinmeyin!
