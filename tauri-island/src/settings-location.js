// ============================================================================
// Dynamic Island - Settings Location Module (Inline Searchable Hierarchy)
// Sorumluluk: Modal olmadan, kart içi 81 İl, 973 İlçe ve 80.000+ Köy/Mahalle
//             için yazarak arama ve yalnızca listeden seçilebilir filtreleme.
// ============================================================================

let PROVINCES = []; // 81 İl listesi
let CURRENT_PROVINCE = null; // Seçili ilin JSON verisi { ilceler: { ilce: [mahalleler...] } }
let VALID_ILCELER = []; // Seçili ilin geçerli ilçeleri
let VALID_MAHALLELER = []; // Seçili ilçenin geçerli mahalle ve köyleri

let selectedIl = '';
let selectedIlce = '';
let selectedMahalle = '';

// 1. 81 İl Dizinini Yükle ve İl Datalist'ini Doldur
async function initLocationPicker() {
    const ilInput = document.getElementById('loc-input-il');
    const ilDatalist = document.getElementById('loc-list-il');
    if (!ilInput || !ilDatalist) return;

    try {
        const res = await fetch('locations/provinces.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        PROVINCES = await res.json();

        ilDatalist.innerHTML = '';
        PROVINCES.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name; // Örn: Osmaniye, Adana, İstanbul
            opt.dataset.file = p.file;
            opt.dataset.plate = p.plate;
            ilDatalist.appendChild(opt);
        });

        // Event dinleyicilerini bağla
        bindLocationEvents();
    } catch (e) {
        console.error('initLocationPicker hatası:', e);
        window.showToast('İl veritabanı yüklenemedi: ' + e, false);
    }
}

// Event Dinleyicileri (Yazı desteği + sadece listedekileri seçtirme)
function bindLocationEvents() {
    const ilInput = document.getElementById('loc-input-il');
    const ilceInput = document.getElementById('loc-input-ilce');
    const mahalleInput = document.getElementById('loc-input-mahalle');

    // İl Girişi / Seçimi
    if (ilInput) {
        ilInput.addEventListener('input', () => onIlInputChanged());
        ilInput.addEventListener('change', () => onIlSelected());
        ilInput.addEventListener('focus', () => { ilInput.select(); });
    }

    // İlçe Girişi / Seçimi
    if (ilceInput) {
        ilceInput.addEventListener('input', () => onIlceInputChanged());
        ilceInput.addEventListener('change', () => onIlceSelected());
        ilceInput.addEventListener('focus', () => { ilceInput.select(); });
    }

    // Mahalle / Köy Girişi / Seçimi
    if (mahalleInput) {
        mahalleInput.addEventListener('input', () => onMahalleInputChanged());
        mahalleInput.addEventListener('change', () => onMahalleSelected());
        mahalleInput.addEventListener('focus', () => { mahalleInput.select(); });
    }
}

// --- İL SEÇİM MANTIĞI ---
function onIlInputChanged() {
    const ilInput = document.getElementById('loc-input-il');
    const val = (ilInput ? ilInput.value : '').trim();

    // Tam eşleşen il var mı kontrol et
    const matched = PROVINCES.find(p => p.name.localeCompare(val, 'tr', { sensitivity: 'accent' }) === 0);
    if (matched) {
        loadProvinceData(matched);
    } else {
        resetIlceAndMahalle(false);
    }
}

function onIlSelected() {
    const ilInput = document.getElementById('loc-input-il');
    const val = (ilInput ? ilInput.value : '').trim();
    if (!val) {
        resetIlceAndMahalle(true);
        return;
    }

    const matched = PROVINCES.find(p => p.name.localeCompare(val, 'tr', { sensitivity: 'accent' }) === 0);
    if (matched) {
        ilInput.value = matched.name;
        loadProvinceData(matched);
    } else {
        // Listede olmayan geçersiz bir şey yazıldıysa temizle
        window.showToast(`"${val}" geçerli bir il değil. Lütfen listeden seçin.`, false);
        ilInput.value = selectedIl || '';
    }
}

