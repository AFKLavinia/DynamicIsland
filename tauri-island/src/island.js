// ---------------------------------------------------------------------------
// Dynamic Island Çekirdek Modülü (Geometri, Mod Değişimi & Olay Dinleyicileri)
// ---------------------------------------------------------------------------

const invoke = (window.__TAURI__ && window.__TAURI__.core) ? window.__TAURI__.core.invoke : window.__TAURI__?.invoke;
window.invoke = invoke;

const island = document.getElementById('island');
let currentMode = 'bar';
let inGame = false;
let hoverTimeout = null;
let collapseTimeout = null;

const SIZES = {
  'bar': { w: 140, h: 6 },
  'compact': { w: 440, h: 44 },
  'expanded': { w: 520, h: 220 },
  'game-hidden': { w: 40, h: 2 }
};

// State diffing yardımcıları (Gereksiz DOM render tetiklenmelerini önler)
function setText(id, text) {
  const el = document.getElementById(id);
  if (el && el.textContent !== text) el.textContent = text;
}
window.setText = setText;

function setDisplay(id, display) {
  const el = document.getElementById(id);
  if (el && el.style.display !== display) el.style.display = display;
}
window.setDisplay = setDisplay;

async function setMode(mode) {
  if (currentMode === mode) return;
  const oldMode = currentMode;
  currentMode = mode;
  window.currentMode = mode;

  const s = SIZES[mode] || SIZES['bar'];
  const oldSize = SIZES[oldMode] || SIZES['bar'];

  // Boyut Büyüyor mu? (Örn: bar -> compact, compact -> expanded)
  const isExpanding = (s.w > oldSize.w) || (s.h > oldSize.h);

  if (isExpanding) {
    // Büyürken: Önce OS penceresini genişlet, 2 rAF ile DirectComposition tamponunun senkronize olmasını bekle (siyah/beyaz flaş yok)
    try {
      await invoke('set_island_size', { width: s.w, height: s.h });
    } catch (e) {}
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (currentMode === mode) {
          island.className = `island ${mode}`;
        }
      });
    });
  } else {
    // Küçülürken: Önce CSS animasyonunu küçült (380ms), ardından pencereyi daralt (176px ani kırpılma yok!)
    island.className = `island ${mode}`;
    setTimeout(async () => {
      if (currentMode === mode) {
        try {
          await invoke('set_island_size', { width: s.w, height: s.h });
        } catch (e) {}
      }
    }, 380);
  }
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('tab-music').style.display = (tab === 'music') ? 'flex' : 'none';
  document.getElementById('tab-weather').style.display = (tab === 'weather') ? 'flex' : 'none';
}

function openSettingsWindow() {
  invoke('open_settings_window');
}

function handleExitClick(e) {
  if (e) e.stopPropagation();
  const skip = localStorage.getItem('skip_exit_confirm');
  if (skip === 'true') {
    invoke('exit_app');
    return;
  }
  const modal = document.getElementById('exit-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function cancelExit(e) {
  if (e) e.stopPropagation();
  const modal = document.getElementById('exit-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function confirmExit(e) {
  if (e) e.stopPropagation();
  const checkbox = document.getElementById('dont-ask-exit');
  if (checkbox && checkbox.checked) {
    localStorage.setItem('skip_exit_confirm', 'true');
  }
  invoke('exit_app');
}

window.handleExitClick = handleExitClick;
window.cancelExit = cancelExit;
window.confirmExit = confirmExit;

// ---------------------------------------------------------------------------
// Ada Fare Etkileşimleri
// ---------------------------------------------------------------------------

let hoverDebounceTimer = null;

island.addEventListener('mouseenter', () => {
  if (collapseTimeout) {
    clearTimeout(collapseTimeout);
    collapseTimeout = null;
  }
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer);
  }

  // 90ms hover-intent: tarayıcı sekmelerini kapatırken yanlışlıkla tetiklenmeyi önler
  hoverDebounceTimer = setTimeout(() => {
    if (inGame) {
      hoverTimeout = setTimeout(() => setMode('compact'), 2500);
    } else {
      if (currentMode === 'bar') {
        setMode('compact');
      }
    }
  }, 90);
});

island.addEventListener('mouseleave', () => {
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer);
    hoverDebounceTimer = null;
  }
  clearTimeout(hoverTimeout);
  if (collapseTimeout) clearTimeout(collapseTimeout);

  const delay = (currentMode === 'expanded') ? 1200 : 800;
  collapseTimeout = setTimeout(() => {
    if (inGame) {
      setMode('game-hidden');
    } else {
      setMode('bar');
    }
  }, delay);
});

island.addEventListener('click', (e) => {
  if (e.target.closest('button') || e.target.closest('.vol-slider-track') || e.target.closest('.track-progress-bar') || e.target.closest('.exit-dialog')) return;
  if (collapseTimeout) clearTimeout(collapseTimeout);

  if (currentMode === 'bar') {
    setMode('compact');
  } else if (currentMode === 'compact') {
    setMode('expanded');
  }
});

// ---------------------------------------------------------------------------
// Oyun Modu Tespiti
// ---------------------------------------------------------------------------

async function checkGameMode() {
  try {
    const g = await invoke('check_game_mode');
    if (g.in_game && !inGame) {
      inGame = true;
      setMode('game-hidden');
    } else if (!g.in_game && inGame) {
      inGame = false;
      setMode('bar');
    }
  } catch (e) {}
}

// ---------------------------------------------------------------------------
// Tauri Olay Dinleyicileri
// ---------------------------------------------------------------------------

// Otonom arka plan hava durumu yayınını dinle
window.__TAURI__.event.listen('weather-updated', (event) => {
  if (event.payload && event.payload.success) {
    renderWeather(event.payload);
  }
});

// Ayarlardan konum değişince anında yenile
window.__TAURI__.event.listen('weather-refresh', async () => {
  clearWeather();
  try {
    const w = await invoke('get_weather');
    if (w.success) renderWeather(w);
  } catch (e) {}
});

// ---------------------------------------------------------------------------
// Periyodik Polling & Başlangıç Tetiklemeleri
// ---------------------------------------------------------------------------

function initBootstrap() {
  // İlk tetiklemeler
  if (typeof checkMusic === 'function') checkMusic();
  if (typeof refreshWeather === 'function') refreshWeather();
  if (typeof checkGameMode === 'function') checkGameMode();

  // Güvenli periyodik döngüler (hata fırlatmaz)
  setInterval(() => {
    if (typeof checkMusic === 'function') checkMusic();
  }, 1500);

  setInterval(() => {
    if (typeof checkGameMode === 'function') checkGameMode();
  }, 3000);

  setInterval(() => {
    if (typeof refreshWeather === 'function') {
      const w = window.cachedWeather;
      if (!w || !w.success) {
        refreshWeather();
      }
    }
  }, 2500);
}

// Tüm modül scriptleri yüklendikten sonra güvenle başlat
if (document.readyState === 'complete') {
  initBootstrap();
} else {
  window.addEventListener('load', initBootstrap);
}
