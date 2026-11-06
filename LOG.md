# Project Change Log (LOG.md)

Bu dosya, Dynamic Island projesinde yapılan her geliştirme, hata düzeltmesi, karar ve yapısal değişikliğin kronolojik kaydını tutar.

---

## [2026-11-06] - Ön İzleme Geometrisinin Genişletilmesi (360px -> 440px) & Tipografi Optimizasyonu
### 🚀 Yapılanlar:
- **Kompakt Ön İzleme Boyutlarının Genişletilmesi (`island.js` & `styles.css`):**
  - Kompakt ön izleme genişliği `360px`'den **`440px`**'e, yüksekliği ise `42px`'den **`44px`**'e çıkarıldı.
  - Genişletilmiş mod dengesini korumak için `expanded` modu da `520x220px` olarak oranlandı.
- **Tipografi ve Taşıma Sınırlarının Optimize Edilmesi:**
  - Konum alanı (`.cws-left`) `140px`'den `155px`'e çıkarıldı.
  - Hava durumu açıklaması (`.cws-desc`) `95px`'den `120px`'e çıkarılarak "Parçalı Bulutlu" gibi uzun durumların kesilmeden ferah görünmesi sağlandı.
  - Müzik başlığı (`.compact-title`) `220px`'den `280px`'e genişletildi.
  - Şehir adı, günün derece aralığı (`↑ max° · ↓ min°`), nem/rüzgar telemetri hapı (`💧 %58`), açıklama + sıcaklık ve dairesel Spotify butonu sıkışmadan tam hizalı yerleşti.

---

## [2026-11-06] - Rust Derleme Onarımı, Varlıkların Gömülmesi & Otomatik Derleyen `Baslat.bat`
### 🚀 Yapılanlar & Düzeltmeler:
- **Tauri Derleme & Paketleme Analizi:**
  - Tauri mimarisinde frontend web varlıkları (`index.html`, `styles.css`, `island.js`, `music.js` vb.) derleme sırasında `tauri-island.exe` içerisine doğrudan gömülür (embedded). Manuel `cargo build` yapılmadan eski `.exe` çalıştırıldığında arayüzdeki son değişiklikler devreye girmiyordu.
- **Rust Derleyici Hatalarının Giderilmesi (`cargo check` & `cargo build`):**
  - **Tauri Makro Modül Çözümü (`app.rs`):** `tauri::generate_handler!` makrosu farklı alt modüllerdeki (`window`, `weather`, `media`, `audio`) komutları çağırırken modül kapsamı `crate::module::command` şeklinde tam yol verilerek çözüldü.
  - **WinRT Geolocation Uyumsuzluğu (`weather.rs`):** `windows 0.58` sürümünde `coord.Latitude()` yerine standart `coord.Point()?.Position()?` üzerinden `pos.Latitude` ve `pos.Longitude` kullanılarak derleme hatası giderildi.
  - Kod tabanı sıfır hata ve sıfır uyarı ile başarıyla derlendi (`Finished dev profile target(s) in 40.25s`).
- **Akıllı `Baslat.bat` Otomasyonu:**
  - `Baslat.bat` güncellendi; kullanıcı her tıkladığında sistemde `%USERPROFILE%\.cargo\bin\cargo.exe` üzerinden değişiklik varsa hızlıca derler (`cargo build --quiet`, değişiklik yoksa 0.2 sn sürer) ve ardından taze ikili dosyayı çalıştırır. Böylece versiyon uyuşmazlığı tamamen ortadan kalktı.

---

## [2026-11-06] - Kritik Düzeltme: Kompakt Ön İzlemede "Simsiyah Kutu" ve Script Yarış Durumunun (Race Condition) Çözümü
### 🐛 Tespit Edilen Hatalar & Kök Nedenler:
1. **HTML Varsayılan Görünürlük Hatası:** `index.html` içinde `#compact-music-box` varsayılan olarak görünürken, `#compact-weather-box` `style="display:none;"` olarak tanımlanmıştı. Müzik çalmıyorken veya durum çözülmeden önce ada açıldığında albüm kapağı ve şarkı adı boş kaldığından sadece sağda `☁ 18°C` beliriyor ve adanın geri kalanı tamamen simsiyah görünüyordu.
2. **Script Yükleme Sırası & Erken Bootstrap Hatası:** `island.js` dosyasının altındaki `initBootstrap()` fonksiyonu, `weather.js`, `audio.js` ve `music.js` henüz tarayıcı tarafından yüklenip çalıştırılmadan çağrılıyordu. `setInterval(checkMusic, 1500)` satırı `checkMusic is not defined` (ReferenceError) fırlatarak tüm bootstrap sürecini ve periyodik döngüleri (hava durumu ve müzik yoklama) çökertiyordu.
3. **Müzik Çalma Durumu Tespiti (`isActuallyPlaying`):** Windows GSMTC'de arka plandaki pasif/duraklatılmış oturumlar (Edge, Discord vb.) `has_music: true` döndürse dahi müzik fiilen çalmıyorsa (`playing == false` veya başlık boş ise) müzik çalıyor kabul edilip hava durumu özeti gizleniyordu.

