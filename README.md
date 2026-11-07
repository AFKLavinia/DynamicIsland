<div align="center">

# 🏝️ AFK Dynamic Island (Cross-Platform)

**Masaüstü platformları (Windows & Linux) için ultra hafif, donanım ivmeli, modern akıllı durum adası ve bildirim kapsülü.**

[![Rust](https://img.shields.io/badge/Rust-2024_Edition-DEA584?style=for-the-badge&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri v2](https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
[![Cross-Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-4A90E2?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/)
[![i18n](https://img.shields.io/badge/Language-TR%20%7C%20EN-blueviolet?style=for-the-badge)](https://github.com/)
[![Open-Meteo](https://img.shields.io/badge/Weather-Open--Meteo%20API-FFA500?style=for-the-badge&logo=weather&logoColor=white)](https://open-meteo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br/>

</div>

---

## ✨ Öne Çıkan Özellikler

### 🎵 1. Medya ve Müzik Çalar Entegrasyonu (Cross-Platform)
- **Çoklu Platform Medya İletişimi:** 
  - **Windows:** WinRT GSMTC (Global System Media Transport Controls) & WASAPI oturum bazlı uygulama sesi denetimi.
  - **Linux:** Standart MPRIS D-Bus arayüzü ve modern ses sunucuları (PipeWire / PulseAudio) entegrasyonu.
  - Yerel müzik uygulamaları, ses akış servisleri, masaüstü medya oynatıcıları ve modern web tarayıcılarıyla tam uyumlu otomatik senkronizasyon.
- **Dinamik Ambient Glow:** Çalan albüm kapağının renk tonunu adanın arka planına dinamik yansıtan donanım ivmeli ortam aydınlatması.
- **Akıllı Ham Veri & Duraklatma:** Medya duraklatıldığında parça bilgisi ve kapak görseli ekrandan silinmez; yalnızca gerçek ham albüm kapağı verisi alınır (video küçük resimleri ve yapay görseller otomatik filtrelenir).
- **Uygulama Başına Donanımsal Ses Denetimi:** Sistem genel ana sesini kısmak yerine, yalnızca çalan uygulamanın ses seviyesini ada üzerinden veya fare tekerleğiyle (scroll) hassas ayarlama imkanı.
- **GPU Hızlandırmalı Spektrum:** CPU'ya yük bindirmeyen `transform: scaleY` tabanlı 60/120 FPS akıcı ses dalgası görselleştiricisi.

### 🌤️ 2. Nokta Atışı Meteoroloji İstasyonu
- **Kapsamlı Konum Altyapısı:** 81 İl, 973 İlçe ve 80.689 Köy/Mahalle içeren modüler yerel veritabanı.
- **Akıllı Arama & Seçim:** Serbest hatalı metin girişi yerine, yazarak aranan ve yalnızca resmi kayıtlı yerlerin seçilebildiği adres sistemi.
- **Yüksek Hassasiyetli Geocoding:** Açık kaynaklı harita ve meteoroloji ağları üzerinden milimetrik koordinat kilitlenmesi.
- **Canlı Telemetri & 3 Günlük Tahmin:** Sıcaklık, hissedilen sıcaklık, nem oranı, rüzgar hızı, UV indeksi ve 3 günlük hava durumu tahminleri.
- **Tek Tıkla Otomatik Konum:** Mobil baz istasyonu ve IP kaymalarından bağımsız, istendiğinde tek tıkla otomatik konuma dönüş.

### 🔔 3. Entegre Bildirim Merkezi
- **Ada İçi Bildirim Sekmesi:** Genişletilmiş adaya entegre 3. sekme ile gelen sistem bildirimlerini temiz ve dikkat dağıtmayan bir arayüzle görüntüleme.
- **Tek Tıkla Temizleme:** Okunmuş ve bekleyen bildirimleri ada içerisinden anında sıfırlama.

### 🌐 4. Çoklu Dil Desteği (i18n)
- **Türkçe & İngilizce:** Ada kontrolleri, ayarlar, hava durumu durumları ve bildirimler için tam çift dilli yerelleştirme altyapısı.
- **Anında Değişim:** Sayfa yenilenmesine gerek kalmadan ayarlar menüsünden anında dil değiştirme ve durum kalıcılığı (`localStorage`).

### 🎮 5. Hibrit Oyun Modu Koruması (Anti-Interference)
- **Tam Ekran & Pencereli Tam Ekran Tespiti:** Grafik yoğun tam ekran veya çerçevesiz tam ekran (borderless) pencereleri otomatik algılama.
- **Fare Tıklama Yutmasını Önleme:** Tam ekran uygulamalara veya oyunlara girildiğinde ada 40x2 px gizli moda geçer; fare ekranın üst kısmına çıktığında tıklamaları engellemez.

### 🖥️ 6. Modern Masaüstü Denetim Merkezi
- **Karanlık ve Saydam Tasarım Stili:** Platforma duyarlı, modern, karanlık temalı Denetim Merkezi.
- **Dinamik Platform Tespiti:** Çalıştığı işletim sistemini (Windows / Linux / macOS) arka planda otomatik tespit ederek Hakkında bölümünde dinamik gösterim.
- **Sıfır Titreme (Hardware-Masked Transitions):** Sabit geometrili katmanlar ve donanım ivmeli maskeleme sayesinde boyut değişimlerinde sıfır reflow ve akıcı geçişler.
- **Hover-Intent:** Tarayıcı sekmelerini veya pencere başlıklarını kapatırken adanın yanlışlıkla açılmasını engelleyen 90ms mikro eşik kontrolü.

---

## 📐 Ada Geometri Profilleri

| Mod | Boyut (Genişlik x Yükseklik) | Davranış |
| :--- | :--- | :--- |
| **Bar Modu** | `140 x 6 px` | Boşta dururken ekranın üst merkezinde zarif ince çizgi |
| **Kompakt Mod** | `440 x 44 px` | Fare üzerine geldiğinde beliren kompakt müzik veya hava durumu şeridi |
| **Genişletilmiş Mod** | `520 x 220 px` | Tıklandığında açılan tam teşekküllü medya, hava durumu ve bildirim kontrol merkezi |
| **Oyun Modu** | `40 x 2 px` | Tam ekran bir uygulama veya oyun algılandığında minimum boyuta geçip tıklamaları yutmaz |

---

## 🛠️ Mimari ve Proje Yapısı

Proje **Tek Sorumluluk İlkesi (SRP)** ve **DRY** prensiplerine tam uyumlu modüler bir mimariyle geliştirilmiştir:

```
DynamicIsland/
├── Baslat.bat                       # Tek tıkla uygulamayı başlatan script (Windows)
├── README.md                        # Dokümantasyon
└── tauri-island/
    ├── src/                         # Modern Frontend Arayüzü
    │   ├── index.html               # Dinamik Ada pencere iskeleti
    │   ├── styles.css               # Ada stilleri ve GPU animasyonları
    │   ├── island.js                # Geometri, mod geçişleri & hover yönetimi
    │   ├── music.js                 # Medya oynatma & platform rozetleri
    │   ├── audio.js                 # Donanımsal ses kaydırıcı & tekerlek kontrolü
    │   ├── notifications.js         # Ada içi bildirim merkezi motoru
    │   ├── i18n.js                  # Türkçe & İngilizce çoklu dil sözlüğü ve motoru
    │   ├── settings.html            # Masaüstü Denetim Merkezi & Ayarlar
    │   ├── settings.css             # Karanlık Mod Denetim Merkezi stilleri
    │   ├── settings-core.js         # IPC köprüsü, platform telemetrisi & navigasyon
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
            ├── window.rs            # DPI duyarlı boyutlandırma, Oyun Modu & Platform tespiti
            ├── media.rs             # Medya motoru & ham albüm kapağı doğrulayıcısı
            ├── audio.rs             # Oturum bazlı (per-app) donanımsal ses kontrol köprüsü
            ├── weather.rs           # Multi-tiered otonom hava durumu motoru
            ├── models.rs            # Veri modelleri ve durum yapıları
            └── utils.rs             # Yardımcı kodlama fonksiyonları
```

---

## 🚀 Başlarken & Kurulum

### Ön Koşullar
1. [Rust](https://www.rust-lang.org/tools/install) (1.75 veya üzeri)
2. Desteklenen İşletim Sistemleri:
   - **Windows:** Windows 10 / 11 (64-bit)
   - **Linux:** Modern Linux dağıtımları (Ubuntu 22.04+, Fedora, Arch Linux vb. WebKit2GTK ve Tauri v2 paketleri kurulu)

### Doğrudan Çalıştırma (Windows)
```cmd
Baslat.bat
```

### Kaynak Koddan Derleme (Tüm Platformlar)
```bash
# Bağımlılıkları kontrol et ve derle
cd tauri-island
cargo build --release
```
- **Windows Çıktısı:** `tauri-island/src-tauri/target/release/tauri-island.exe`
- **Linux Çıktısı:** `tauri-island/src-tauri/target/release/tauri-island`

---

## ⌨️ Klavye ve Fare Kısayolları

- **Fareyle Üzerine Gelme (Hover):** Bar modundan Kompakt moda geçiş yapar.
- **Tıklama (Click):** Kompakt moddan Genişletilmiş moda geçer (Müzik, Hava Durumu, Bildirimler).
- **Genişletilmiş Modda Boşluğa Tıklama:** Geniş moddayken boş bir alana tıklandığında adayı kompakt moda daraltır.
- **Klavyeden Escape (Esc):** Açık olan adayı anında kompakt veya bar moduna geri kapatır.
- **Fare Tekerleği (Scroll Wheel):** Ada üzerindeyken çalan uygulamanın ses seviyesini artırır / azaltır.
- **Sağ Üst Çıkış Butonu:** İsteğe bağlı teyit penceresiyle uygulamayı güvenli kapatır.
- **Dişli İkonu (Settings):** Denetim Merkezi ayarlar penceresini açar.

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır. Katkıda bulunmaktan çekinmeyin!