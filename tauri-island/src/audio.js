// ---------------------------------------------------------------------------
// Ses Düzeyi Modülü (Uygulamaya Özel WASAPI Sesi & iOS Tarzı Kaydırıcı)
// Sorumluluk: Sistem master sesine müdahale etmeden, çalan aktif medya
//             uygulamasının (Spotify, Edge, Chrome, VLC vb.) sesini ve sessiz
//             durumunu milimetrik kontrol etmek.
// ---------------------------------------------------------------------------

let currentVolPercent = 70;
let isMuted = false;
let isDraggingVolume = false;

function getActiveAppFilter() {
  return window.currentMediaApp || '';
}

function syncVolumeFromBackend(vol, muted) {
  if (isDraggingVolume) return; // Kullanıcı sürüklerken araya girme
  if (typeof vol === 'number') {
    currentVolPercent = Math.max(0, Math.min(100, Math.round(vol)));
  }
  if (typeof muted === 'boolean') {
    isMuted = muted;
  }
  updateVolumeUI();
}

async function apiSetVolume(percent) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  currentVolPercent = pct;
  isMuted = (pct === 0);
  updateVolumeUI();

  try {
    const res = await invoke('set_app_volume', {
      percent: pct,
      app: getActiveAppFilter()
    });
    if (typeof res === 'number') {
      currentVolPercent = res;
      updateVolumeUI();
    }
  } catch (e) {
    console.error('set_app_volume hatası:', e);
  }
}

async function apiChangeVolume(step) {
  try {
    const res = await invoke('change_volume', {
      step,
      app: getActiveAppFilter()
    });
    if (typeof res === 'number') {
      currentVolPercent = res;
      if (step > 0) isMuted = false;
      updateVolumeUI();
    }
  } catch (e) {
    console.error('change_volume hatası:', e);
  }
}

async function apiToggleMute() {
  try {
    const res = await invoke('toggle_app_mute', {
      app: getActiveAppFilter()
    });
    if (typeof res === 'boolean') {
      isMuted = res;
    } else {
      isMuted = !isMuted;
    }
    updateVolumeUI();
  } catch (e) {
    console.error('toggle_app_mute hatası:', e);
  }
}

function calcPercentFromEvent(e, track) {
  const rect = track.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  return Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
}

function handleVolClick(e) {
  const track = e.currentTarget || document.getElementById('vol-slider-track');
  if (!track) return;
  const pct = calcPercentFromEvent(e, track);
  apiSetVolume(pct);
}

function updateVolumeUI() {
  const fill = document.getElementById('vol-slider-fill');
  if (fill) fill.style.width = isMuted ? '0%' : `${currentVolPercent}%`;
  setDisplay('ico-vol-high', isMuted ? 'none' : 'inline-block');
  setDisplay('ico-vol-mute', isMuted ? 'inline-block' : 'none');
}

// Fare sürükleme (Drag) ve Tekerlek dinleyicileri
function initVolumeInteractions() {
  const track = document.getElementById('vol-slider-track');
  if (track) {
    track.addEventListener('mousedown', (e) => {
      isDraggingVolume = true;
      const pct = calcPercentFromEvent(e, track);
      apiSetVolume(pct);

      const onMouseMove = (moveEvent) => {
        if (!isDraggingVolume) return;
        const movePct = calcPercentFromEvent(moveEvent, track);
        currentVolPercent = movePct;
        isMuted = (movePct === 0);
        updateVolumeUI();
      };

      const onMouseUp = (upEvent) => {
        if (isDraggingVolume) {
          isDraggingVolume = false;
          const finalPct = calcPercentFromEvent(upEvent, track);
          apiSetVolume(finalPct);
        }
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }

  // Ada üzerinde fare tekerleğiyle hızlı ses kontrolü
  const islandEl = document.getElementById('island');
  if (islandEl) {
    islandEl.addEventListener('wheel', (e) => {
      const mode = (typeof currentMode !== 'undefined') ? currentMode : 'bar';
      if (mode === 'expanded') {
        e.preventDefault();
        if (e.deltaY < 0) {
          apiChangeVolume(1);
        } else if (e.deltaY > 0) {
          apiChangeVolume(-1);
        }
      }
    }, { passive: false });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVolumeInteractions);
} else {
  initVolumeInteractions();
}

// Global API
window.apiSetVolume = apiSetVolume;
window.apiChangeVolume = apiChangeVolume;
window.apiToggleMute = apiToggleMute;
window.handleVolClick = handleVolClick;
window.updateVolumeUI = updateVolumeUI;
window.syncVolumeFromBackend = syncVolumeFromBackend;