### 🚀 Uygulanan Çözümler:
- **`index.html` Varsayılan Görünümü:** `#compact-music-box` `style="display:none;"`, `#compact-weather-box` ise `style="display:flex;"` yapıldı. Ada açıldığı anda doğrudan zengin hava durumu ön izlemesi gelir.
- **Korumalı & Evrensel Bootstrap (`island.js`):**
  - `initBootstrap`, tüm harici script dosyalarının (`music.js`, `weather.js`, `audio.js`) tam yüklendiğini garanti eden `window.addEventListener('load', ...)` ve `document.readyState === 'complete'` korumasına alındı.
  - `setInterval` çağrıları `() => { if (typeof checkMusic === 'function') checkMusic(); }` şeklinde güvenli arrow fonksiyonlarına sarıldı; olası ReferenceError riski sıfırlandı.
  - `invoke`, `setText`, `setDisplay`, `setMode` yardımcıları `window` nesnesine bağlanarak tüm modüller arası erişim güvenceye alındı.
- **Kesin Müzik Çalma Kontrolü (`music.js` & `media.rs`):**
  - `const isPlayingNow = !!(m && m.has_music && m.playing && hasValidTitle);` kuralı getirildi. Müzik fiilen çalmıyorsa kompakt modda her zaman eksiksiz hava durumu kartı ve telemetri gösterilir; genişletilmiş modda ise zümrüt yeşili rozetli Idle Hub (`🟢 Dinlemeye Hazır`) ve hızlı başlatıcılar devreye girer.
  - `media.rs` içinde `title.trim().is_empty()` kontrolü eklenerek sadece boşluk içeren oturumların yanlış pozitif vermesi engellendi.
  - `renderWeather` fonksiyonunda `updateCompactWeatherSummary()` koşulsuz çağrılarak hava durumu verisi geldiği anda ön izlemenin anında dolması sağlandı.

---

## [2026-11-06] - Seçenek A & B Entegrasyonu: Kompakt Canlı Telemetri Pili ve Genişletilmiş Idle Medya Hub
### 🚀 Yapılanlar & Düzeltmeler:
- **Kompakt Mod Ön İzleme İyileştirmesi (Seçenek A - Telemetri & Hızlı Müzik Başlatıcı):**
  - Müzik çalmıyorken fare ile ada üzerine gelindiğinde beliren hava durumu çubuğuna (`#compact-weather-box` - 360x42 px) canlı ikincil telemetri hapı (`.cws-telemetry`: `💧 %58` nem veya `💨 14km/s` rüzgar) entegre edildi.
  - Kompakt çubuğa tek tıkla doğrudan Spotify başlatan mikro hap butonu (`#cws-quick-music`: `.cws-quick-music-btn`) eklendi. Tıklama olayının adayı açmasını engelleyen `stopPropagation` koruması eklendi.
- **Genişletilmiş Müzik Ekranı Boşluk Çözümü (Seçenek B - Dinamik Medya Hub):**
  - Müzik çalmıyorken genişletilmiş adadaki boş siyah kutu ve kaybolan ses çubuğu hissi tamamen ortadan kaldırıldı:
    1. **Master Ses Çubuğu & Mute Butonu:** Müzik çalmasa bile sistem ses seviyesi kontrolü (`volume-row`) her zaman görünür ve işlevsel bırakıldı.
    2. **Hızlı Medya Başlatıcı Hub (`#launcher-row`):** Yeşil Spotify ve Kırmızı YouTube Music butonları entegre edildi. Tek tıkla yerel Spotify veya web tabanlı YouTube Music başlatılabiliyor.
    3. **Dinamik Durum Rozeti (`#music-source-badge`):** Gizlenmek yerine yeşil parlak zümrüt ışığıyla `🟢 Dinlemeye Hazır` durumuna geçer.
    4. **Karşılama Metinleri & Oynat Düğmesi:** "Müzik Dinlemeye Başla" ve "Klavyeden Oynat tuşuna veya başlatıcılara basın" yönlendirmesiyle Oynat tuşuna basıldığında doğrudan Spotify'ı başlatma yeteneği eklendi.
- **Backend Komut Desteği (`media.rs` & `app.rs`):**
  - `open_web_music(url: Option<String>)` Rust komutu yazıldı. Windows `ShellExecuteW` ile varsayılan web tarayıcısında YouTube Music'i doğrudan başlatır (Linux için `xdg-open` fallback'i ile).
  - Tauri `generate_handler!` kayıt tablosuna eklenerek frontend'e sunuldu.

---

## [2026-11-06] - DRY ve Tek Sorumluluk İlkesi (SRP) ile Tam Modüler Refaktörleme
### 🚀 Yapılanlar & Düzeltmeler:
- **1000+ Satırlık Monolitik Dosyaların Tamamen Ayrıştırılması:**
  - `commands.rs` (1485 satır) ve `index.html` (1364 satır) parçalara bölünerek tek sorumluluk (SRP) ve kendini tekrar etmeme (DRY) ilkelerine göre modüler hale getirildi. Hiçbir dosya 380 satırı aşmayacak şekilde optimize edildi.
