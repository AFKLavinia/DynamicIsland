// ---------------------------------------------------------------------------
// Medya ve Müzik Çalar Modülü (GSMTC / MPRIS, Kapak ve Rozet Yönetimi)
// ---------------------------------------------------------------------------

let lastCover = null;
let currentTrackKey = '';
let currentHasMusic = false;
window.currentHasMusic = false;
let currentSpotifyAvailable = false;

let currentPosSecs = 0;
let currentDurSecs = 0;
let isPlaying = false;

function setImg(img, src) {
  if (!img) return;
  if (src && src.trim().length > 0) {
    if (img.src !== src) {
      img.src = src;
      img.onerror = () => {
        img.style.display = 'none';
      };
    }
    img.style.display = 'block';
  } else {
    img.removeAttribute('src');
    img.style.display = 'none';
  }
}

function openSpotify(e) {
  if (e) e.stopPropagation();
  invoke('open_spotify');
}

function openWebMusic(e) {
  if (e) e.stopPropagation();
  invoke('open_web_music', { url: 'https://music.youtube.com' });
}

function apiPlayPause() {
  if (!currentHasMusic) {
    openSpotify();
    return;
  }
  invoke('media_play_pause');
}
function apiNext() { invoke('media_next'); }
function apiPrev() { invoke('media_prev'); }

