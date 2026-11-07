// ============================================================================
// Dynamic Island - Settings Weather Module
// Sorumluluk: Hava durumu verisinin çekilmesi, canlı önizleme, telemetri kartı.
// ============================================================================

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

const WEATHER_COLORS = {
    sun: '#ffd60a',
    moon: '#c7d2fe',
    partly: '#ffd60a',
    cloud: '#98989d',
    rain: '#64d2ff',
    snow: '#ffffff',
    thunder: '#ffd60a',
    fog: '#aeaeb2'
};

function weatherKind(code, night) {
    const c = parseInt(code, 10);
    if (isNaN(c)) return null;
    if ([95, 96, 99, 200, 386, 389, 392, 395].includes(c)) return 'thunder';
    if ([71, 73, 75, 77, 85, 86, 179, 182, 227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 350, 362, 365, 368, 371, 374, 377].includes(c)) return 'snow';
    if ([45, 48, 143, 248, 260].includes(c)) return 'fog';
    if (c === 0 || c === 113) return night ? 'moon' : 'sun';
    if (c === 1 || c === 2 || c === 116) return night ? 'moon' : 'partly';
    if (c === 3 || c === 119 || c === 122) return 'cloud';
    return 'rain';
}

function weatherSvg(code, night, px = 24) {
    const kind = weatherKind(code, night) || 'partly';
    return `<svg style="width:${px}px; height:${px}px; color:${WEATHER_COLORS[kind]}; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;" viewBox="0 0 24 24">${WEATHER_ICONS[kind]}</svg>`;
}

let lastSettingsWeatherData = null;

function renderSettingsPreview(w) {
    if (!w) return;
    lastSettingsWeatherData = w;
    const t = window.t || ((k) => k);
    const i18n = window.i18n;

    const locEl = document.getElementById('lp-location');
    const tempEl = document.getElementById('lp-temp');
    const descEl = document.getElementById('lp-desc');
    const iconEl = document.getElementById('lp-icon');
    const feelsEl = document.getElementById('lp-feels');
    const humEl = document.getElementById('lp-humidity');
    const rangeEl = document.getElementById('lp-range');
    const windEl = document.getElementById('lp-wind');
    const tagEl = document.getElementById('lp-mode-tag');

    if (locEl) locEl.textContent = w.location || t('settings.weather.unknown_loc');
    if (tempEl) tempEl.textContent = w.temp_c ? `${w.temp_c}°C` : '--°C';
    const weatherDesc = i18n ? i18n.getWeatherDesc(w.code, w.desc) : (w.desc || t('settings.weather.clear_desc'));
    if (descEl) descEl.textContent = weatherDesc;
    if (iconEl) iconEl.innerHTML = weatherSvg(w.code, w.night, 44);

    if (feelsEl) feelsEl.textContent = w.feels_c ? `${w.feels_c}°C` : '--°C';
    if (humEl) humEl.textContent = w.humidity ? `%${w.humidity}` : '%--';
    if (rangeEl) {
        if (w.today_max_c && w.today_min_c) {
            rangeEl.textContent = `↑ ${w.today_max_c}° · ↓ ${w.today_min_c}°`;
        } else {
            rangeEl.textContent = '--';
        }
    }
    const speedUnit = t('settings.weather.speed_unit');
    if (windEl) windEl.textContent = w.wind_kmh ? `${w.wind_kmh} ${speedUnit}` : `-- ${speedUnit}`;

    if (tagEl) {
        tagEl.textContent = w.query ? `${t('settings.weather.tag_saved')}${w.query}` : t('settings.weather.auto_tag_active');
    }

    // 3 Günlük Tahmin Mini Kartları
    const fcEl = document.getElementById('lp-forecast');
    if (fcEl && w.forecast && w.forecast.length > 0) {
        fcEl.innerHTML = w.forecast.map(d => {
            const day = i18n ? i18n.formatDayName(d.date) : d.date;
            return `<div class="fc-mini-day">
                <span>${day}</span>
                ${weatherSvg(d.code, false, 20)}
                <b>${d.max_c ? d.max_c + '°' : ''}</b>
                <span style="font-size:10px;">${d.min_c ? d.min_c + '°' : ''}</span>
            </div>`;
        }).join('');
    }
}

async function loadCurrentWeather() {
    if (!window.invoke) return;
    try {
        const w = await window.invoke('get_weather');
        if (w) {
            renderSettingsPreview(w);
        }
    } catch (e) {
        console.error('get_weather hatası:', e);
    }
}

async function refreshLiveWeather() {
    if (!window.invoke) return;
    const t = window.t || ((k) => k);
    try {
        window.showToast(t('settings.weather.toast_refreshing'), true);
        await window.loadCurrentWeather();
        window.showToast(t('settings.weather.toast_updated'), true);
    } catch (e) {
        window.showToast(t('settings.weather.toast_error') + e, false);
    }
}

async function useAutoLocation() {
    if (!window.invoke) return;
    const t = window.t || ((k) => k);
    try {
        window.showToast(t('settings.weather.toast_switching_auto'), true);
        await window.invoke('set_city', { city: '' });

        // Arayüz seçim kutularını sıfırla
        const ilInput = document.getElementById('loc-input-il');
        const ilceInput = document.getElementById('loc-input-ilce');
        const mahalleInput = document.getElementById('loc-input-mahalle');
        const summaryText = document.getElementById('loc-summary-text');
        const btnSave = document.getElementById('btn-save-inline-loc');

        if (ilInput) ilInput.value = '';
        if (ilceInput) { ilceInput.value = ''; ilceInput.disabled = true; }
        if (mahalleInput) { mahalleInput.value = ''; mahalleInput.disabled = true; }
        if (summaryText) summaryText.innerHTML = `<span>${t('settings.weather.toast_auto_enabled')}</span>`;
        if (btnSave) btnSave.disabled = true;

        setTimeout(() => window.loadCurrentWeather(), 600);
        window.showToast(t('settings.weather.toast_auto_enabled'), true);
    } catch (e) {
        window.showToast(`Hata: ${e}`, false);
    }
}

// Dil değiştiğinde hava durumu kartını yeniden render et
if (window.i18n && window.i18n.onLanguageChange) {
    window.i18n.onLanguageChange(() => {
        if (lastSettingsWeatherData) {
            renderSettingsPreview(lastSettingsWeatherData);
        }
    });
}

// Event Listeners (DOM Ready ve Tauri Events)
document.addEventListener('DOMContentLoaded', () => {
    if (window.event) {
        window.event.listen('weather-updated', (ev) => {
            if (ev.payload) {
                renderSettingsPreview(ev.payload);
            }
        });
    }
});

// Global API
window.renderSettingsPreview = renderSettingsPreview;
window.loadCurrentWeather = loadCurrentWeather;
window.refreshLiveWeather = refreshLiveWeather;
window.useAutoLocation = useAutoLocation;