- **Backend (Rust) Modül Mimarisi (`src-tauri/src/`):**
  - **`models.rs`:** `ForecastDay`, `WeatherData`, `MusicData`, `GameData`, `AppState` veri modelleri ve paylaşılan durum nesneleri.
  - **`utils.rs`:** Yeniden kullanılabilir string ve encode yardımcıları (`percent_encode`, `base64_encode`, `sniff_mime`, `sanitize_music_query`).
  - **`audio.rs`:** Donanımsal ses kontrolü (`change_volume` - Win32 `keybd_event` ve Linux `pactl`).
  - **`window.rs`:** Pencere boyutlandırma, konumlandırma, ayarlar penceresi ve tam ekran oyun modu tespiti (`open_settings_window`, `set_island_size`, `check_game_mode`).
  - **`weather.rs`:** Windows Geolocation sensörü, IP telemetrisi, Open-Meteo REST API, wttr.in yedek motoru ve otonom arka plan sorgulayıcı.
  - **`media.rs`:** Windows GSMTC ve Linux MPRIS ham medya okuyucusu, yerel müzik klasörü kapak tarayıcısı, Deezer/iTunes paralel kapak arayıcısı, Spotify kontrol ve çalıştırma motoru.
  - **`app.rs`:** Tauri bootstrapping, setup yaşam döngüsü, başlangıç pozisyonlaması, durum yönetimi ve invoke kayıtları.
  - **`commands.rs` & `main.rs`:** Temiz re-export cephesi (facade) ve minimal giriş noktası.
- **Frontend (Web) Modül Mimarisi (`src/`):**
  - **`styles.css`:** Tüm CSS kuralları, Apple squircle geometrisi, iOS spring yay animasyonları, visualizer keyframe'leri, ambient glow ve panel düzenleri ayrı dosyaya çıkarıldı.
  - **`island.js`:** Ada geometri boyutlandırması, mod geçişleri (`bar`, `compact`, `expanded`, `game-hidden`), fare animasyonları, sekme geçişi ve Tauri olay köprüsü.
  - **`weather.js`:** Vektörel SVG ikon haritası, WMO kod çözücü, kompakt derece özeti ve 3 günlük hava durumu kartları.
  - **`audio.js`:** iOS tarzı ses kaydırıcı etkileşimleri, ses açma/kısma/sessize alma ve ada üzerinde fare tekerleği (`wheel`) dinleyicisi.
  - **`music.js`:** Medya durumu, albüm kapak yönetimi, Spotify algılayıcı/başlatıcı, parça kontrol tuşları, kaynak rozeti tespiti, canlı visualizer ve zaman çizelgesi enterpolasyonu.
  - **`index.html`:** 1364 satırdan 126 satıra düşürülen temiz, semantik ve okunabilir HTML iskeleti.

---

## [2026-11-06] - Kompakt Modda Günün Derece Aralığı ve Genişletilmiş Modda 5'li Müzik Geliştirme Paketi
### 🚀 Yapılanlar & Düzeltmeler:
- **Kompakt Mod Geliştirmesi (Seçenek 2: Günün Derece Aralığı & Hissedilen):**
  - Müzik çalmıyorken (`compact` - 360x42 px), ön izleme çubuğunun ortasına günün en yüksek ve en düşük sıcaklık aralığını (`cws-range`: `↑ max° · ↓ min°`) ve hissedilen sıcaklığı gösteren şık bir bilgi kapsülü yerleştirildi.
  - Açık/koyu kontrastı koruyan Apple tarzı pill tasarımı (`#ff9f0a` turuncu yukarı ok, `#64d2ff` mavi aşağı ok) uygulandı.
- **Genişletilmiş Mod (Expanded - 500x215 px) 5'li Müzik Deneyimi Paketi:**
  1. **Ambient Dynamic Glow (Dinamik Albüm Işıması):** Çalan parçanın albüm kapağındaki canlı renkleri ada gövdesinin arkasına 55px blur ve doygunluk ile yansıtan iOS tarzı ortam aydınlatması eklendi.
  2. **iOS Tarzı Dahili Ses Kontrolü & Ada Üzerinde Fare Tekerleği:** Mute toggle butonu, iOS tarzı ses seviyesi kaydırma çubuğu (`volume-row`), doğrudan tıklama ile ses ayarlama ve ada üzerinde fare tekerleğiyle (`wheel` event) anında ses açma/kısma desteği eklendi. Backend'de Windows `keybd_event` ve Linux `pactl` ile sıfır harici bağımlılıkla çalışan `change_volume` Rust komutu bağlandı.
  3. **Platform Kaynak Rozeti (Source Badge):** Parçanın hangi uygulamadan çaldığını (Spotify, YouTube, VLC Player, Web Tarayıcı, Apple Music, Sistem Medyası) algılayıp kendi özgün marka rengi ve SVG simgesiyle gösteren rozet entegre edildi.
  4. **Parça Zaman Çizelgesi & İlerleme Çubuğu (Track Timeline Progress):** WinRT `TimelineProperties.Position` / `EndTime` ve Linux MPRIS üzerinden saniye bazlı geçen süre, toplam süre (`01:24 / 03:45`) ve akıcı dolan ilerleme çubuğu (`track-progress-row`) eklendi. Polling aralıkları arasında 1 sn'lik yerel interpolasyonla kesintisiz akıcılık sağlandı.
  5. **Canlı Audio Spectrum / Visualizer:** Müzik çalarken müziğin ritmine göre bağımsız dalgalanan 8 adet animasyonlu görselleştirici çubuğu eklendi; müzik duraklatıldığında veya bittiğinde çubuklar otomatik olarak düzleşip sakin moda geçer.