function formatTime(s) {
  if (isNaN(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}

function updateProgressUI() {
  const curEl = document.getElementById('track-time-cur');
  const totEl = document.getElementById('track-time-total');
  const fillEl = document.getElementById('track-progress-fill');
  if (!curEl || !totEl || !fillEl) return;

  if (currentDurSecs > 0) {
    curEl.textContent = formatTime(currentPosSecs);
    totEl.textContent = formatTime(currentDurSecs);
    const pct = Math.min(100, Math.max(0, (currentPosSecs / currentDurSecs) * 100));
    fillEl.style.width = `${pct}%`;
  } else {
    curEl.textContent = formatTime(currentPosSecs);
    totEl.textContent = '--:--';
    fillEl.style.width = '0%';
  }
}

// Parça oynatılıyorsa her saniye ilerleme çubuğunu akıcı artır
setInterval(() => {
  if (isPlaying && currentDurSecs > 0 && currentPosSecs < currentDurSecs) {
    currentPosSecs += 1;
    updateProgressUI();
  }
}, 1000);

// Feature 3: Kaynak Platform Rozeti Tespiti
function detectSource(app, title) {
  const a = (app || '').toLowerCase();
  const t = (title || '').toLowerCase();
  if (a.includes('spotify') || t.includes('spotify')) {
    return {
      name: 'Spotify',
      color: '#1db954',
      bg: 'rgba(29, 185, 84, 0.15)',
      svg: '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.306c-.216.353-.674.468-1.026.253-2.812-1.718-6.351-2.106-10.521-1.152-.403.093-.807-.16-.899-.564-.092-.404.161-.807.564-.899 4.568-1.044 8.487-.601 11.628 1.336.353.216.469.674.254 1.026zm1.468-3.262c-.272.443-.852.584-1.295.312-3.22-1.979-8.129-2.55-11.938-1.393-.497.151-1.028-.135-1.179-.633-.151-.498.136-1.028.634-1.179 4.354-1.321 9.774-.683 13.466 1.597.443.273.585.853.312 1.296zm.126-3.4c-3.861-2.293-10.229-2.505-13.896-1.391-.593.18-1.222-.16-1.402-.753-.18-.593.16-1.222.753-1.402 4.218-1.28 11.248-1.036 15.688 1.6c.534.316.708 1.01.392 1.544-.316.534-1.01.708-1.544.392z"/></svg>'
    };
  }
  if (t.includes('youtube') || a.includes('youtube')) {
    return {
      name: 'YouTube',
      color: '#ff3b30',
      bg: 'rgba(255, 59, 48, 0.15)',
      svg: '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
    };
  }
  if (a.includes('chrome') || a.includes('edge') || a.includes('brave') || a.includes('firefox') || a.includes('opera')) {
    return {
      name: window.t ? window.t('island.music.browser') : 'Tarayıcı',
      color: '#64d2ff',
      bg: 'rgba(100, 210, 255, 0.15)',
      svg: '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>'
    };
  }
  if (a.includes('vlc')) {
    return {
      name: 'VLC',
      color: '#ff9500',
      bg: 'rgba(255, 149, 0, 0.15)',
      svg: '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:currentColor;"><path d="M12 2L3 19h18L12 2zm0 4.5l5.5 10.5h-11L12 6.5z"/></svg>'
    };
  }
  return {
    name: window.t ? window.t('island.music.system_media') : 'Sistem Medyası',
    color: '#8e8e93',
    bg: 'rgba(142, 142, 147, 0.15)',
    svg: '<svg viewBox="0 0 24 24" style="width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:2;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
  };
}

async function checkMusic() {
  try {
    const m = await invoke('check_music');
    // Müzik oturumu var kabul edilmesi için:
    // 1) has_music true olmalı
    // 2) Şarkı başlığı boş veya sadece boşluk olmamalı
    const hasValidTitle = !!(m && m.title && m.title.trim().length > 0);
    const hasActiveSession = !!(m && m.has_music && hasValidTitle);
    currentHasMusic = hasActiveSession;
    window.currentHasMusic = hasActiveSession;
    isPlaying = !!(m && m.playing);
    currentSpotifyAvailable = !!(m && m.spotify_available);
    window.currentMediaApp = (m && m.app) ? m.app : '';

    if (m && typeof m.volume === 'number' && window.syncVolumeFromBackend) {
      window.syncVolumeFromBackend(m.volume, m.muted);
    }

    // 1. Kompakt Ön İzleme Yönetimi (Fareyle üzerine gelindiğinde)
    if (currentHasMusic) {
      setDisplay('compact-music-box', 'flex');
      setDisplay('compact-weather-box', 'none');
      const compactTitle = [m.artist, m.title].filter(Boolean).join(' - ');
      setText('compact-title', compactTitle);
      const ctEl = document.getElementById('compact-title');
      if (ctEl && ctEl.title !== compactTitle) ctEl.title = compactTitle;
    } else {
      setDisplay('compact-music-box', 'none');
      setDisplay('compact-weather-box', 'flex');
      if (typeof updateCompactWeatherSummary === 'function') {
        updateCompactWeatherSummary();
      }
    }

    // 2. Genişletilmiş Müzik Paneli Yönetimi
    const wrapper = document.getElementById('music-cover-wrapper');
    const img = document.getElementById('music-cover-img');
    const fallbackIcon = document.getElementById('music-fallback-icon');
    const glow = document.getElementById('expanded-ambient-glow');
    const badgeEl = document.getElementById('music-source-badge');
    const badgeIcon = document.getElementById('source-badge-icon');
    const badgeName = document.getElementById('source-badge-name');
    const vis = document.getElementById('music-visualizer');
    const progRow = document.getElementById('track-progress-row');
    const volRow = document.getElementById('volume-row');

    if (currentHasMusic) {
      if (wrapper) {
        wrapper.style.visibility = 'visible';
        wrapper.style.cursor = 'default';
      }
      setDisplay('spotify-logo-icon', 'none');
      setDisplay('launcher-row', 'none');
      setDisplay('music-ctrl-row', 'flex');
      if (progRow) progRow.style.display = 'flex';
      if (volRow) volRow.style.display = 'inline-flex';

      // Feature 3: Platform Rozeti (Badge)
      const badge = detectSource(m.app, m.title);
      if (badgeEl && badgeIcon && badgeName) {
        if (badgeEl.dataset.name !== badge.name) {
          badgeEl.dataset.name = badge.name;
          badgeEl.style.color = badge.color;
          badgeEl.style.background = badge.bg;
          if (window.setHtml) {
            window.setHtml(badgeIcon, badge.svg);
          } else {
            badgeIcon.innerHTML = badge.svg;
          }
          badgeName.textContent = badge.name;
        }
        badgeEl.style.display = 'inline-flex';
      }

      setText('music-title', m.title || '');
      const mtEl = document.getElementById('music-title');
      if (mtEl && mtEl.title !== (m.title || '')) mtEl.title = m.title || '';

      const cleanArtist = (m.artist && m.artist.trim().length > 0) ? m.artist.trim() : (badge.name || '');
      setText('music-artist', cleanArtist);
      const maEl = document.getElementById('music-artist');
      if (maEl && maEl.title !== cleanArtist) maEl.title = cleanArtist;

      if (m.cover_changed) {
        const cover = m.cover_url || '';
        lastCover = cover;
        const compactCover = document.getElementById('compact-cover');
        if (cover) {
          if (wrapper) wrapper.style.display = 'flex';
          setImg(compactCover, cover);
          setImg(img, cover);
          if (fallbackIcon) fallbackIcon.style.display = 'none';
        } else {
          setImg(compactCover, '');
          setImg(img, '');
          if (fallbackIcon) fallbackIcon.style.display = 'flex';
          if (wrapper) wrapper.style.display = 'flex';
        }

        // Feature 1: Ambient Dynamic Glow Arka Plan
        if (glow) {
          if (cover) {
            glow.style.backgroundImage = `url("${cover}")`;
            glow.style.opacity = '0.38';
          } else {
            glow.style.opacity = '0';
          }
        }
      }

      // Feature 5: Canlı Audio Spectrum / Visualizer (8 Bar)
      if (vis) {
        vis.style.display = 'inline-flex';
        if (m.playing) {
          vis.classList.add('playing');
        } else {
          vis.classList.remove('playing');
        }
        if (vis.dataset.color !== badge.color) {
          vis.dataset.color = badge.color;
          const visBars = vis.querySelectorAll('span');
          visBars.forEach(b => b.style.background = badge.color);
        }
      }

      // Feature 4: Zaman Çizelgesi (Track Timeline Progress) & Drift Düzeltme
      isPlaying = !!m.playing;
      const trackKey = `${m.app || ''}:${m.artist || ''}:${m.title || ''}`;
      const trackChanged = (trackKey !== currentTrackKey);

      if (trackChanged) {
        currentTrackKey = trackKey;
        currentPosSecs = m.position_secs || 0;
        currentDurSecs = m.duration_secs || 0;
        updateProgressUI();
      } else {
        currentDurSecs = m.duration_secs || 0;
        if (isPlaying) {
          // Canlı çalarken: Sadece kullanıcı seek yaptığında (>2sn sapma) eşitle, 1s yerel sayaç kesintisiz aksın
          const drift = Math.abs(currentPosSecs - (m.position_secs || 0));
          if (drift > 2) {
            currentPosSecs = m.position_secs || 0;
            updateProgressUI();
          }
        } else {
          currentPosSecs = m.position_secs || 0;
          updateProgressUI();
        }
      }

      setDisplay('ico-play', m.playing ? 'none' : 'inline-block');
      setDisplay('ico-pause', m.playing ? 'inline-block' : 'none');
    } else {
      lastCover = null;
      setImg(document.getElementById('compact-cover'), '', null);
      setImg(img, '', null);
      isPlaying = false;
      currentPosSecs = 0;
      currentDurSecs = 0;

      if (glow) glow.style.opacity = '0';
      if (vis) vis.style.display = 'none';
      if (progRow) progRow.style.display = 'none';

      // Master Ses Ayarı her zaman erişilebilir kalır
      if (volRow) volRow.style.display = 'inline-flex';

      // Dinlemeye hazır rozet göstergesi
      if (badgeEl && badgeIcon && badgeName) {
        badgeEl.style.color = '#30d158';
        badgeEl.style.background = 'rgba(48, 209, 88, 0.14)';
        badgeIcon.innerHTML = '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#30d158; box-shadow:0 0 6px #30d158;"></span>';
        badgeName.textContent = window.t ? window.t('island.music.ready_badge') : 'Dinlemeye Hazır';
        badgeEl.style.display = 'inline-flex';
      }

      if (wrapper) {
        wrapper.style.visibility = 'visible';
        wrapper.style.cursor = 'pointer';
      }
      setDisplay('music-cover-img', 'none');
      setDisplay('music-fallback-icon', 'none');
      setDisplay('spotify-logo-icon', 'flex');

      if (hasValidTitle) {
        setText('music-title', m.title);
        const pausedLabel = window.t ? window.t('island.music.paused') : 'Duraklatıldı';
        setText('music-artist', [m.artist, pausedLabel].filter(Boolean).join(' · '));
      } else {
        setText('music-title', window.t ? window.t('island.music.idle_title') : 'Müzik Dinlemeye Başla');
        setText('music-artist', window.t ? window.t('island.music.idle_sub') : 'Klavyeden Oynat tuşuna veya başlatıcılara basın');
      }

      // Hızlı Medya Başlatıcı Hub
      setDisplay('launcher-row', 'flex');

      // Oynatıcı kontrolleri ve hazır durumu
      setDisplay('music-ctrl-row', 'flex');
      setDisplay('ico-play', 'inline-block');
      setDisplay('ico-pause', 'none');
    }
  } catch (e) {}
}

// Dil değiştiğinde müzik arayüzünü anında güncelle
if (window.i18n && window.i18n.onLanguageChange) {
  window.i18n.onLanguageChange(() => {
    checkMusic();
  });
}

window.checkMusic = checkMusic;
window.openSpotify = openSpotify;
window.openWebMusic = openWebMusic;
window.apiPlayPause = apiPlayPause;
window.apiNext = apiNext;
window.apiPrev = apiPrev;
