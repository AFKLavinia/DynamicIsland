// ---------------------------------------------------------------------------
// Ses Düzeyi Modülü (iOS Tarzı Kaydırıcı & Fare Tekerleği Kontrolü)
// ---------------------------------------------------------------------------

let currentVolPercent = 70;
let isMuted = false;

async function apiChangeVolume(step) {
  try {
    await invoke('change_volume', { step });
    if (step > 0) {
      currentVolPercent = Math.min(100, currentVolPercent + 4);
      isMuted = false;
    } else if (step < 0) {
      currentVolPercent = Math.max(0, currentVolPercent - 4);
    }
    updateVolumeUI();
  } catch (e) {}
}

async function apiToggleMute() {
  try {
    await invoke('change_volume', { step: 0 });
    isMuted = !isMuted;
    updateVolumeUI();
  } catch (e) {}
}

function handleVolClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(100, Math.round((clickX / rect.width) * 100)));
  const diff = pct - currentVolPercent;
  currentVolPercent = pct;
  isMuted = (pct === 0);
  updateVolumeUI();
  const steps = Math.round(diff / 4);
  if (steps !== 0) {
    invoke('change_volume', { step: steps }).catch(() => {});
  }
}

function updateVolumeUI() {
  const fill = document.getElementById('vol-slider-fill');
  if (fill) fill.style.width = isMuted ? '0%' : `${currentVolPercent}%`;
  setDisplay('ico-vol-high', isMuted ? 'none' : 'inline-block');
  setDisplay('ico-vol-mute', isMuted ? 'inline-block' : 'none');
}

// Feature 2: Ada üzerinde fare tekerleğiyle hızlı ses kontrolü
function initWheel() {
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
  document.addEventListener('DOMContentLoaded', initWheel);
} else {
  initWheel();
}

window.apiChangeVolume = apiChangeVolume;
window.apiToggleMute = apiToggleMute;
window.handleVolClick = handleVolClick;
window.updateVolumeUI = updateVolumeUI;