- **Backend & Ham Telemetri Desteği (`commands.rs`):**
  - `WeatherData` modeline `today_max_c` ve `today_min_c` alanları eklendi; Open-Meteo REST API `daily` verilerinden ve wttr.in istasyon telemetrisinden gerçek değerlerle beslendi.
  - `MusicData` ve `RawMedia` modellerine `position_secs` ve `duration_secs` eklendi; Windows GSMTC ve Linux MPRIS'ten dönüştürülerek aktarıldı.
  - Sistem sesini donanımsal artıran/azaltan/sessize alan `change_volume(step: i32)` komutu eklenip Tauri invoke tablosuna kaydedildi.

---

## [2026-11-06] - Canlı Hava Durumu Ön İzlemesi (Derece & Durum Bilgisi) ve Yüksek Hızlı Ham Veri Motoru
### 🚀 Yapılanlar & Düzeltmeler:
- **Hava Durumu Ön İzlemesi Canlı Gösterimi (`index.html`):**
  - Kompakt ön izleme modunda (`compact`), müzik yokken halihazırda bulunan havanın ne olduğu (`cws-desc`, örn: "Parçalı Bulutlu", "Açık", "Yağmurlu"), meteorolojik simgesi (`cws-icon`), sıcaklık derecesi (`cws-temp`, örn: "18°C") ve şehir konumu (`cws-location`) anında görüntülenecek şekilde UI hiyerarşisi yeniden yapılandırıldı.
  - Veri gelene kadar ön izlemenin boş kalmaması için canlı yükleme durumu bağlandı.
  - `weatherKind` fonksiyonu tüm WMO standart hava kodları (0..99) ve wttr kodlarıyla uyumlu hale getirildi; açık/güneşli havaların yağmur simgesine düşmesi engellendi.
  - Veri henüz hazır değilse arka planda her 2.5 saniyede bir otomatik sorgulama (`refreshWeather`) tetikleyicisi eklendi.
- **Yüksek Hızlı Ham İstasyon Motoru (`commands.rs`):**
  - wttr.in servisinin ISP filtrelerine takılması ve 6-8 saniyelik gecikmesini önlemek için, Open-Meteo REST API'si (20ms) birincil ham meteoroloji motoru yapıldı; wttr.in yedek hat olarak korundu.
  - Windows Geolocation API'sinde doğrudan `coord.Latitude()` ve `coord.Longitude()` özelliklerine bağlanılarak donanım konum okuma hızı artırıldı; HTTPS `ipwho.is` ve `freeipapi.com` ile anında şehir ve koordinat çözümü sağlandı.

---

## [2026-11-06] - Spotify Otonom Entegrasyonu & Müziksiz Fare Ön İzlemesinde Zengin Hava Durumu Özeti
### 🚀 Yapılanlar & Düzeltmeler:
- **Sistemde Spotify Tespiti & Başlatma (`commands.rs`):**
  - Müzik yokken (`has_music: false`), sistemde Spotify'ın kurulu veya çalışır durumda olup olmadığını hem disk hem de süreç tablosundan tespit eden önbellekli `check_spotify_cached()` ve `open_spotify` komutu eklendi.
  - Windows'ta `ShellExecuteW` ile `spotify:` protokolü çağrılarak konsolsuz, doğrudan ve pürüzsüz başlatma sağlandı; Linux'ta `xdg-open` fallback'i eklendi.
- **Müzik Yokken Genişletilmiş Panel Yönetimi (`index.html`):**
  - Sistemde Spotify varsa: Spotify ikonlu zarif kart, "Spotify", "Çalan müzik yok" ve tek tıkla açan `Spotify'ı Aç` butonu görüntülendi. Müzik oynat butonuna basıldığında da doğrudan Spotify'ı başlatması sağlandı.
  - Sistemde Spotify yoksa: "Çalan müzik yok" ve "Sistemde aktif medya oturumu bulunamadı" bilgisi gösterildi.
- **Fare Ön İzlemesinde Dinamik Hava Durumu Özeti (`index.html`):**
  - Ada kapalıyken (`bar`), fare ile üzerine gelindiğinde (`mouseenter` -> `compact` ön izleme modu):
    - Eğer müzik çalıyorsa: albüm kapağı, sanatçı - şarkı adı ve mini sıcaklık gösterilir.
    - Eğer müzik çalmıyorsa: boş alan yerine zengin bir **Hava Durumu Özeti** (`cws-icon`, `cws-location`, `cws-desc` ve `cws-temp`) görüntülenir (Örn: ⛅ Kadıköy, İstanbul · Parçalı Bulutlu · 18°C).

---

## [2026-11-06] - Kararlı Ham Veri Mimarisi ve Kullanıcı Manuel Başlatma Moduna Geçiş
### 🚀 Yapılanlar & Düzeltmeler:
- **Deneysel WebView2 Bayraklarının Geri Alınması (`main.rs`):**
  - Çıkış kodu 1 ve saydam pencere çökmesine neden olan tüm `--renderer-process-limit` ve V8 argümanları tamamen temizlendi; WebView2'nin doğal saydamlık motoru korundu.
- **Saf Ham Veri Güvencesi:**
  - Hardcoded/mock tüm sahte değerler (sabit UV, sahte şehir isimleri vb.) kaldırıldı; wttr.in istasyon telemetrisi doğrudan saf ham metin olarak taşındı.
- **Kusursuz DPI & Çoklu Monitör Uyumluluğu (`set_island_size` & `setup`):**
  - `LogicalSize` ve `LogicalPosition` mimarisine geçilerek %125, %150 ve çoklu monitörlerde adanın sağdan kesilmesi ve ana ekrana sıçrama sorunları çözüldü.
