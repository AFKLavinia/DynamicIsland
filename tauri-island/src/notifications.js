// ============================================================================
// Dynamic Island - Bildirim Modülü (Windows 11 Fluent Bildirim Merkezi)
// Sorumluluk: Sistem ve uygulama bildirimlerini toplamak, ada içi
//             bildirim sekmesinde göstermek, okundu/silme yönetimi.
// ============================================================================

let NOTIFICATIONS = [];
let nextNotificationId = 1;

function getUnreadCount() {
  return NOTIFICATIONS.filter(n => n.unread).length;
}

function updateNotificationUI() {
  const count = getUnreadCount();
  const totalCountEl = document.getElementById('notify-total-count');
  const badgeEl = document.getElementById('notify-unread-badge');

  if (totalCountEl) totalCountEl.textContent = NOTIFICATIONS.length;

  if (badgeEl) {
    if (count > 0) {
      badgeEl.textContent = count;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }

  renderNotificationList();
}

function renderNotificationList() {
  const container = document.getElementById('notify-list-container');
  if (!container) return;
  const t = window.t || ((k) => k);
  const setHtml = window.setHtml || ((el, h) => { if (el && el.innerHTML !== h) el.innerHTML = h; });

  if (NOTIFICATIONS.length === 0) {
    setHtml(container, `
      <div class="notify-empty-state">
        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        <p>${t('island.notify.empty')}</p>
        <span>${t('island.notify.empty_sub')}</span>
      </div>
    `);
    return;
  }

  const listHtml = NOTIFICATIONS.map(n => `
    <div class="notify-card ${n.unread ? 'unread' : ''}" data-id="${n.id}">
      <div class="notify-card-icon ${n.type || 'system'}">
        ${getNotificationIconSvg(n.type)}
      </div>
      <div class="notify-card-content">
        <div class="notify-card-header">
          <span class="notify-app-name">${n.app}</span>
          <span class="notify-time">${n.time}</span>
        </div>
        <div class="notify-title">${n.title}</div>
        <div class="notify-body">${n.body}</div>
      </div>
      <button class="notify-dismiss-btn" onclick="dismissNotification(${n.id}, event)" title="Kapat">
        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
  `).join('');
  setHtml(container, listHtml);
}

function getNotificationIconSvg(type) {
  switch (type) {
    case 'weather':
      return '<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>';
    case 'media':
      return '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
    case 'battery':
      return '<svg viewBox="0 0 24 24"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"></rect><line x1="23" y1="13" x2="23" y2="11"></line></svg>';
    default:
      return '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>';
  }
}

function pushNotification(notif) {
  const newNotif = {
    id: nextNotificationId++,
    app: notif.app || 'Uygulama',
    title: notif.title || 'Yeni Bildirim',
    body: notif.body || '',
    time: 'Az önce',
    type: notif.type || 'system',
    unread: true
  };

  NOTIFICATIONS.unshift(newNotif);
  if (NOTIFICATIONS.length > 20) {
    NOTIFICATIONS.pop();
  }

  updateNotificationUI();
}

function dismissNotification(id, e) {
  if (e) e.stopPropagation();
  NOTIFICATIONS = NOTIFICATIONS.filter(n => n.id !== id);
  updateNotificationUI();
}

function clearAllNotifications() {
  NOTIFICATIONS = [];
  updateNotificationUI();
}

function markAllAsRead() {
  NOTIFICATIONS.forEach(n => n.unread = false);
  updateNotificationUI();
}

// Pil telemetrisi (kritik düşük seviyede uyarı)
if (navigator.getBattery) {
  navigator.getBattery().then(battery => {
    function checkBattery() {
      if (battery.level <= 0.15 && !battery.charging) {
        pushNotification({
          app: 'Pil',
          title: 'Düşük Pil',
          body: `Pil seviyesi %${Math.round(battery.level * 100)}.`,
          type: 'battery'
        });
      }
    }
    battery.addEventListener('levelchange', checkBattery);
  }).catch(() => {});
}

// DOM Hazır olduğunda başlat
document.addEventListener('DOMContentLoaded', () => {
  updateNotificationUI();
});

// Global API
window.pushNotification = pushNotification;
window.dismissNotification = dismissNotification;
window.clearAllNotifications = clearAllNotifications;
window.markAllAsRead = markAllAsRead;
window.updateNotificationUI = updateNotificationUI;
