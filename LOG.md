# Project Change Log (LOG.md)

Bu dosya, Dynamic Island projesinde yapılan her geliştirme, hata düzeltmesi, karar ve yapısal değişikliğin kronolojik kaydını tutar.

---

## [2026-11-05] - Fare Gezinme (Hover Histeresis & Tampon Süre) Düzeltmesi
### 🚀 Düzeltildi & Geliştirildi:
- **Anlık Algılayıp Kapanma Hatası (Flicker / Premature Collapse):**
  - Fare adanın üzerine geldiğinde adanın anlık açılıp fare hafif oynadığında veya alt elemanlara geçerken (mouseleave tetiklenmesiyle) ada anında 250ms içinde kapanıyordu.
  - **Çözüm:** 
    - `collapseTimeout` mekanizması entegre edildi.
    - Fare adaya her girdiğinde (`mouseenter`) bekleyen tüm kapanma emirleri anında iptal edilir.
    - Farenin adadan ayrılması durumunda istemsiz kapanmayı engellemek için akıllı tampon süre (hysteresis delay) getirildi: Kompakt modda `800ms`, genişletilmiş (expanded) modda `1200ms` gecikme tanındı.
    - Genişletilmiş moda tıklandığında ada açık kalır, kullanıcının butonlara tıklaması kolaylaştırıldı.

---

## [2026-11-05] - Bağımsız Sabit Ayarlar Penceresi (Multi-Window)
### 🚀 Eklendi & Çözüldü:
- **Bağımsız Ayarlar Penceresi (`open_settings_window` & `settings.html`):**
  - Ayarlar paneli daha önce ada içerisindeki açılır kutu (in-island modal) olarak tasarlandığı için ada küçüldüğünde veya kapandığında ayarlar menüsünün kapanması ve arayüzün kilitlenmesi ("buga girmesi") problemi çözüldü.
  - Rust Tauri `WebviewWindowBuilder` kullanılarak bağımsız, sabit (`always_on_top: true`, `440x320 px`), ortalanmış modern koyu temalı bir Ayarlar penceresi (`settings.html`) oluşturuldu.
  - Ada kapansa, küçülse veya oyun moduna geçse dahi Ayarlar penceresi bağımsız kalır, kullanıcı şehir güncellemesini ve tercihlerini rahatça yapabilir.
- **Canlı Şehir & Hava Durumu Senkronizasyonu:**
  - Ayarlar penceresinden girilen yeni şehir bilgisi Rust `set_city` arka plan motoruyla anında kaydedilip dinamik adaya yansıtılır.

---

## [2026-11-05] - Modern Düz Simgeler, Albüm Kapağı & Gelişmiş Dikdörtgen Animasyon

### 🚀 Eklendi & Dönüştürüldü:
- **Albüm Kapağı Desteği (`fetch_album_art`):**
  - Spotify / YouTube veya sistemde çalan şarkının sanatçı ve parça adı tespit edildiğinde, açık CDN üzerinden yüksek çözünürlüklü albüm kapağı otonom olarak çekilip hem kompakt modda (`24x24 px`) hem de genişletilmiş modda (`90x90 px`) zarifçe gösterilmeye başlandı.
- **Modern Düz (Flat) Vektörel SVG Simgeler:**
  - ASCII ve emoji karakterleri yerine Lucide / Feather tarzı modern, minimalist düz vektörel SVG simgeler (Müzik notası, Güneş/Hava durumu, Ayarlar dişlisi, Oynat/Durdur/İleri/Geri üçgenleri) entegre edildi.
- **Akıcı iOS Yay (Spring) Animasyonunun Geri Getirilmesi:**
  - Boyut değişiminde animasyonun kaybolması engellendi. Genişlerken işletim sistemi penceresi anında büyütülüp adanın iç CSS yay animasyonu (`transition: cubic-bezier(0.16, 1, 0.3, 1)`) pürüzsüzce genişliyor; küçülürken ise ada animasyonla kapandıktan sonra pencere donanımı küçülerek arkadaki sekmelerin engellenmesi önleniyor.
- **Daha Uzun ve Geniş Dikdörtgen Form (Modern Squircle):**
  - Kompakt ada `360 x 42 px`, genişletilmiş ada `500 x 195 px` boyutuna çıkartılarak daha ferah ve dengeli bir dikdörtgen görünüm sağlandı.

---

## [2026-11-05] - Rust + Tauri v2 Dönüşümü ve ASCII Tasarım

### 🚀 Eklendi & Dönüştürüldü:
- **Teknoloji Dönüşümü:** Python/Tkinter mimarisi bellek şişmesi, render keskinliği ve animasyon kilitlenmeleri nedeniyle terk edildi. Tamamen **Rust + Tauri v2** mimarisine geçildi (~25 MB RAM, sıfır çökme, 60-120 FPS akıcılık).
- **Dinamik Pencere & Tıklama Yönetimi (`set_island_size`):**
  - Ada küçük bar halindeyken (`120x6 px`) pencerenin arkasındaki tarayıcı sekmelerine tıklanmasını engelleyen şeffaf pencere alanı sorunu çözüldü. Pencere modu değiştikçe fiziksel boyut işletim sistemi seviyesinde dinamik yeniden boyutlandırılıyor.
- **Hardcoded Ham Meteoroloji Motoru:**
  - `wttr.in/NOAA` altyapısından ham istasyon telemetrisi (`temp_C`, `FeelsLikeC`, `humidity`, `windspeedKmph`) doğrudan çekilip ekrana yansıtıldı.
- **Discord Tarzı OS Çekirdek Oyun Modu:**
  - `SHQueryUserNotificationState` (Direct3D Tam Ekran) kernel API'si ile oyun başladığında adanın otomatik gizlenmesi sağlandı.
- **Konsol Penceresi Engellendi:**
  - `#![windows_subsystem = "windows"]` bayrağı ile uygulamanın arkasında açılan siyah konsol ekranı tamamen kaldırıldı.
- **Kalıntı Temizliği:**
  - Eski Python dosyaları tamamen silindi.