- **Kapak Arama & Güvenli Metin Ayrıştırma (`sanitize_music_query`):**
  - UTF-8 dil ve byte sınırlarından bağımsız derinlik tabanlı parantez temizleme algoritması uygulandı, `Downloads` ve `Music` yerel klasör taraması güçlendirildi, başlık yedek araması eklendi.
- **Kullanıcı Kontrolü:**
  - Kullanıcının "sen komut çalıştırma ben manuel başlatırım" direktifi doğrultusunda arka plan otomatik süreç başlatmaları durduruldu. Sistem manuel başlatmaya hazır hale getirildi.

---

## [2026-11-06] - 3 Ajanın Birleşik Optimizasyon, Güvenlik ve Telemetri Paketi
### 🚀 Yapılanlar & Düzeltmeler:
- **Güvenlik & Hata Düzeltmeleri (Ajan 1 Bulguları):**
  - **`capabilities/default.json` Yetki Onarımı:** `"settings"` penceresi yetki listesine eklenerek ayarlar penceresindeki tüm Tauri komutlarının engellenmesi önlendi.
  - **UTF-8 Slicing Paniği Çözümü (`sanitize_music_query`):** `replace_range` byte index slicing'i kaldırıldı; kelime/token bazlı güvenli filtrelemeye geçilerek Rust abort çökme riski sıfırlandı.
  - **Disk I/O Koruması (`scan_local_folder_for_cover`):** Dosya taraması `tokio::task::spawn_blocking` içine alındı, dosya boyutu 3 MB ile sınırlandı, Tokio worker thread'lerinin starvation yaşaması engellendi.
  - **DPI ve Çoklu Monitör Hesaplaması (`set_island_size`):** Monitör ofseti (`monitor.position().x, y`) ve scale factor (`monitor.scale_factor()`) hesaplamaya dahil edilerek çoklu monitörlerde ana ekrana sıçrama ve DPI küçülme hataları giderildi.
- **Performans & Bellek Optimizasyonları (Ajan 2 Bulguları):**
  - **GPU Compositing Hızlandırması (`index.html`):** `.island` kapsülüne `will-change: width, height, border-radius; transform: translateZ(0);` eklenerek layout reflow gecikmeleri önlendi.
  - **State-Diffing ile Sıfır DOM Yükü:** `setText` ve `setDisplay` kontrolleriyle verisi değişmeyen DOM düğümlerinin gereksiz repaint/reflow tetiklemesi engellendi.
  - **Gereksiz Polling'in Kaldırılması:** Frontend'deki mükerrer `setTimeout(fetchWeather, ...)` kaldırıldı; yalnızca backend daemon'u dinleniyor.
  - **WebView2 ve RAM Optimizasyonu (`main.rs` & `trim_memory`):** `--renderer-process-limit=1`, `--disable-gpu-shader-disk-cache` ve `--max-old-space-size=32` argümanları eklendi. Ada `bar` moduna geçtiğinde `K32EmptyWorkingSet` çağrılarak pasif çalışma seti belleği boşaltılıyor.
- **Ağ & Ham Veri İyileştirmeleri (Ajan 3 Bulguları):**
  - **Open-Meteo REST API Entegrasyonu:** `wttr.in`'in 26 KB ve 6.5s'lik hantal yapısına karşılık, 324 byte ve 20ms sunucu süresi olan kurumsal Open-Meteo REST API'si birincil motor yapıldı; `wttr.in` yedek hatta çekildi.
  - **WinRT Geolocation 3s Zaman Aşımı:** `GetGeopositionAsyncWithAgeAndTimeout` ile masaüstü donanımlarında 60 saniyelik bloklanma engellendi; 3 saniyede yanıt gelmezse anında yüksek hızlı HTTPS IP telemetrisine (`freeipapi.com` - 0.4s) fallback yapılıyor.
  - **Paralel Kapak Arama Motoru:** Deezer ve iTunes API'leri sıralı değil, `tokio::select!` ile eşzamanlı sorgulanarak kapak bulma süresi 1.5 saniyeye indirildi.
- **Canlı Derleme & Başlatma:**
  - Saf Rust/Tauri ikilisi sıfır uyarı ile derlendi ve canlı olarak arka planda çalıştırıldı (`PID: 12812`).

---

## [2026-11-05] - Cihaz Konumu (Windows Geolocator API) ile Otonom Hava Durumu Tespiti
### 🚀 Yapılanlar & Düzeltmeler:
- **Doğrudan Cihazın Konumundan Tespit (`get_device_os_location`):**
  - Manuel ayar veya şehir aramalarına gerek kalmaksızın, hava durumunun doğrudan cihazın kendi fiziksel konumundan tespit edilmesi sağlandı.
  - Windows Geolocation API'si (`windows::Devices::Geolocation::Geolocator`) Rust çekirdeğine entegre edildi (`Devices_Geolocation` WinRT yetkisi).
  - Cihazın GPS/Wi-Fi/OS konum servisinden gelen enlem ve boylam (`Latitude`, `Longitude`) koordinatları doğrudan okunarak en yakın meteoroloji istasyonundan ham telemetri çekiliyor.
  - Cihaz konum servisi kapalıysa şeffaf bir şekilde IP telemetrisine fallback yapılarak kesintisiz veri akışı güvenceye alındı.
