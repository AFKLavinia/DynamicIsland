// ============================================================================
// AFK Dynamic Island - Çoklu Dil (i18n / Yerelleştirme) Çekirdek Modülü
// Desteklenen Diller: Türkçe ('tr'), English ('en')
// ============================================================================

(function () {
  const STORAGE_KEY = 'app_lang';
  const DEFAULT_LANG = 'tr';

  const TRANSLATIONS = {
    tr: {
      // Dinamik Ada Genel
      'island.tabs.music': 'Müzik',
      'island.tabs.weather': 'Hava Durumu',
      'island.tooltips.settings': 'Ayarlar',
      'island.tooltips.exit': "Dynamic Island'ı Kapat",
      'island.tooltips.spotify': "Spotify'ı Aç",
      'island.tooltips.ytmusic': "YouTube Music'i Başlat",
      'island.tooltips.mute': 'Sesi Aç/Kapat',
      'island.tooltips.volume': 'Ses Düzeyi',
      'island.music.idle_title': 'Müzik Dinlemeye Başla',
      'island.music.idle_sub': 'Klavyeden Oynat tuşuna veya başlatıcılara basın',
      'island.music.ready_badge': 'Dinlemeye Hazır',
      'island.music.paused': 'Duraklatıldı',
      'island.music.browser': 'Tarayıcı',
      'island.music.system_media': 'Sistem Medyası',
      'island.music.media': 'Medya',
      'island.weather.loading': 'Alınıyor...',
      'island.weather.default_loc': 'Hava Durumu',
      'island.weather.default_desc': 'Açık',
      'island.weather.feels_like': 'Hissedilen {temp}°C',
      'island.weather.feels_short': 'Hiss. {temp}°',
      'island.weather.humidity': 'Nem %{hum}',
      'island.weather.wind': 'Rüzgar {speed} km/sa {dir}',
      'island.weather.pressure': 'Basınç {press} hPa',
      'island.weather.uv': 'UV {uv}',
      'island.weather.wind_short': '{speed} km/sa',
      'island.exit_modal.title': 'Dynamic Island Kapatılsın mı?',
      'island.exit_modal.desc': 'Uygulamadan tamamen çıkmak istediğinize emin misiniz?',
      'island.exit_modal.dont_ask': 'Bir daha sorma',
      'island.exit_modal.cancel': 'Vazgeç',
      'island.exit_modal.confirm': 'Kapat',

      // Ayarlar Üst Bar ve Gezinme
      'settings.header.title': 'Dynamic Island Ayarları',
      'settings.header.subtitle': 'Windows 11 Denetim Merkezi',
      'settings.header.core_active': 'AFK Çekirdek Aktif',
      'settings.nav.weather': 'Hava Durumu',
      'settings.nav.media': 'Medya & Ses',
      'settings.nav.island': 'Ada Görünümü',
      'settings.nav.about': 'Hakkında',

      // Ayarlar - Hava Durumu
      'settings.weather.header_title': 'Hava Durumu',
      'settings.weather.header_sub': 'Meteoroloji istasyonu telemetrisi ve Türkiye altyapı adres yapılandırması.',
      'settings.weather.auto_tag': 'Otomatik',
      'settings.weather.loading': 'Yükleniyor...',
      'settings.weather.refresh_btn': 'Şimdi Yenile',
      'settings.weather.refresh_tooltip': 'İstasyon Telemetrisini Yenile',
      'settings.weather.fetching_data': 'Meteoroloji verisi alınıyor...',
      'settings.weather.feels_label': 'Hissedilen:',
      'settings.weather.humidity_label': 'Nem Oranı:',
      'settings.weather.range_label': 'Günün Aralığı:',
      'settings.weather.wind_label': 'Rüzgar:',
      'settings.weather.station_card_title': 'Konum ve Meteoroloji İstasyonu',
      'settings.weather.station_card_sub': 'Yazarak arayın ve yalnızca açılır listedeki resmi kayıtlı yerleri seçin (81 İl, 973 İlçe, 80.689 Köy).',
      'settings.weather.gps_btn': 'Otomatik Konum (GPS)',
      'settings.weather.gps_tooltip': 'Windows GPS ve IP telemetrisine dön',
      'settings.weather.step1_title': 'İl (Şehir)',
      'settings.weather.step1_meta': '81 İl',
      'settings.weather.step1_placeholder': 'İl ara veya seç (Örn: Osmaniye, Adana)...',
      'settings.weather.step2_title': 'İlçe',
      'settings.weather.step2_placeholder': 'Önce il seçiniz...',
      'settings.weather.step2_active_placeholder': 'İlçe ara veya seç...',
      'settings.weather.step3_title': 'Mahalle / Köy',
      'settings.weather.step3_placeholder': 'Önce ilçe seçiniz...',
      'settings.weather.step3_active_placeholder': 'Köy/Mahalle ara veya seç...',
      'settings.weather.no_loc_selected': 'Henüz bir konum seçilmedi. Yukarıdan il ve ilçenizi aratarak seçin.',
      'settings.weather.lock_save_btn': 'Konumu Kilitle & Kaydet',
      'settings.weather.infobar_title': 'Nokta Atışı Meteoroloji Bağlantısı:',
      'settings.weather.infobar_text': 'Açılır menüden seçtiğiniz mahalle veya köy koordinatları Open-Meteo ve OpenStreetMap üzerinde milimetrik olarak kilitlenir. Mobil internet veya baz istasyonu kaymalarından etkilenmez.',
      'settings.weather.toast_refreshing': 'İstasyon telemetrisi yenileniyor...',
      'settings.weather.toast_updated': 'Hava durumu güncellendi.',
      'settings.weather.toast_error': 'Güncelleme hatası: ',
      'settings.weather.toast_switching_auto': 'Otomatik konuma geçiliyor...',
      'settings.weather.toast_auto_enabled': 'Otomatik konum etkinleştirildi.',
      'settings.weather.auto_tag_active': 'Otomatik GPS / IP',
      'settings.weather.tag_saved': 'Kayıtlı: ',
      'settings.weather.unknown_loc': 'Bilinmiyor',
      'settings.weather.clear_desc': 'Açık',
      'settings.weather.speed_unit': 'km/sa',

      // Ayarlar - Medya & Ses
      'settings.media.header_title': 'Medya & Ses',
      'settings.media.header_sub': 'Müzik çalar denetimi ve donanımsal ses kaydırıcı ayarları.',
      'settings.media.hub_title': 'Hızlı Başlatıcı Hub',
      'settings.media.hub_sub': 'Müzik çalmıyorken ada üzerinden doğrudan erişim butonları.',
      'settings.media.test_spotify': "Spotify'ı Test Et",
      'settings.media.test_ytmusic': "YouTube Music'i Test Et",
      'settings.media.hw_slider': 'Donanımsal Ses Kaydırıcı',
      'settings.media.hw_slider_desc': 'Aktif (Win32 & pactl)',
      'settings.media.wheel_ctrl': 'Fare Tekerleği Kontrolü',
      'settings.media.wheel_ctrl_desc': 'Genişletilmiş Modda Aktif (Wheel)',
      'settings.media.badge_detect': 'Platform Rozet Algılama',
      'settings.media.badge_detect_desc': 'Spotify, YouTube, VLC, Tarayıcı',

      // Ayarlar - Ada Görünümü
      'settings.island.header_title': 'Ada Görünümü',
      'settings.island.header_sub': 'Dynamic Island geometri profilleri ve kapatma tercihleri.',
      'settings.island.bar_mode': 'Bar Modu (Boşta Gizli Çizgi)',
      'settings.island.compact_mode': 'Kompakt Ön İzleme (Fare Üzerindeyken)',
      'settings.island.expanded_mode': 'Genişletilmiş Mod (Müzik & Hava Detayı)',
      'settings.island.placement': 'Ekran Yerleşimi',
      'settings.island.placement_desc': 'Üst Merkez (DPI Duyarlı)',
      'settings.island.gamemode_title': 'Oyun Modu Koruması',
      'settings.island.gamemode_sub': 'Tam ekran bir oyuna girildiğinde ada 40x2 px gizli moda geçer.',
      'settings.island.gamemode_tag': 'Otomatik Dinleme',
      'settings.island.exit_confirm_title': 'Uygulamayı Kapatma Onayı',
      'settings.island.exit_confirm_sub': '"Bir daha sorma" seçeneğini sıfırlayıp onay penceresini tekrar etkinleştirir.',
      'settings.island.reset_confirm_btn': 'Onayı Sıfırla',
      'settings.island.reset_confirm_toast': 'Kapatma onayı sıfırlandı. Artık kapatırken sorulacak.',

      // Ayarlar - Dil Seçimi
      'settings.language.card_title': 'Uygulama Dili',
      'settings.language.card_sub': 'Dinamik Ada ve Ayarlar arayüzü görüntüleme dilini seçin.',
      'settings.language.turkish': 'Türkçe',
      'settings.language.english': 'English',
      'settings.language.toast_changed': 'Dil Türkçe olarak ayarlandı.',

      // Ayarlar - Hakkında
      'settings.about.header_title': 'Hakkında',
      'settings.about.header_sub': 'Yazılım sürümü, çekirdek motoru ve lisans bilgileri.',
      'settings.about.app_tagline': 'Windows 11 İçin Modern Apple Dynamic Island Deneyimi',
      'settings.about.core_engine': 'Çekirdek Motor',
      'settings.about.loc_db': 'Konum Veritabanı',
      'settings.about.loc_db_desc': 'Modüler 81 İl, 973 İlçe, 80.689 Köy',
      'settings.about.ui_style': 'Arayüz Dili',
      'settings.about.ui_style_desc': 'Windows 11 Fluent Design (Dark Mica)',
      'settings.about.developer': 'Geliştirici'
    },

    en: {
      // Dynamic Island General
      'island.tabs.music': 'Music',
      'island.tabs.weather': 'Weather',
      'island.tooltips.settings': 'Settings',
      'island.tooltips.exit': 'Exit Dynamic Island',
      'island.tooltips.spotify': 'Open Spotify',
      'island.tooltips.ytmusic': 'Open YouTube Music',
      'island.tooltips.mute': 'Mute/Unmute',
      'island.tooltips.volume': 'Volume Control',
      'island.music.idle_title': 'Start Playing Music',
      'island.music.idle_sub': 'Press Play on keyboard or use quick launchers',
      'island.music.ready_badge': 'Ready to Play',
      'island.music.paused': 'Paused',
      'island.music.browser': 'Browser',
      'island.music.system_media': 'System Media',
      'island.music.media': 'Media',
      'island.weather.loading': 'Loading...',
      'island.weather.default_loc': 'Weather',
      'island.weather.default_desc': 'Clear',
      'island.weather.feels_like': 'Feels like {temp}°C',
      'island.weather.feels_short': 'Feels {temp}°',
      'island.weather.humidity': 'Humidity {hum}%',
      'island.weather.wind': 'Wind {speed} km/h {dir}',
      'island.weather.pressure': 'Pressure {press} hPa',
      'island.weather.uv': 'UV {uv}',
      'island.weather.wind_short': '{speed} km/h',
      'island.exit_modal.title': 'Exit Dynamic Island?',
      'island.exit_modal.desc': 'Are you sure you want to completely exit the application?',
      'island.exit_modal.dont_ask': "Don't ask again",
      'island.exit_modal.cancel': 'Cancel',
      'island.exit_modal.confirm': 'Exit',

      // Settings Topbar & Navigation
      'settings.header.title': 'Dynamic Island Settings',
      'settings.header.subtitle': 'Windows 11 Control Center',
      'settings.header.core_active': 'AFK Core Active',
      'settings.nav.weather': 'Weather',
      'settings.nav.media': 'Media & Audio',
      'settings.nav.island': 'Island View',
      'settings.nav.about': 'About',

      // Settings - Weather
      'settings.weather.header_title': 'Weather',
      'settings.weather.header_sub': 'Meteorology station telemetry and location configuration.',
      'settings.weather.auto_tag': 'Automatic',
      'settings.weather.loading': 'Loading...',
      'settings.weather.refresh_btn': 'Refresh Now',
      'settings.weather.refresh_tooltip': 'Refresh Station Telemetry',
      'settings.weather.fetching_data': 'Fetching meteorology data...',
      'settings.weather.feels_label': 'Feels Like:',
      'settings.weather.humidity_label': 'Humidity:',
      'settings.weather.range_label': 'Day Range:',
      'settings.weather.wind_label': 'Wind:',
      'settings.weather.station_card_title': 'Location & Meteorology Station',
      'settings.weather.station_card_sub': 'Search and select registered locations (81 Provinces, 973 Districts, 80,689 Villages).',
      'settings.weather.gps_btn': 'Auto Location (GPS)',
      'settings.weather.gps_tooltip': 'Return to Windows GPS and IP telemetry',
      'settings.weather.step1_title': 'Province (City)',
      'settings.weather.step1_meta': '81 Provinces',
      'settings.weather.step1_placeholder': 'Search province (e.g. Istanbul, Ankara)...',
      'settings.weather.step2_title': 'District',
      'settings.weather.step2_placeholder': 'First select a province...',
      'settings.weather.step2_active_placeholder': 'Search or select district...',
      'settings.weather.step3_title': 'Neighborhood / Village',
      'settings.weather.step3_placeholder': 'First select a district...',
      'settings.weather.step3_active_placeholder': 'Search village/neighborhood...',
      'settings.weather.no_loc_selected': 'No location selected yet. Search and select province and district above.',
      'settings.weather.lock_save_btn': 'Lock & Save Location',
      'settings.weather.infobar_title': 'Pinpoint Meteorology Connection:',
      'settings.weather.infobar_text': 'Coordinates of the selected location are pinpoint locked via Open-Meteo & OpenStreetMap, unaffected by cellular tower drifts.',
      'settings.weather.toast_refreshing': 'Refreshing station telemetry...',
      'settings.weather.toast_updated': 'Weather updated successfully.',
      'settings.weather.toast_error': 'Update error: ',
      'settings.weather.toast_switching_auto': 'Switching to automatic location...',
      'settings.weather.toast_auto_enabled': 'Automatic location enabled.',
      'settings.weather.auto_tag_active': 'Auto GPS / IP',
      'settings.weather.tag_saved': 'Saved: ',
      'settings.weather.unknown_loc': 'Unknown',
      'settings.weather.clear_desc': 'Clear',
      'settings.weather.speed_unit': 'km/h',

      // Settings - Media & Audio
      'settings.media.header_title': 'Media & Audio',
      'settings.media.header_sub': 'Music player controls and hardware volume slider settings.',
      'settings.media.hub_title': 'Quick Launcher Hub',
      'settings.media.hub_sub': 'Direct access buttons on island when no music is playing.',
      'settings.media.test_spotify': 'Test Spotify',
      'settings.media.test_ytmusic': 'Test YouTube Music',
      'settings.media.hw_slider': 'Hardware Volume Slider',
      'settings.media.hw_slider_desc': 'Active (Win32 & pactl)',
      'settings.media.wheel_ctrl': 'Mouse Wheel Control',
      'settings.media.wheel_ctrl_desc': 'Active in Expanded Mode (Wheel)',
      'settings.media.badge_detect': 'Platform Badge Detection',
      'settings.media.badge_detect_desc': 'Spotify, YouTube, VLC, Browser',

      // Settings - Island View
      'settings.island.header_title': 'Island View',
      'settings.island.header_sub': 'Dynamic Island geometry profiles and exit preferences.',
      'settings.island.bar_mode': 'Bar Mode (Idle Hidden Line)',
      'settings.island.compact_mode': 'Compact Preview (On Mouse Hover)',
      'settings.island.expanded_mode': 'Expanded Mode (Music & Weather Detail)',
      'settings.island.placement': 'Screen Placement',
      'settings.island.placement_desc': 'Top Center (DPI Aware)',
      'settings.island.gamemode_title': 'Game Mode Protection',
      'settings.island.gamemode_sub': 'When entering a fullscreen game, island switches to 40x2 px stealth mode.',
      'settings.island.gamemode_tag': 'Auto Detection',
      'settings.island.exit_confirm_title': 'Exit Confirmation',
      'settings.island.exit_confirm_sub': 'Resets "Don\'t ask again" option and re-enables exit confirmation dialog.',
      'settings.island.reset_confirm_btn': 'Reset Confirmation',
      'settings.island.reset_confirm_toast': 'Exit confirmation reset. You will be prompted on exit.',

      // Settings - Language Selection
      'settings.language.card_title': 'App Language',
      'settings.language.card_sub': 'Select display language for Dynamic Island and Settings.',
      'settings.language.turkish': 'Türkçe',
      'settings.language.english': 'English',
      'settings.language.toast_changed': 'Language switched to English.',

      // Settings - About
      'settings.about.header_title': 'About',
      'settings.about.header_sub': 'Software version, core engine and license details.',
      'settings.about.app_tagline': 'Modern Apple Dynamic Island Experience for Windows 11',
      'settings.about.core_engine': 'Core Engine',
      'settings.about.loc_db': 'Location Database',
      'settings.about.loc_db_desc': 'Modular 81 Provinces, 973 Districts, 80,689 Villages',
      'settings.about.ui_style': 'UI Style',
      'settings.about.ui_style_desc': 'Windows 11 Fluent Design (Dark Mica)',
      'settings.about.developer': 'Developer'
    }
  };

  // WMO Hava Durumu Açıklamaları Sözlüğü
  const WMO_WEATHER_TRANSLATIONS = {
    0: { tr: 'Açık', en: 'Clear' },
    1: { tr: 'Çoğunlukla Açık', en: 'Mostly Clear' },
    2: { tr: 'Parçalı Bulutlu', en: 'Partly Cloudy' },
    3: { tr: 'Bulutlu', en: 'Overcast' },
    45: { tr: 'Sisli', en: 'Foggy' },
    48: { tr: 'Sisli ve Kırağı', en: 'Depositing Rime Fog' },
    51: { tr: 'Hafif Çisenti', en: 'Light Drizzle' },
    53: { tr: 'Çisenti', en: 'Drizzle' },
    55: { tr: 'Yoğun Çisenti', en: 'Dense Drizzle' },
    56: { tr: 'Hafif Dondurucu Çisenti', en: 'Light Freezing Drizzle' },
    57: { tr: 'Dondurucu Çisenti', en: 'Freezing Drizzle' },
    61: { tr: 'Hafif Yağmurlu', en: 'Slight Rain' },
    63: { tr: 'Yağmurlu', en: 'Moderate Rain' },
    65: { tr: 'Kuvvetli Yağmur', en: 'Heavy Rain' },
    66: { tr: 'Hafif Dondurucu Yağmur', en: 'Light Freezing Rain' },
    67: { tr: 'Dondurucu Yağmur', en: 'Heavy Freezing Rain' },
    71: { tr: 'Hafif Kar', en: 'Slight Snow Fall' },
    73: { tr: 'Kar Yağışlı', en: 'Moderate Snow Fall' },
    75: { tr: 'Yoğun Kar', en: 'Heavy Snow Fall' },
    77: { tr: 'Kar Taneleri', en: 'Snow Grains' },
    80: { tr: 'Hafif Sağanak', en: 'Slight Rain Showers' },
    81: { tr: 'Sağanak Yağış', en: 'Moderate Rain Showers' },
    82: { tr: 'Şiddetli Sağanak', en: 'Violent Rain Showers' },
    85: { tr: 'Kar Sağanağı', en: 'Slight Snow Showers' },
    86: { tr: 'Yoğun Kar Sağanağı', en: 'Heavy Snow Showers' },
    95: { tr: 'Gök Gürültülü Fırtına', en: 'Thunderstorm' },
    96: { tr: 'Hafif Dolu ve Fırtına', en: 'Thunderstorm with Slight Hail' },
    99: { tr: 'Dolu ve Şiddetli Fırtına', en: 'Thunderstorm with Heavy Hail' },
    // Wttr kodları
    113: { tr: 'Açık', en: 'Sunny / Clear' },
    116: { tr: 'Parçalı Bulutlu', en: 'Partly Cloudy' },
    119: { tr: 'Bulutlu', en: 'Cloudy' },
    122: { tr: 'Çok Bulutlu', en: 'Overcast' },
    143: { tr: 'Puslu / Sisli', en: 'Mist' },
    200: { tr: 'Fırtına', en: 'Thundery Outbreaks' }
  };

  // Rüzgar Yönleri Çevirisi (TR -> EN)
  const WIND_DIRS_MAP = {
    'K': 'N', 'KKD': 'NNE', 'KD': 'NE', 'DKD': 'ENE',
    'D': 'E', 'DGD': 'ESE', 'GD': 'SE', 'GGD': 'SSE',
    'G': 'S', 'GGB': 'SSW', 'GB': 'SW', 'BGB': 'WSW',
    'B': 'W', 'BKB': 'WNW', 'KB': 'NW', 'KKB': 'NNW'
  };

  const listeners = new Set();
  let currentLanguage = DEFAULT_LANG;

  // Başlangıç dilini localStorage'dan al
  function initLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'tr' || saved === 'en')) {
        currentLanguage = saved;
      } else {
        // Tarayıcı / Sistem dilini kontrol et
        const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
        currentLanguage = navLang.startsWith('tr') ? 'tr' : 'en';
        localStorage.setItem(STORAGE_KEY, currentLanguage);
      }
    } catch (e) {
      currentLanguage = DEFAULT_LANG;
    }
    document.documentElement.lang = currentLanguage;
  }

  // Metin Çevirici Fonksiyon
  function t(key, params = {}) {
    const dict = TRANSLATIONS[currentLanguage] || TRANSLATIONS[DEFAULT_LANG];
    let text = dict[key] || TRANSLATIONS[DEFAULT_LANG][key] || key;

    // Parametreleri doldur ({temp}, {speed} vb.)
    if (params && typeof params === 'object') {
      Object.keys(params).forEach(pKey => {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), params[pKey]);
      });
    }
    return text;
  }

  // Hava Durumu Açıklamasını Al
  function getWeatherDesc(code, defaultDesc = '') {
    const c = parseInt(code, 10);
    if (!isNaN(c) && WMO_WEATHER_TRANSLATIONS[c]) {
      return WMO_WEATHER_TRANSLATIONS[c][currentLanguage] || WMO_WEATHER_TRANSLATIONS[c].tr;
    }
    // Eğer kod bilinmiyorsa ve İngilizceyse ve varsayılan desc Türkçe ise temel eşleştirme yap
    if (currentLanguage === 'en' && defaultDesc) {
      for (const item of Object.values(WMO_WEATHER_TRANSLATIONS)) {
        if (item.tr.toLowerCase() === defaultDesc.toLowerCase()) {
          return item.en;
        }
      }
    }
    return defaultDesc || (currentLanguage === 'en' ? 'Clear' : 'Açık');
  }

  // Rüzgar Yönü Çevirisi
  function formatWindDir(dir) {
    if (!dir) return '';
    if (currentLanguage === 'en' && WIND_DIRS_MAP[dir]) {
      return WIND_DIRS_MAP[dir];
    }
    return dir;
  }

  // Gün İsmi Formatlayıcı (3 Günlük Tahminler)
  function formatDayName(dateStr) {
    try {
      const dt = new Date(dateStr + 'T12:00:00');
      if (isNaN(dt.getTime())) return dateStr;
      const locale = currentLanguage === 'en' ? 'en-US' : 'tr-TR';
      return dt.toLocaleDateString(locale, { weekday: 'short' });
    } catch (e) {
      return dateStr;
    }
  }

  // DOM Üzerindeki data-i18n Özniteliklerini Güncelle
  function applyTranslations(root = document) {
    // 1. data-i18n -> textContent
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    // 2. data-i18n-placeholder -> placeholder
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', t(key));
      }
    });

    // 3. data-i18n-title -> title
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', t(key));
      }
    });

    // 4. data-i18n-html -> innerHTML
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        el.innerHTML = t(key);
      }
    });

    // Segmented kontrol veya dil butonlarının aktifliğini güncelle
    document.querySelectorAll('[data-lang]').forEach(btn => {
      const btnLang = btn.getAttribute('data-lang');
      if (btnLang === currentLanguage) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Dili Değiştir ve Tüm Arayüzü Canlı Güncelle
  function setLanguage(lang, broadcast = true) {
    if (lang !== 'tr' && lang !== 'en') return;
    if (currentLanguage === lang && !broadcast) return;

    currentLanguage = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {}
    document.documentElement.lang = lang;

    // DOM çevirilerini uygula
    applyTranslations();

    // Kayıtlı dinleyicileri tetikle
    listeners.forEach(fn => {
      try {
        fn(lang);
      } catch (e) {
        console.error('i18n listener hatası:', e);
      }
    });

    // Tauri Pencereleri Arası Yayın
    if (broadcast && window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.emit) {
      try {
        window.__TAURI__.event.emit('app-lang-change', { lang });
      } catch (e) {}
    }
  }

  // Dil Değişikliğini Dinleme Kaydı
  function onLanguageChange(fn) {
    if (typeof fn === 'function') {
      listeners.add(fn);
    }
    return () => listeners.delete(fn);
  }

  // Mevcut Dili Getir
  function getLanguage() {
    return currentLanguage;
  }

  // İlk başlatma
  initLanguage();

  // DOM Hazır olduğunda çevirileri uygula
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTranslations());
  } else {
    applyTranslations();
  }

  // Diğer pencerelerden gelen Storage olayını dinle (Live Sync)
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue && (e.newValue === 'tr' || e.newValue === 'en')) {
      if (e.newValue !== currentLanguage) {
        setLanguage(e.newValue, false);
      }
    }
  });

  // Tauri Event ile pencereler arası anlık senkronizasyon dinle
  if (window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen) {
    try {
      window.__TAURI__.event.listen('app-lang-change', (event) => {
        if (event && event.payload && event.payload.lang) {
          if (event.payload.lang !== currentLanguage) {
            setLanguage(event.payload.lang, false);
          }
        }
      });
    } catch (e) {}
  }

  // Dışa aktarma
  window.i18n = {
    t,
    setLanguage,
    getLanguage,
    applyTranslations,
    onLanguageChange,
    getWeatherDesc,
    formatWindDir,
    formatDayName,
    TRANSLATIONS
  };
  window.t = t;
  window.setLanguage = setLanguage;
})();
