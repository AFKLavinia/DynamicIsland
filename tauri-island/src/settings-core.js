// ============================================================================
// Dynamic Island - Settings Core Module
// Sorumluluk: IPC başlatma, sekme navigasyonu, toast bildirimleri ve pencere yönetimi.
// ============================================================================

const invoke = window.__TAURI__ ? window.__TAURI__.core.invoke : null;
const event = window.__TAURI__ ? window.__TAURI__.event : null;

// Sekme Geçişi (Windows 11 Settings Sidebar)
function switchNav(tabKey, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-${tabKey}`);
    if (panel) panel.classList.add('active');
}

// Toast Bildirimi Gösterme
let toastTimer = null;
function showToast(msg, isSuccess = true) {
    const toast = document.getElementById('status-toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.className = `status-toast ${isSuccess ? 'success' : 'error'}`;
    toast.style.display = 'block';

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.style.display = 'none';
    }, 3500);
}

// Çıkış Onayı Sıfırlama
function resetExitConfirm() {
    try {
        localStorage.removeItem('skip_exit_confirm');
        const msg = window.t ? window.t('settings.island.reset_confirm_toast') : 'Kapatma onayı sıfırlandı. Artık kapatırken sorulacak.';
        showToast(msg, true);
    } catch (e) {}
}

// Dil Değiştirme Yöneticisi
function changeAppLanguage(lang) {
    if (window.setLanguage) {
        window.setLanguage(lang);
        const msg = window.t ? window.t('settings.language.toast_changed') : (lang === 'tr' ? 'Dil Türkçe olarak ayarlandı.' : 'Language set to English.');
        showToast(msg, true);
    }
}

// Global olarak erişilebilir kıl (HTML inline event handler'ları için)
window.invoke = invoke;
window.event = event;
window.switchNav = switchNav;
window.showToast = showToast;
window.resetExitConfirm = resetExitConfirm;
window.changeAppLanguage = changeAppLanguage;