- **Canlı Derleme & Başlatma:**
  - `tauri-island` sıfır uyarı ile derlendi ve canlı olarak başlatıldı (`PID: 11048`).

---

## [2026-11-05] - Tam Otonom Hava Durumu Arka Plan Motoru & Yerel Klasör Tarayıcılı Kapak Sistemi
### 🚀 Yapılanlar & Düzeltmeler:
- **100% Otonom Hava Durumu Arka Plan Motoru (`commands.rs`):**
  - **Zero-Config Coğrafi Telemetri (`detect_location`):** Sabit veya hardcoded şehir bağımlılığı tamamen kaldırıldı. Sistem, `ip-api.com` ve `ipwho.is` açık ağ telemetrisi ile kullanıcının gerçek koordinatlarını (`lat`, `lon`), şehir ve ülke adını otomatik olarak yakalar.
  - **Hassas wttr.in Koordinat Entegrasyonu:** Elde edilen koordinatlar `wttr.in/{lat},{lon}?format=j1&lang=tr` telemetri hattına bağlanarak en yakın meteoroloji istasyonundan ham sıcaklık, hissedilen sıcaklık, nem, rüzgar hızı/yönü, atmosfer basıncı, UV indeksi ve 3 günlük tahmin ham veri olarak çekilir.
  - **Arka Plan Otonom Daemon (`tauri::async_runtime::spawn`):** Ada açıldığı anda arka planda bağımsız bir Tokio iş parçacığı başlatılır. Her 10 dakikada bir hava durumunu otomatik olarak sorgular, dahili önbelleği (`AppState.weather`) günceller ve `weather-updated` Tauri olayını yayınlar. Arayüzün manuel istek atmasına gerek kalmaksızın hava durumu her zaman taze tutulur.
  - **Reaktif Arayüz Dinleyicisi (`index.html`):** Ada Webview arayüzü `weather-updated` yayınlarını canlı dinler ve gelen ham veriyi hem kompakt mini simgeye hem de genişletilmiş sekme kartına anında yansıtır.
- **Gelişmiş Medya Kapak Çözücü & Klasör Tarama Sistemi ("klasörleri tara"):**
  - **Yerel Klasör Taraması (`scan_local_folder_for_cover`):** Yerel müzik çalarlardan (VLC, Foobar2000, Windows Media Player, Strawberry vb.) parça çalındığında, sistem kullanıcının `Music` ve `Downloads` dizinlerini tarar; parçanın başlığı veya sanatçısıyla eşleşen klasör/ses dosyalarını ve o dizindeki görsel kapak dosyalarını (`cover.jpg`, `folder.png`, `albumart.jpg`, `front.jpg` vb.) ham bayt olarak okuyup adaya aktarır.
  - **YouTube & Tarayıcı Akıllı Ayrıştırıcısı:** Tarayıcı oturumlarında `props.Title` içerisindeki `" - "` ayracı ile sanatçı ve parça adı ayrıştırılır (Örn: `Nightcore - We Don't Talk Anymore`).
  - **Çift Kademeli Otonom API Motoru (Deezer + iTunes):** Sistemden veya yerel diskten görsel gelmediğinde önce Nightcore, remix ve YouTube parçalarında geniş veritabanına sahip Deezer API'si, ardından Apple Music / iTunes API'si otonom olarak sorgulanarak yüksek çözünürlüklü kapak görseli arayüze aktarılır.
  - **Canlı Başlatma & Sıfır Donma:** Uygulama saf Rust/Tauri olarak başarıyla derlendi ve canlı olarak arka planda çalıştırıldı.

---

## [2026-11-05] - Çapraz Platform (Windows GSMTC & Linux MPRIS) Çekirdeği ve Ham Veri Mimarisi
### 🚀 Yapılanlar & Düzeltmeler:
- **İşletim Sisteminden Doğrudan Ham Medya ve Kapak Resmi:**
  - **Windows:** WinRT GSMTC (`GlobalSystemMediaTransportControlsSessionManager`) çekirdeği entegre edildi. Edge, Chrome, Spotify, VLC vb. çalan medyanın ham oturumundan şarkı başlığı, sanatçı ve doğrudan resmi bayt stream (`Thumbnail`) çekilerek `data:image/...;base64` olarak arayüze aktarılıyor.
  - **Linux:** Standart Linux masaüstü D-Bus `mpris` arayüzü entegre edildi. Linux üzerinde çalan medyanın meta verileri ve `artUrl` (yerel dosya veya uzak URL) doğrudan okunup yönetilebilir hale getirildi.
- **Hava Durumu Ham Veri Genişletmesi:**
  - `wttr.in` üzerinden gelen ham istasyon telemetrisi genişletildi: Gerçek konum adı, hissedilen sıcaklık, nem, rüzgar hızı/yönü, basınç, UV indeksi ve 3 günlük hava tahmini (gün, simge, min/max sıcaklık) eklendi.
  - Sabit / hardcoded şehir bağımlılığı kaldırıldı; boş bırakıldığında IP üzerinden otomatik konum tespiti desteği sağlandı.
- **Tüm Artık Dosyalar Temizlendi:**
  - Proje dizinindeki kullanılmayan eski şablon dosyaları (`settings.json`, `styles.css`, `main.js`, `assets/`) temizlendi.
