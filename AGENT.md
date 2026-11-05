# Agent Guidelines & Operational Rules (AGENT.md)

Bu dosya, bu depoda çalışacak yapay zeka ajanlarının uyması gereken temel kuralları, mimari ilkeleri ve işleyiş protokolünü tanımlar.

---

## 📌 Temel Kurallar (Core Directives)

1. **Belgeleme Yükümlülüğü:**
   - Her işlem, geliştirme veya düzeltme tamamlandıktan sonra **`LOG.md`** dosyasına tarih ve detay eklenmelidir.
   - Herhangi bir dizin, dosya veya modül eklendiğinde/değiştiğinde **`MAPS.md`** güncellenmelidir.
   - Ajan prensiplerinde veya operasyon biçiminde değişiklik olursa bu dosya (**`AGENT.md`**) güncellenmelidir.

2. **Mimari Kararlar ve Teknoloji Seçimi:**
   - Proje **Rust (Backend - Tauri v2)** ve **Donanım Hızlandırmalı Web (Frontend - HTML/CSS/JS)** temellidir.
   - Python veya geçici scriptler ana ürün mimarisine dahil edilmemelidir.
   - Performans kritik öneme sahiptir: RAM kullanımı < 40 MB, boşta CPU %0 ve 60+ FPS hedeflenmelidir.

3. **Görsel & Arayüz Standartları:**
   - Asla standart emoji karakterleri kullanılmamalıdır; daima **ASCII sembolleri** ve monospace tipografi korunmalıdır.
   - Pencere kenarlığı veya ekstra çerçeve eklenmemeli, ekranın üst kenarıyla tam bütünleşik ve şeffaf kalmalıdır.
   - Tıklama alanının (hit-test) arkadaki pencereleri ve tarayıcı sekmelerini engellememesi için pencere boyutu (`set_island_size`) her mod geçişinde dinamik tutulmalıdır.

4. **Sistem Entegrasyonu:**
   - Müzik ve oyun algılama tahminlere değil, doğrudan işletim sistemi çekirdek/shell API'lerine (`SHQueryUserNotificationState`, Win32 `EnumWindows`, Linux `mpris`) dayanmalıdır.
   - Meteoroloji verisi aracı kütüphaneler yerine ham istasyon telemetrisinden hardcoded çekilmelidir.
