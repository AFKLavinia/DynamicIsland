// ---------------------------------------------------------------------------
// Hava Durumu Modülü (SVG Vektör Haritası & Ham Veri Görselleştirici)
// ---------------------------------------------------------------------------

let cachedWeather = null;
window.cachedWeather = null;

const WEATHER_ICONS = {
  sun: '<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"></path>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
  partly: '<path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.947 12.65a4 4 0 0 0-5.925-4.128"></path><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6z"></path>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>',
  rain: '<path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"></path><path d="M16 14v6M8 14v6M12 16v6"></path>',
  snow: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><path d="M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01"></path>',
  thunder: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><path d="M13 11l-4 6h6l-4 6"></path>',
  fog: '<path d="M4 14h16M4 10h16M6 18h12M6 6h12"></path>'
};

const WEATHER_ICON_COLORS = {
  sun: '#ffd60a', moon: '#c7d2fe', partly: '#ffd60a', cloud: '#98989d',
  rain: '#64d2ff', snow: '#ffffff', thunder: '#ffd60a', fog: '#aeaeb2'
};

function weatherKind(code, night) {
  const c = parseInt(code, 10);
  if (isNaN(c)) return null;

  // Fırtına / Thunder (WMO 95, 96, 99; wttr 200, 386, 389, 392, 395)
  if ([95, 96, 99, 200, 386, 389, 392, 395].includes(c)) return 'thunder';

  // Kar / Snow (WMO 71..77, 85, 86; wttr 179, 182, 227, 230, 317..338, 350, 362..377)
  if ([71, 73, 75, 77, 85, 86, 179, 182, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(c)) return 'snow';

  // Sis / Fog (WMO 45, 48; wttr 143, 248, 260)
  if ([45, 48, 143, 248, 260].includes(c)) return 'fog';

  // Açık / Güneşli / Gece Ayı (WMO 0; wttr 113)
  if (c === 0 || c === 113) return night ? 'moon' : 'sun';

  // Parçalı Bulutlu (WMO 1, 2; wttr 116)
  if (c === 1 || c === 2 || c === 116) return 'partly';

  // Bulutlu / Kapalı (WMO 3; wttr 119, 122)
  if (c === 3 || c === 119 || c === 122) return 'cloud';

  // Yağmur / Sağanak (WMO 51..67, 80..82; wttr diğerleri)
  return 'rain';
}

function weatherSvg(code, night, px) {
  const kind = weatherKind(code, night);
  if (!kind) return '';
  return `<svg class="icon" style="width:${px}px; height:${px}px; color:${WEATHER_ICON_COLORS[kind]};" viewBox="0 0 24 24">${WEATHER_ICONS[kind]}</svg>`;
}

// Compact Mod: Günün Derece Aralığı & Canlı Telemetri Pili (Option A)
function updateCompactWeatherSummary() {
  const iconEl = document.getElementById('cws-icon');
  const rangeEl = document.getElementById('cws-range');
  const telemEl = document.getElementById('cws-telemetry');
  const t = window.t || ((k) => k);
  const i18n = window.i18n;
  const setHtml = window.setHtml || ((el, h) => { if (el && el.innerHTML !== h) el.innerHTML = h; });

  if (!cachedWeather || !cachedWeather.success) {
    if (iconEl) setHtml(iconEl, weatherSvg('1', false, 18));
    setText('cws-location', t('island.weather.default_loc'));
    setText('cws-desc', t('island.weather.loading'));
    setText('cws-temp', '');
    if (rangeEl) rangeEl.style.display = 'none';
    if (telemEl) telemEl.style.display = 'none';
    return;
  }
  if (iconEl) setHtml(iconEl, weatherSvg(cachedWeather.code, cachedWeather.night, 18));
  setText('cws-location', cachedWeather.location || t('island.weather.default_loc'));
  const desc = i18n ? i18n.getWeatherDesc(cachedWeather.code, cachedWeather.desc) : (cachedWeather.desc || t('island.weather.default_desc'));
  setText('cws-desc', desc);
  setText('cws-temp', cachedWeather.temp_c ? `${cachedWeather.temp_c}°C` : '');

  // Günün Derece Aralığı
  if (rangeEl) {
    if (cachedWeather.today_max_c && cachedWeather.today_min_c) {
      setHtml(rangeEl, `<span class="arrow-up">↑</span> ${cachedWeather.today_max_c}°<span class="range-sep">·</span><span class="arrow-down">↓</span> ${cachedWeather.today_min_c}°`);
      rangeEl.style.display = 'inline-flex';
    } else if (cachedWeather.feels_c) {
      const feelsText = t('island.weather.feels_short', { temp: cachedWeather.feels_c });
      setHtml(rangeEl, `<span>${feelsText}</span>`);
      rangeEl.style.display = 'inline-flex';
    } else {
      rangeEl.style.display = 'none';
    }
  }

  // Canlı İkincil Telemetri (Option A)
  if (telemEl) {
    if (cachedWeather.humidity) {
      rangeEl.style.display = 'inline-flex';
      setHtml(telemEl, `<span>💧 %${cachedWeather.humidity}</span>`);
      telemEl.style.display = 'inline-flex';
    } else if (cachedWeather.wind_kmh) {
      const windShort = t('island.weather.wind_short', { speed: cachedWeather.wind_kmh });
      setHtml(telemEl, `<span>💨 ${windShort}</span>`);
      telemEl.style.display = 'inline-flex';
    } else {
      telemEl.style.display = 'none';
    }
  }
}

function clearWeather() {
  cachedWeather = null;
  window.cachedWeather = null;
  ['compact-temp', 'cws-location', 'cws-desc', 'cws-temp', 'cws-range', 'cws-telemetry', 'weather-location', 'weather-temp', 'weather-desc', 'tel-1', 'tel-2', 'tel-3']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  ['compact-weather-icon', 'cws-icon', 'weather-icon-container', 'weather-forecast']
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
  const rangeEl = document.getElementById('cws-range');
  if (rangeEl) rangeEl.style.display = 'none';
  const telemEl = document.getElementById('cws-telemetry');
  if (telemEl) telemEl.style.display = 'none';
}

function renderWeather(w) {
  if (!w || !w.success) return;
  cachedWeather = w;
  window.cachedWeather = w;
  const t = window.t || ((k) => k);
  const i18n = window.i18n;
  const setHtml = window.setHtml || ((el, h) => { if (el && el.innerHTML !== h) el.innerHTML = h; });

  setText('compact-temp', w.temp_c ? `${w.temp_c}°C` : '');
  const cwi = document.getElementById('compact-weather-icon');
  if (cwi) setHtml(cwi, weatherSvg(w.code, w.night, 14));

  // Kompakt ön izleme özetini daima hazır tut
  updateCompactWeatherSummary();

  const weatherDesc = i18n ? i18n.getWeatherDesc(w.code, w.desc) : (w.desc || '');
  setText('weather-location', w.location || '');
  setText('weather-temp', w.temp_c ? `${w.temp_c}°C` : '');
  setText('weather-desc', weatherDesc);
  const wic = document.getElementById('weather-icon-container');
  if (wic) setHtml(wic, weatherSvg(w.code, w.night, 52));

  const windDir = i18n ? i18n.formatWindDir(w.wind_dir) : (w.wind_dir || '');
  setText('tel-1', w.feels_c ? `${t('island.weather.feels_like', { temp: w.feels_c })} · ${t('island.weather.humidity', { hum: w.humidity || 0 })}` : '');
  setText('tel-2', w.wind_kmh ? t('island.weather.wind', { speed: w.wind_kmh, dir: windDir }) : '');
  setText('tel-3', w.pressure_mb ? `${t('island.weather.pressure', { press: w.pressure_mb })} · ${t('island.weather.uv', { uv: w.uv || 0 })}` : '');

  const fcHtml = (w.forecast || []).map(d => {
    const day = i18n ? i18n.formatDayName(d.date) : d.date;
    const dayDesc = i18n ? i18n.getWeatherDesc(d.code, d.desc) : (d.desc || '');
    const safeDesc = dayDesc.replace(/"/g, '&quot;');
    return `<div class="fc-day" title="${safeDesc}">
      <span>${day}</span>
      ${weatherSvg(d.code, false, 22)}
      <b>${d.max_c ? d.max_c + '°' : ''}</b>
      <span>${d.min_c ? d.min_c + '°' : ''}</span>
    </div>`;
  }).join('');
  const fcEl = document.getElementById('weather-forecast');
  if (fcEl) setHtml(fcEl, fcHtml);
}

async function refreshWeather() {
  try {
    const w = await invoke('get_weather');
    if (w && w.success) {
      renderWeather(w);
    }
  } catch (e) {}
}

// Dil değiştiğinde hava durumu arayüzünü anında güncelle
if (window.i18n && window.i18n.onLanguageChange) {
  window.i18n.onLanguageChange(() => {
    if (cachedWeather) {
      renderWeather(cachedWeather);
    } else {
      updateCompactWeatherSummary();
    }
  });
}

window.updateCompactWeatherSummary = updateCompactWeatherSummary;
window.clearWeather = clearWeather;
window.renderWeather = renderWeather;
window.refreshWeather = refreshWeather;