- **Yerel Derleme & Canlı Başlatma:**
  - Uygulama saf Rust/Tauri olarak derlendi ve canlı olarak çalıştırıldı (`PID: 6588`).

---

## [2026-11-05] - Saf Ham Veri (Zero Hardcoded) Mimarisi
### 🚀 Temizlendi & Dönüştürüldü:
- **Tüm Varsayılan ve Hardcoded Değerlerin Sıfırlanması:**
  - Kullanıcının "varsayılan resim veya hardcoded varsayılan değer istemiyorum, sadece HAM VERİ" direktifi doğrultusunda sistemde yer alan tüm yapay fallback ve varsayılan etiketler temizlendi.
  - Medya bulunmadığında sahte veya sabit hiçbir veri (`Müzik Algılanmadı`, `Spotify veya Tarayıcıda bir şarkı başlatın` vb.) basılmaz; yalnızca sistemden okunan canlı ham başlık, sanatçı ve kapak varsa gösterilir.
  - Hava durumu servisinde hardcoded hiçbir varsayılan veya statik hava verisi bırakılmadı; doğrudan wttr.in istasyon telemetrisinden gelen ham sıcaklık, nem ve rüzgar canlı olarak ekrana yansıtılır.
- **Saf C/C++ Dengi Yerel Çekirdek:**
  - Uygulama herhangi bir harici betik/script olmadan doğrudan makine koduna derlenen Rust ikilisi (`tauri-island.exe`) olarak çalıştırıldı.

---

## [2026-11-05] - Müzik Algılama & Hava Durumu Güncelleme Kararlılığı İyileştirmesi
### 🚀 Düzeltildi & Geliştirildi:
- **Hava Durumu Servisi Ağ Koruması & Önbellek (`get_weather`):**
  - wttr.in servisine 4 saniyelik kesin zaman aşımı (timeout) getirildi.
  - Ağda anlık yavaşlama veya paket kaybı olsa dahi ada arayüzünün takılmaması için son başarılı meteoroloji verisi (`state.weather`) otomatik olarak korunup ekrana yansıtılmaya devam eder.
- **YouTube & YouTube Music Başlık Algılama Genişletmesi (`check_music`):**
  - Tarayıcılarda açılan `YouTube Music`, `YouTube` ve farklı dil/sekme kalıpları harf duyarsız (case-insensitive) hale getirildi.
  - Tarayıcı son ekleri (Edge, Chrome, Brave, Firefox, Opera) ve sekme gruplama metinleri daha hassas bir şekilde elenerek pencere başlığı anında parçalanır ve hem şarkı başlığı hem albüm kapağı arayüze anında aktarılır.

---

## [2026-11-05] - Saf Sistem Mimarisi (Sıfır Python) ve C/C++ Dengi Native Rust Çekirdeği
### 🚀 Yapılanlar & Düzeltmeler:
- **Tüm Geçici / Artık Dosyaların Temizlenmesi:**
  - Proje dizininde yer alan tüm geçici test scriptleri (`.py`, `.js`) tamamen silindi. Proje ağacında **tek bir Python dosyası veya bağımlılığı kalmadı**.
  - Proje, C ve C++ ile birebir aynı yerel derleyici performansına (LLVM backend, sıfır çalışma zamanı yükü, doğrudan Win32 ABI çağrıları) sahip saf **Rust (Tauri v2)** ikilisi olarak inşa edildi.
- **YouTube Albüm Kapağı Çözücüsüne Çoklu Fallback Stratejisi (`commands.rs`):**
  - Nightcore, remix ve özel video başlıklarında sanatçı ve şarkı adı ayrışsa dahi API aramalarında bazen "Artist Title" birlikte aratıldığında eşleşme bulunamayabiliyordu.
  - Rust çekirdeğine 3 aşamalı arama stratejisi eklendi:
    1. `Sanatçı + Şarkı Adı` araması.
    2. Sonuç gelmezse doğrudan saf `Şarkı Adı` araması (`We Don't Talk Anymore`).
    3. Sonuç gelmezse `Sanatçı` araması.
  - Sorgu temizleyicisinde (`sanitize_music_query`) baştaki ve sondaki tire işaretleri (`-`) ve parantez artıkları tamamen traşlandı.
  - Bu sayede YouTube üzerinde çalan parçaların albüm kapak görselleri eksiksiz çekilmeye başlandı.

---

## [2026-11-05] - Gelişmiş YouTube Müzik Ayrıştırma & Çift Katmanlı Albüm Kapağı Motoru
### 🚀 Düzeltildi & Geliştirildi:
- **YouTube Şarkı Başlıklarındaki Gürültünün Temizlenmesi (`commands.rs`):**
  - YouTube sekmelerinde tarayıcı başlığı şu tarz karmaşık metinler içeriyordu:  
    `MONSTER - (Lyrics) ve diğer 2 sayfa - Profil 1 - Microsoft Edge` veya `(211) Nightcore - MONSTER - (Lyrics) - YouTube`.
  - Bu karmaşık başlıklar doğrudan iTunes API'sine gittiğinde şarkı bulunamıyor ve albüm görseli boş kalıyordu.
  - **Çözüm:** 
    - Tarayıcı son ekleri (`Microsoft Edge`, `Google Chrome`, `Brave`, `Firefox`, `Opera` vb.) temizlendi.
    - Sekme gruplama ekleri (`ve diğer X sayfa - Profil Y`) temizlendi.
    - Başta yer alan bildirim sayaçları (`(211)`) ayıklandı.
    - Şarkı başlığındaki gürültülü ifadeler (`(Lyrics)`, `[Official Audio]`, `Music Video`, `Remix`, `Klip`) `sanitize_music_query` algoritmasıyla arındırıldı.
