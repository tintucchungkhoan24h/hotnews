// SEO Client Logic
// Contains Custom DatePicker and Supabase fetching for dynamic feed

const GMT7_OFFSET = 7 * 60; // 7 hours in minutes

function getGMT7Date() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const gmt7 = new Date(utc + (GMT7_OFFSET * 60000));
    gmt7.setHours(0, 0, 0, 0);
    return gmt7;
}

function createGMT7Date(year, month, day) {
    return new Date(Date.UTC(year, month, day, -7, 0, 0));
}

function parseISOtoGMT7(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return createGMT7Date(y, m - 1, d);
}

function isoToDisplay(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

function dateToIso(d) {
    if (!d) return '';
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt7 = new Date(utc + (GMT7_OFFSET * 60000));
    const y = gmt7.getFullYear();
    const m = String(gmt7.getMonth() + 1).padStart(2, '0');
    const day = String(gmt7.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const pickers = {};

function createPicker(id, onChange) {
    const inputEl = document.getElementById(id);
    const popupEl = document.getElementById(id + 'Popup');
    if (!inputEl || !popupEl) return null;

    const today = getGMT7Date();
    const picker = { 
        inputEl, popupEl, value: null, 
        viewYear: today.getFullYear(), viewMonth: today.getMonth(), 
        mode: 'day', min: null, max: null, onChange 
    };
    pickers[id] = picker;

    inputEl.addEventListener('click', (e) => { e.stopPropagation(); togglePicker(id); });
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePicker(id); });
    popupEl.addEventListener('click', (e) => e.stopPropagation());
    return picker;
}

function togglePicker(id) {
    const picker = pickers[id];
    const isOpen = picker.popupEl.classList.contains('open');
    Object.keys(pickers).forEach(k => closePicker(k));
    if (!isOpen) {
        picker.mode = 'day';
        renderPicker(id);
        picker.popupEl.classList.add('open');
    }
}

function closePicker(id) {
    if (pickers[id]) pickers[id].popupEl.classList.remove('open');
}

document.addEventListener('click', () => {
    Object.keys(pickers).forEach(k => closePicker(k));
});

function renderPicker(id) {
    const picker = pickers[id];
    const loc = langDict.datepicker || {
        months: ["1","2","3","4","5","6","7","8","9","10","11","12"],
        days: ["Mo","Tu","We","Th","Fr","Sa","Su"]
    };
    
    const { viewYear, viewMonth, value, min, max } = picker;
    const today = getGMT7Date();
    const firstDay = createGMT7Date(viewYear, viewMonth, 1);
    let startDow = firstDay.getDay(); 
    startDow = (startDow === 0) ? 6 : startDow - 1; 

    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, -7)).getDate();
    const todayIso = dateToIso(today);
    const valIso = value ? dateToIso(value) : null;
    const minIso = min ? dateToIso(min) : null;
    const maxIso = max ? dateToIso(max) : null;

    let html = '';
    if (picker.mode === 'day') {
        html += `<div class="dp-header">
            <button class="dp-nav-btn" onclick="navPicker('${id}', -1)">❮</button>
            <div class="dp-month-year" onclick="setPickerMode('${id}','month')">${loc.months[viewMonth]} ${viewYear}</div>
            <button class="dp-nav-btn" onclick="navPicker('${id}', 1)">❯</button>
        </div>
        <div class="dp-grid">`;
        loc.days.forEach(d => { html += `<div class="dp-day-name">${d}</div>`; });
        for (let i = 0; i < startDow; i++) { html += `<div class="dp-day empty"></div>`; }
        
        for (let d = 1; d <= daysInMonth; d++) {
            const currentIso = dateToIso(createGMT7Date(viewYear, viewMonth, d));
            let classes = ['dp-day'];
            if (currentIso === todayIso) classes.push('today');
            if (currentIso === valIso) classes.push('selected');
            
            let disabled = false;
            if (minIso && currentIso < minIso) disabled = true;
            if (maxIso && currentIso > maxIso) disabled = true;
            if (disabled) classes.push('disabled');

            if (disabled) {
                html += `<div class="${classes.join(' ')}">${d}</div>`;
            } else {
                html += `<div class="${classes.join(' ')}" onclick="selectDate('${id}', ${d})">${d}</div>`;
            }
        }
        html += `</div>`;
    }
    picker.popupEl.innerHTML = html;
}

function navPicker(id, dir) {
    const p = pickers[id];
    p.viewMonth += dir;
    if (p.viewMonth < 0) { p.viewMonth = 11; p.viewYear--; }
    else if (p.viewMonth > 11) { p.viewMonth = 0; p.viewYear++; }
    renderPicker(id);
}