async function loadProvinceData(provinceObj) {
    if (selectedIl === provinceObj.name && CURRENT_PROVINCE) return;

    selectedIl = provinceObj.name;
    const ilceInput = document.getElementById('loc-input-ilce');
    const ilceDatalist = document.getElementById('loc-list-ilce');
    const badge = document.getElementById('loc-step-ilce-badge');

    resetIlceAndMahalle(true);

    if (badge) badge.textContent = 'Yükleniyor...';

    try {
        const res = await fetch(`locations/${provinceObj.file}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        CURRENT_PROVINCE = await res.json();

        VALID_ILCELER = Object.keys(CURRENT_PROVINCE.ilceler || {}).sort((a, b) => a.localeCompare(b, 'tr'));

        if (ilceDatalist) {
            ilceDatalist.innerHTML = '';
            VALID_ILCELER.forEach(ilce => {
                const opt = document.createElement('option');
                opt.value = ilce;
                ilceDatalist.appendChild(opt);
            });
        }

        if (ilceInput) {
            ilceInput.disabled = false;
            ilceInput.placeholder = `İlçe ara veya seç (${VALID_ILCELER.length} ilçe)...`;
        }

        if (badge) badge.textContent = `${VALID_ILCELER.length} İlçe`;

        updateSelectionSummary();
    } catch (e) {
        console.error('İl verisi yüklenirken hata:', e);
        if (badge) badge.textContent = 'Hata';
        window.showToast('İlçe verisi yüklenemedi: ' + e, false);
    }
}

// --- İLÇE SEÇİM MANTIĞI ---
function onIlceInputChanged() {
    const ilceInput = document.getElementById('loc-input-ilce');
    const val = (ilceInput ? ilceInput.value : '').trim();

    const matched = VALID_ILCELER.find(d => d.localeCompare(val, 'tr', { sensitivity: 'accent' }) === 0);
    if (matched) {
        loadDistrictVillages(matched);
    } else {
        resetMahalle(false);
    }
}

function onIlceSelected() {
    const ilceInput = document.getElementById('loc-input-ilce');
    const val = (ilceInput ? ilceInput.value : '').trim();
    if (!val) {
        resetMahalle(true);
        return;
    }

    const matched = VALID_ILCELER.find(d => d.localeCompare(val, 'tr', { sensitivity: 'accent' }) === 0);
    if (matched) {
        ilceInput.value = matched;
        loadDistrictVillages(matched);
    } else {
        window.showToast(`"${val}" bu ilde geçerli bir ilçe değil.`, false);
        ilceInput.value = selectedIlce || '';
    }
}

function loadDistrictVillages(districtName) {
    selectedIlce = districtName;
    const mahalleInput = document.getElementById('loc-input-mahalle');
    const mahalleDatalist = document.getElementById('loc-list-mahalle');
    const badge = document.getElementById('loc-step-mahalle-badge');

    resetMahalle(true);

    VALID_MAHALLELER = (CURRENT_PROVINCE.ilceler[districtName] || []).slice().sort((a, b) => a.localeCompare(b, 'tr'));

    if (mahalleDatalist) {
        mahalleDatalist.innerHTML = '';
        VALID_MAHALLELER.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m;
            mahalleDatalist.appendChild(opt);
        });
    }

    if (mahalleInput) {
        mahalleInput.disabled = false;
        mahalleInput.placeholder = `Köy veya mahalle ara/seç (${VALID_MAHALLELER.length} yer)...`;
    }

    if (badge) badge.textContent = `${VALID_MAHALLELER.length} Köy / Mahalle`;

    updateSelectionSummary();
}

// --- MAHALLE / KÖY SEÇİM MANTIĞI ---
function onMahalleInputChanged() {
    const mahalleInput = document.getElementById('loc-input-mahalle');
    const val = (mahalleInput ? mahalleInput.value : '').trim();

    const matched = VALID_MAHALLELER.find(m => m.localeCompare(val, 'tr', { sensitivity: 'accent' }) === 0);
    if (matched) {
        selectedMahalle = matched;
    } else {
        selectedMahalle = '';
    }
    updateSelectionSummary();
}

function onMahalleSelected() {
    const mahalleInput = document.getElementById('loc-input-mahalle');
    const val = (mahalleInput ? mahalleInput.value : '').trim();
    if (!val) {
        selectedMahalle = '';
        updateSelectionSummary();
        return;
    }

    const matched = VALID_MAHALLELER.find(m => m.localeCompare(val, 'tr', { sensitivity: 'accent' }) === 0);
    if (matched) {
        mahalleInput.value = matched;
        selectedMahalle = matched;
    } else {
        // Sadece listedekiler seçilebilir kuralı
        window.showToast(`"${val}" bu ilçenin kayıtlı köy/mahalle listesinde bulunamadı. Lütfen açılır listeden seçin.`, false);
        mahalleInput.value = selectedMahalle || '';
    }
    updateSelectionSummary();
}

// --- YARDIMCI SIFIRLAMA FONKSİYONLARI ---
function resetIlceAndMahalle(clearValues = true) {
    const ilceInput = document.getElementById('loc-input-ilce');
    const ilceDatalist = document.getElementById('loc-list-ilce');
    const badge = document.getElementById('loc-step-ilce-badge');
    const t = window.t || ((k) => k);

    VALID_ILCELER = [];
    if (clearValues) {
        selectedIlce = '';
        if (ilceInput) {
            ilceInput.value = '';
            ilceInput.disabled = true;
            ilceInput.placeholder = t('settings.weather.step2_placeholder');
        }
    }
    if (ilceDatalist) ilceDatalist.innerHTML = '';
    if (badge) badge.textContent = '--';

    resetMahalle(clearValues);
}

function resetMahalle(clearValues = true) {
    const mahalleInput = document.getElementById('loc-input-mahalle');
    const mahalleDatalist = document.getElementById('loc-list-mahalle');
    const badge = document.getElementById('loc-step-mahalle-badge');
    const t = window.t || ((k) => k);

    VALID_MAHALLELER = [];
    if (clearValues) {
        selectedMahalle = '';
        if (mahalleInput) {
            mahalleInput.value = '';
            mahalleInput.disabled = true;
            mahalleInput.placeholder = t('settings.weather.step3_placeholder');
        }
    }
    if (mahalleDatalist) mahalleDatalist.innerHTML = '';
    if (badge) badge.textContent = '--';

    updateSelectionSummary();
}

// Canlı Seçim Özeti ve Buton Durumu
function updateSelectionSummary() {
    const summaryText = document.getElementById('loc-summary-text');
    const btnSave = document.getElementById('btn-save-inline-loc');
    const t = window.t || ((k) => k);

    const parts = [];
    if (selectedMahalle) parts.push(selectedMahalle);
    if (selectedIlce) parts.push(selectedIlce);
    if (selectedIl) parts.push(selectedIl);

    if (summaryText) {
        if (parts.length > 0) {
            const locLabel = (window.i18n && window.i18n.getLanguage() === 'en') ? 'Selected Location:' : 'Seçili Konum:';
            summaryText.innerHTML = `<strong>${locLabel}</strong> <span style="color:#60cdff;">${parts.join(', ')}</span>`;
        } else {
            summaryText.innerHTML = `<span>${t('settings.weather.no_loc_selected')}</span>`;
        }
    }

    if (btnSave) {
        // En az İl ve İlçe seçilmiş olmalıdır
        btnSave.disabled = !(selectedIl && selectedIlce);
    }
}

// Seçilen Konumu Kaydet ve Uygula (Nokta Atışı)
async function saveInlineLocation() {
    if (!selectedIl || !selectedIlce) {
        window.showToast('Lütfen en azından bir il ve ilçe seçin.', false);
        return;
    }

    const btnSave = document.getElementById('btn-save-inline-loc');
    if (btnSave) btnSave.disabled = true;

    const parts = [];
    if (selectedMahalle) parts.push(selectedMahalle);
    parts.push(selectedIlce);
    parts.push(selectedIl);

    const fullLocationString = parts.join(', ');

    try {
        window.showToast(`Konum ayarlanıyor: ${fullLocationString}...`, true);
        const resultCity = await window.invoke('set_city', { city: fullLocationString });
        window.showToast(`Konum başarıyla kilitlendi: ${resultCity || fullLocationString}`, true);
        // Canlı hava durumu bilgisini anında yeniden sorgula
        if (window.loadCurrentWeather) {
            setTimeout(() => window.loadCurrentWeather(), 600);
        }
    } catch (e) {
        window.showToast(`Konum kaydedilemedi: ${e}`, false);
    } finally {
        if (btnSave) btnSave.disabled = false;
    }
}

// Global API
window.initLocationPicker = initLocationPicker;
window.saveInlineLocation = saveInlineLocation;

if (window.i18n && window.i18n.onLanguageChange) {
    window.i18n.onLanguageChange(() => {
        updateSelectionSummary();
        const ilceInput = document.getElementById('loc-input-ilce');
        const mahalleInput = document.getElementById('loc-input-mahalle');
        const t = window.t;
        if (ilceInput && ilceInput.disabled && t) {
            ilceInput.placeholder = t('settings.weather.step2_placeholder');
        }
        if (mahalleInput && mahalleInput.disabled && t) {
            mahalleInput.placeholder = t('settings.weather.step3_placeholder');
        }
    });
}