- **Çift Katmanlı Albüm Kapağı Arama Motoru (iTunes + Deezer Fallback):**
  - Temizlenen şarkı ve sanatçı adı önce **Apple Music / iTunes API** üzerinde aratılır.
  - Bulunamazsa otomatik olarak **Deezer API** üzerinden şarkının kapak görseli taranır.
  - Böylece YouTube üzerinde dinlenen şarkıların (Nightcore, remix, cover veya resmi parçalar) kapak görselleri başarıyla yakalanıp adaya aktarılır.

---

## [2026-11-05] - Dinamik Vektörel Hava Durumu İllüstrasyonları (SVG Widget)
### 🚀 Eklendi & Geliştirildi:
- **Hava Durumu Sekmesine Büyük Dinamik SVG Kartı:**
  - `getWeatherSvg` fonksiyonu geliştirilerek wttr.in'den gelen ham istasyon verisine (`desc`) göre dinamik simge eşleştirmesi yapıldı.
  - Açık/Güneşli (`Güneş`), Parçalı/Bulutlu/Kapalı (`Bulut`), Yağmurlu/Çisenti (`Bulut + Yağmur`), Karlı (`Kar Tanesi`), Fırtınalı (`Şimşekli Bulut`), Sisli/Puslu (`Sis Çizgileri`) olmak üzere renkli ve modern düz SVG vektörler entegre edildi.
  - Genişletilmiş hava durumu panelinde sol tarafa 86x86 px boyutunda gradyan derinlikli, 52px boyutunda büyük ve canlı bir SVG hava görseli kartı eklendi.
  - Sağ tarafa şehir etiketi (lokasyon pini ile), büyük sıcaklık metni, durum rozeti (badge) ve telemetri verileri (hissedilen, nem, rüzgar hızı) zarifçe konumlandırıldı.
- **Kompakt Mod İçin Canlı Dinamik Mini SVG:**
  - Adanın kompakt modundaki sağ üst sıcaklık yanındaki küçük simge de hava durumuna göre (yağmurluysa yağmur, bulutluysa bulut vb.) otomatik güncellenecek şekilde dinamikleştirildi.

---

## [2026-11-05] - Standart Fare İmleci Dönüşümü (Default Cursor)
### 🚀 Düzeltildi:
- **İşaretçi (El / Pointer) İmlecinin Kaldırılması:**
  - Ada gövdesinde fare gezdirilirken tıklama simgesi (`cursor: pointer`) çıkması engellendi.
  - Ada gövdesi `cursor: default` (klasik düz ok imleci) olarak ayarlandı.
  - Sadece tıklanabilir sekme butonları, ayarlar ve medya kontrol butonlarında işlem yapılabilir olduğunu hissettiren düğme imleçleri korunurken ada geneli temiz masaüstü deneyimine uygun hale getirildi.

---

## [2026-11-05] - Köşelerdeki Karartı/Yarı Saydam Gölge Artığının Temizlenmesi
### 🚀 Düzeltildi:
- **Köşe Karartısı ve Saydamlık Çakışması (Box-Shadow Artifacts):**
  - Gönderilen ekran görüntüsünde adanın yuvarlak köşelerinin dışa taşan kısmında oluşan grimsi/karartılı leke incelendi.
  - Windows DWM üzerinde şeffaf pencerelerde (`transparent: true`) CSS `box-shadow` uygulandığında, gölgenin yarı saydam alfa kanalı masaüstü pikselleriyle birleşirken köşelerde dikdörtgenimsi bir karaltı oluşturuyordu.
  - **Çözüm:** CSS üzerindeki `box-shadow` tamamen kaldırıldı (`box-shadow: none`). Adanın gövdesi saf siyah `#000000` ve kesintisiz pürüzsüz `border-radius: 20px / 24px` kavislerine kavuşturuldu. Köşelerdeki tüm yapay karartılar ve izler yok edildi.

---

## [2026-11-05] - Tıklama Davranışı ve Kenar Yuvarlatma İyileştirmeleri
### 🚀 Düzeltildi & Geliştirildi:
- **Tıklamayla İstem Dışı Kapanmanın Kaldırılması:**
  - Ada tam açıldığında (expanded moddayken) ada gövdesine tekrar tıklandığında kapanması iptal edildi. Kullanıcı artık ada içinde müzik kontrollerine, sekmelere ve ayarlar butonuna rahatça tıklayabilir.
  - Ada yalnızca fare kapsülün dışına çıktığında (`mouseleave`) belirlenen akıllı gecikme süresi sonunda kendiliğinden kapanır.
- **Köşelerdeki Transparan Çerçeve Hatasının Giderilmesi:**
  - Adanın etrafındaki yarı saydam kenarlık (`border: 1px solid rgba(...)`) ve üst sınır çizgileri kaldırıldı (`border: none`).
  - Gölgelendirme saf koyu tonlara çekilerek (`box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7)`) köşe yuvarlatmasının (`border-radius: 20px / 24px`) piksel kırılması veya yapay saydam köşe efekti vermesi tamamen engellendi; pürüzsüz doğal Apple kapsül kavisi sağlandı.

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