function selectDate(id, day) {
    const p = pickers[id];
    p.value = createGMT7Date(p.viewYear, p.viewMonth, day);
    p.inputEl.value = isoToDisplay(dateToIso(p.value));
    closePicker(id);
    if (p.onChange) p.onChange(dateToIso(p.value));
}

function setPickerMode(id, mode) {
    const p = pickers[id];
    p.mode = mode;
    // For simplicity in SEO client, we only implement 'day' mode
    p.mode = 'day';
    renderPicker(id);
}

// ─── Dynamic Fetching ────────────────────────────────────────────────────────

let stateFromDate = '';
let stateToDate = '';

async function fetchDynamicFeed() {
    const mainEl = document.getElementById('digest-feed');
    const fetchBtn = document.getElementById('fetchFeedBtn');
    
    if (!stateFromDate || !stateToDate) return;
    
    // UI Loading state
    fetchBtn.disabled = true;
    fetchBtn.innerHTML = `⌛ Loading...`;
    mainEl.innerHTML = `<div class="text-center py-10 text-gray-400">Loading summaries...</div>`;

    try {
        const url = `${window.SUPABASE_URL}/rest/v1/market_summary_stock?select=*&summary_date=gte.${stateFromDate}&summary_date=lte.${stateToDate}&order=summary_date.desc`;
        const res = await fetch(url, {
            headers: {
                'apikey': window.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
            }
        });
        
        if (!res.ok) throw new Error('Failed to fetch data');
        const rows = await res.json();
        
        if (!rows || rows.length === 0) {
            mainEl.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold text-lg">No summaries found for this date range.</div>`;
            return;
        }

        let html = '';
        const currentLang = document.documentElement.lang || 'vi';
        const isRtl = currentLang === 'ar';

        for (const row of rows) {
            const articles = typeof row.articles === 'string' ? JSON.parse(row.articles) : row.articles;
            const article = articles.find(a => a.langCode === currentLang) || articles[0];
            
            if (!article) continue;

            const rDate = row.summary_date;
            
            html += `
            <article class="mb-12" ${isRtl ? 'dir="rtl"' : ''}>
                <h1 class="text-2xl md:text-3xl font-black text-fin-gold leading-tight mb-4">
                  ${article.title}
                </h1>
                <div class="text-gray-500 text-xs font-bold uppercase tracking-widest mb-5">
                  📅 ${rDate} &nbsp;·&nbsp; ${article.langEmoji || ''} ${article.langName || currentLang.toUpperCase()} &nbsp;·&nbsp; ${window.SITE_NAME}
                </div>
                <div class="digest-lead" ${isRtl ? 'style="border-left: none; border-right: 4px solid #ffd700; border-radius: 12px 0 0 12px;"' : ''}>${article.lead}</div>
                <div class="digest-body">${article.content || ''}</div>
            </article>
            <hr class="border-gray-800 my-8">
            `;
        }

        mainEl.innerHTML = html;

    } catch (e) {
        console.error(e);
        mainEl.innerHTML = `<div class="text-center py-10 text-red-400 font-bold text-lg">Error loading summaries.</div>`;
    } finally {
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = `Làm mới dữ liệu`; // Fallback text, ideally localized
    }
}

// ─── Initialization ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Default range (last 7 days matches static output)
    const today = getGMT7Date();
    const past7 = new Date(today);
    past7.setDate(today.getDate() - 6);
    
    stateFromDate = dateToIso(past7);
    stateToDate = dateToIso(today);

    // Init pickers
    const pFrom = createPicker('seoFromDate', (iso) => {
        stateFromDate = iso;
        if (pickers['seoToDate']) {
            pickers['seoToDate'].min = parseISOtoGMT7(iso);
        }
    });
    
    const pTo = createPicker('seoToDate', (iso) => {
        stateToDate = iso;
        if (pickers['seoFromDate']) {
            pickers['seoFromDate'].max = parseISOtoGMT7(iso);
        }
    });

    if (pFrom) {
        pFrom.value = past7;
        pFrom.inputEl.value = isoToDisplay(stateFromDate);
    }
    if (pTo) {
        pTo.value = today;
        pTo.inputEl.value = isoToDisplay(stateToDate);
        pTo.min = past7;
    }

    const fetchBtn = document.getElementById('fetchFeedBtn');
    if (fetchBtn) {
        fetchBtn.addEventListener('click', fetchDynamicFeed);
    }
});
