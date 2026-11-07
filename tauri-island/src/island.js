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
let collapseAnimationTimer = null;

const SIZES = {
  'bar': { w: 160, h: 10 },
  'compact': { w: 440, h: 44 },
  'expanded': { w: 520, h: 220 },
  'game-hidden': { w: 40, h: 2 }
};

// State diffing yardımcıları (Gereksiz DOM render tetiklenmelerini önler)
function setText(id, text) {
  const el = (typeof id === 'string') ? document.getElementById(id) : id;
  if (el && el.textContent !== text) el.textContent = text;
}
window.setText = setText;

function setDisplay(id, display) {
  const el = (typeof id === 'string') ? document.getElementById(id) : id;
  if (el && el.style.display !== display) el.style.display = display;
}
window.setDisplay = setDisplay;

function setHtml(idOrEl, html) {
  const el = (typeof idOrEl === 'string') ? document.getElementById(idOrEl) : idOrEl;
  if (el && el.innerHTML !== html) el.innerHTML = html;
}
window.setHtml = setHtml;

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
    if (collapseAnimationTimer) {
      clearTimeout(collapseAnimationTimer);
      collapseAnimationTimer = null;
    }
    island.classList.remove('collapsing');

    // Büyürken: OS penceresini ve CSS animasyonunu eşzamanlı genişlet
    try {
      invoke('set_island_size', { width: s.w, height: s.h });
    } catch (e) {}
    island.className = `island ${mode}`;
  } else {
    // Küçülürken: İçerikleri söndür (.collapsing) ve kapsülü daralt (360ms)
    island.className = `island ${mode} collapsing`;

    if (collapseAnimationTimer) clearTimeout(collapseAnimationTimer);
    collapseAnimationTimer = setTimeout(() => {
      if (currentMode === mode) {
        try {
          invoke('set_island_size', { width: s.w, height: s.h });
        } catch (e) {}
      }
      setTimeout(() => {
        island.classList.remove('collapsing');
      }, 50);
    }, 360);
  }
}

function switchTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const tMusic = document.getElementById('tab-music');
  const tWeather = document.getElementById('tab-weather');
  const tNotify = document.getElementById('tab-notify');
  if (tMusic) tMusic.style.display = (tab === 'music') ? 'flex' : 'none';
  if (tWeather) tWeather.style.display = (tab === 'weather') ? 'flex' : 'none';
  if (tNotify) tNotify.style.display = (tab === 'notify') ? 'flex' : 'none';
  if (tab === 'notify' && window.markAllAsRead) {
    window.markAllAsRead();
  }
}
window.switchTab = switchTab;

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
    hoverDebounceTimer = null;
  }

  // 40ms akıcı yanıt: sekmeler kapatılırken kazara açılmayı önler ama imleç gelince beklemeden açar
  hoverDebounceTimer = setTimeout(() => {
    if (inGame) {
      hoverTimeout = setTimeout(() => setMode('compact'), 1500);
    } else {
      if (currentMode === 'bar') {
        setMode('compact');
      }
    }
  }, 40);
});

island.addEventListener('mouseleave', () => {
  if (hoverDebounceTimer) {
    clearTimeout(hoverDebounceTimer);
    hoverDebounceTimer = null;
  }
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    hoverTimeout = null;
  }
  if (collapseTimeout) clearTimeout(collapseTimeout);

  const delay = (currentMode === 'expanded') ? 1000 : 650;
  collapseTimeout = setTimeout(() => {
    if (inGame) {
      setMode('game-hidden');
    } else {
      setMode('bar');
    }
  }, delay);
});

island.addEventListener('click', (e) => {
  if (e.target.closest('button') || e.target.closest('.vol-slider-track') || e.target.closest('.track-progress-bar') || e.target.closest('.exit-dialog') || e.target.closest('.notify-card')) return;
  if (collapseTimeout) clearTimeout(collapseTimeout);

  if (currentMode === 'bar') {
    setMode('compact');
  } else if (currentMode === 'compact') {
    setMode('expanded');
  } else if (currentMode === 'expanded') {
    // İnce Detay: Geniş modda içeriğin boş alanına veya sekmeler satırına tıklandığında zarifçe kompakt moda daralt
    setMode('compact');
  }
});

// İnce Detay: Escape tuşu ile anında daraltma
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (collapseTimeout) clearTimeout(collapseTimeout);
    if (currentMode === 'expanded') {
      setMode('compact');
    } else if (currentMode === 'compact') {
      setMode('bar');
    }
  }
});

// İnce Detay: Odak pencere dışına kaydığında (başka uygulamaya tıklanınca) güvenli otomatik kapanış
window.addEventListener('blur', () => {
  if (currentMode === 'expanded' && !inGame && !isCollapsing) {
    if (collapseTimeout) clearTimeout(collapseTimeout);
    collapseTimeout = setTimeout(() => {
      if (currentMode !== 'bar') setMode('bar');
    }, 350);
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
