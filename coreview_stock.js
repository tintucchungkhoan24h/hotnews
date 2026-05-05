// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW STOCK - Data Fetching & Table Logic
// ═══════════════════════════════════════════════════════════════════════════

// ─── Data Fetching ─────────────────────────────────────────────────────────

async function fetchData() {
    document.getElementById('loadingState').classList.remove('hidden');
    const start = state.currentPage * state.pageSize;
    const end = start + state.pageSize - 1;
    
    let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${state.fromDate}T00:00:00Z&publish_time=lte.${state.toDate}T23:59:59Z`;
    
    // Handle multiple stock codes separated by comma
    if (state.searchQuery) {
        const stockCodes = state.searchQuery.split(',').map(s => s.trim()).filter(s => s);
        if (stockCodes.length === 1) {
            url += `&single_stock=ilike.*${stockCodes[0]}*`;
        } else if (stockCodes.length > 1) {
            const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
            url += `&or=(${orConditions})`;
        }
    }
    
    const nullsOrder = state.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
    url += `&order=${getDbField(state.sortCol)}.${state.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

    try {
        const res = await fetch(url, {
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Range': `${start}-${end}`, 'Prefer': 'count=exact' }
        });

        const json = await res.json();

        // Supabase returns an error object (not an array) on failure
        if (!Array.isArray(json)) {
            console.error('Supabase error:', json);
            state.data = [];
            state.totalCount = 0;
        } else {
            state.data = json;
            // For %Chg column, re-sort client-side treating NULL as 0
            // so NULLs appear between positives and negatives, not at extremes
            if (state.sortCol === 'price_change_today_pct') {
                const dir = state.sortDesc ? -1 : 1;
                state.data.sort((a, b) => {
                    const av = a.price_change_today_pct ?? 0;
                    const bv = b.price_change_today_pct ?? 0;
                    return dir * (bv - av);
                });
            }
            const contentRange = res.headers.get('content-range');
            if (contentRange) {
                const match = contentRange.match(/\/(\d+)$/);
                if (match) state.totalCount = parseInt(match[1]);
            } else {
                state.totalCount = state.data.length;
            }
            // Preload translations in background
            translateNames(state.data.map(d => d.organ_name));
            translateHeadlines(state.data.map(d => d.headline));
        }
    } catch (e) { 
        console.error('fetchData error:', e);
        state.data = [];
        state.totalCount = 0;
    } finally {
        document.getElementById('loadingState').classList.add('hidden');
        renderBody();
        renderPaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderHeaders() {
    const cols = [
        { id: 'index',                 w: 'w-12 text-center', s: false },
        { id: 'publish_time',          w: 'w-32',  s: true },
        { id: 'single_stock',          w: 'w-24',  s: true },
        { id: 'price_change_today_pct',w: 'w-24',  s: true },
        { id: 'ma15',                  w: 'w-28',  s: true, dbField: 'pct_ma15' },
        { id: 'organ_name',            w: 'w-64',  s: true },
        { id: 'industry',              w: 'w-40',  s: true },
        { id: 'current_close',         w: 'w-24',  s: true },
        { id: 'current_volume',        w: 'w-32',  s: true },
        { id: 'headline',              w: 'w-auto', s: false }
    ];
    document.getElementById('tableHeader').innerHTML = cols.map(c => `
        <th class="px-4 py-4 ${c.s ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.s ? getSortClass(c.id) : ''}" 
            ${c.s ? `onclick="handleSort('${c.id}')"` : ''}>
            <div class="flex items-center">
                <span>${i18n[state.lang].cols[c.id]}</span>
                ${c.s ? '<span class="sort-icon"></span>' : ''}
            </div>
        </th>
    `).join('');
}

// Map display column id → actual database field name (language-aware)
function getDbField(colId) {
    if (colId === 'ma15')     return 'pct_ma15';
    if (colId === 'industry') return state.lang === 'en' ? 'industry_en' : 'industry_vn';
    return colId;
}

function getSortClass(id) { 
    if (state.sortCol === id) {
        return state.sortDesc ? 'sorted-desc' : 'sorted-asc';
    }
    return 'unsorted';
}

function handleSort(id) {
    if (state.sortCol === id) {
        // Same column clicked
        if (!state.sortDesc) {
            // Currently ASC → go to DESC
            state.sortDesc = true;
        } else {
            // Currently DESC → return to default (timesfm_point DESC)
            state.sortCol = 'timesfm_point';
            state.sortDesc = true;
        }
    } else {
        // Different column clicked, start with ASC
        state.sortCol = id;
        state.sortDesc = false;
    }
    state.currentPage = 0; 
    renderHeaders(); 
    fetchData();
}

// Format date as dd/mm hh:mm
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

// Get MA15 status and color based on pct_ma15 value
function getMA15Status(pctMa15) {
    // Using plain Unicode arrows (not emoji) so CSS color works perfectly
    if (pctMa15 === null || pctMa15 === undefined) {
        return { key: 'N/A', icon: '—', label: 'N/A', style: 'color:#6b7280;', bold: false };
    }
    if (pctMa15 > 5) {
        // Super-green
        return { key: '⏫ MA15', icon: '⏫', label: 'MA15', style: 'color:#00c853;', bold: true };
    } else if (pctMa15 > 1) {
        // Green
        return { key: '⬆️ MA15', icon: '⬆️', label: 'MA15', style: 'color:#00e676;', bold: false };
    } else if (pctMa15 > -1) {
        // White
        return { key: '↔️ MA15', icon: '↔', label: 'MA15', style: 'color:#ffffff;', bold: false };
    } else if (pctMa15 > -5) {
        // Red
        return { key: '⬇️ MA15', icon: '⬇️', label: 'MA15', style: 'color:#ff6b6b;', bold: false };
    } else {
        // Super-red
        return { key: '⏬ MA15', icon: '⏬', label: 'MA15', style: 'color:#ff1744;', bold: true };
    }
}

function renderBody() {
    const tbody = document.getElementById('tableBody');
    if (state.data.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('emptyState').innerText = i18n[state.lang].empty;
        return;
    }
    document.getElementById('emptyState').classList.add('hidden');
    
    tbody.innerHTML = state.data.map((row, idx) => {
        const name = state.lang === 'vn' ? row.organ_name : (state.translatedNames[row.organ_name] || row.organ_name);
        const industry = state.lang === 'vn' ? row.industry_vn : (row.industry_en || row.industry_vn);
        const headline = state.lang === 'vn' ? row.headline : (state.translatedHeadlines[row.headline] || row.headline);
        const pct = row.price_change_today_pct || 0;
        const color = pct > 0 ? 'text-fin-green' : (pct < 0 ? 'text-fin-red' : 'text-gray-400');
        
        // Get MA15 status
        const ma15Status = getMA15Status(row.pct_ma15);
        const ma15Tooltip = i18n[state.lang].ma15Tooltip[ma15Status.key];
        const ma15Bold = ma15Status.bold ? 'font-bold' : '';
        const ma15SvgIcons = {
            '⏫ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8-8 8 8H4z"/><path d="M4 11l8-8 8 8H4z"/></svg>`,
            '⬆️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15l8-8 8 8H4z"/></svg>`,
            '↔️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 12l-4-4v3H3v2h1v3l4-4zm8 0l4 4v-3h1v-2h-1V8l-4 4z"/></svg>`,
            '⬇️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9l-8 8-8-8h16z"/></svg>`,
            '⏬ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6l-8 8-8-8h16z"/><path d="M20 13l-8 8-8-8h16z"/></svg>`,
        };
        const ma15Cell = ma15Status.key === 'N/A'
            ? `<span style="color:#6b7280;">N/A</span>`
            : `<span class="inline-flex items-center gap-1 ${ma15Bold}" style="${ma15Status.style}">${ma15SvgIcons[ma15Status.key] || ''}${ma15Status.label}</span>`;
        
        // Highlight headline in yellow if news_impact_score >= 30
        const impactScore = row.news_impact_score || 0;
        const headlineColor = impactScore >= 30 ? 'text-fin-gold font-semibold' : 'text-gray-300';
        
        return `
            <tr class="hover:bg-fin-gold/5 transition-colors">
                <td class="px-4 py-4 text-center text-gray-500 text-xs">${(state.currentPage * state.pageSize) + idx + 1}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatDateTime(row.publish_time)}</td>
                <td class="px-4 py-4">
                    <span class="stock-badge" onclick="openTvChart('${row.single_stock || ''}')" title="${i18n[state.lang].chartTooltip}">
                        ${row.single_stock || '-'}
                        <svg class="chart-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                        </svg>
                    </span>
                </td>
                <td class="px-4 py-4 font-bold ${color} text-sm">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</td>
                <td class="px-4 py-4 text-xs company-name-cell" onclick="showCompanyTooltip(event, this)" title="${ma15Tooltip}"><div class="flex items-center">${ma15Cell}</div></td>
                <td class="px-4 py-4 text-gray-200 text-xs truncate max-w-[200px] company-name-cell" onclick="showCompanyTooltip(event, this)" title="${name}">${name || '-'}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${industry || '-'}</td>
                <td class="px-4 py-4 font-semibold text-xs">${(row.current_close/1000).toFixed(1)}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${(row.current_volume/1000000).toFixed(2)}M</td>
                <td class="px-4 py-4">
                    <a href="${row.news_link}" target="_blank" class="${headlineColor} hover:text-fin-gold hover:underline transition-all text-xs line-clamp-1">
                        ${headline}
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    // Bind touch events for mobile row highlight
    bindRowTouchEvents();
}

// Touch support: highlight stock badge when user taps any cell in a row
function bindRowTouchEvents() {
    const tbody = document.getElementById('tableBody');
    let lastTouched = null;
    let touchStartY = 0;
    let touchStartX = 0;
    let didScroll = false;

    function clearTouched() {
        if (lastTouched) {
            lastTouched.classList.remove('row-touched');
            lastTouched = null;
        }
    }

    // Use event delegation on tbody — one listener for all rows
    tbody.addEventListener('touchstart', (e) => {
        const tr = e.target.closest('tr');
        if (!tr) return;
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        didScroll = false;
        // Clear any previously highlighted row immediately
        clearTouched();
    }, { passive: true });

    tbody.addEventListener('touchmove', () => {
        // User is scrolling — mark as scroll so touchend won't highlight
        didScroll = true;
        clearTouched();
    }, { passive: true });

    tbody.addEventListener('touchend', (e) => {
        if (didScroll) return; // was a scroll, not a tap
        const tr = e.target.closest('tr');
        if (!tr) return;

        const dy = Math.abs((e.changedTouches[0]?.clientY ?? touchStartY) - touchStartY);
        const dx = Math.abs((e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX);
        if (dy > 8 || dx > 8) return; // finger moved too much — treat as scroll

        tr.classList.add('row-touched');
        lastTouched = tr;
    }, { passive: true });

    // Tap outside table → clear highlight
    document.addEventListener('touchend', (e) => {
        if (lastTouched && !tbody.contains(e.target)) {
            clearTouched();
        }
    }, { passive: true });
}

// ─── Pagination ────────────────────────────────────────────────────────────

function renderPaginationUI() {
    if (state.totalCount === 0) {
        document.getElementById('paginationInfo').innerText = '';
        document.getElementById('pageNumbers').innerHTML = '';
        document.getElementById('firstBtn').disabled = true;
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        document.getElementById('lastBtn').disabled = true;
        return;
    }
    
    const start = (state.currentPage * state.pageSize) + 1;
    const end = Math.min(start + state.pageSize - 1, state.totalCount);
    document.getElementById('paginationInfo').innerText = i18n[state.lang].paging(start, end, state.totalCount);
    
    // Calculate total pages
    const totalPages = Math.ceil(state.totalCount / state.pageSize);
    
    // Show 3 page numbers on mobile, 5 on wider screens
    const maxPages = window.innerWidth < 480 ? 3 : 5;
    
    // Generate page numbers
    const pageNumbersContainer = document.getElementById('pageNumbers');
    pageNumbersContainer.innerHTML = '';
    
    // Show max page numbers at a time
    let startPage = Math.max(0, state.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - (maxPages - 1));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
            i === state.currentPage 
                ? 'bg-fin-gold text-fin-blue border border-fin-gold' 
                : 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
        }`;
        pageBtn.innerText = i + 1;
        pageBtn.onclick = () => {
            state.currentPage = i;
            fetchData();
        };
        pageNumbersContainer.appendChild(pageBtn);
    }
    
    document.getElementById('firstBtn').disabled = state.currentPage === 0;
    document.getElementById('prevBtn').disabled = state.currentPage === 0;
    document.getElementById('nextBtn').disabled = end >= state.totalCount;
    document.getElementById('lastBtn').disabled = end >= state.totalCount;
}

// ─── Excel Export ──────────────────────────────────────────────────────────

async function exportToExcel() {
    const btn = document.getElementById('exportBtn');
    const btnText = document.getElementById('exportBtnText');
    const originalText = btnText.innerText;
    
    // Disable button and show loading state
    btn.disabled = true;
    btnText.innerText = i18n[state.lang].exporting;
    btn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        // Fetch ALL filtered records in batches (Supabase max: 1000 per request)
        const batchSize = 1000;
        let allData = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${state.fromDate}T00:00:00Z&publish_time=lte.${state.toDate}T23:59:59Z`;
            
            if (state.searchQuery) {
                const stockCodes = state.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            const nullsOrder = state.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getDbField(state.sortCol)}.${state.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;
            url += `&limit=${batchSize}&offset=${offset}`;

            const res = await fetch(url, {
                headers: { 
                    'apikey': SUPABASE_ANON_KEY, 
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'count=exact'
                }
            });

            const batch = await res.json();
            if (!Array.isArray(batch) || batch.length === 0) {
                hasMore = false;
                break;
            }

            allData = allData.concat(batch);
            
            // If we got fewer records than batchSize, we've reached the end
            if (batch.length < batchSize) {
                hasMore = false;
            } else {
                offset += batchSize;
            }

            // Update button text with progress
            btnText.innerText = `${i18n[state.lang].exporting} (${allData.length})`;
        }

        // Client-side sort for %Chg column (same as table)
        if (state.sortCol === 'price_change_today_pct') {
            const dir = state.sortDesc ? -1 : 1;
            allData.sort((a, b) => {
                const av = a.price_change_today_pct ?? 0;
                const bv = b.price_change_today_pct ?? 0;
                return dir * (bv - av);
            });
        }

        // Build Excel data
        const headers = [
            i18n[state.lang].cols.index,
            i18n[state.lang].cols.publish_time,
            i18n[state.lang].cols.single_stock,
            i18n[state.lang].cols.price_change_today_pct,
            i18n[state.lang].cols.ma15,
            i18n[state.lang].cols.organ_name,
            i18n[state.lang].cols.industry,
            i18n[state.lang].cols.current_close,
            i18n[state.lang].cols.current_volume,
            i18n[state.lang].cols.headline,
            'Link'
        ];

        const rows = allData.map((row, idx) => {
            const name = state.lang === 'vn' ? row.organ_name : (state.translatedNames[row.organ_name] || row.organ_name);
            const industry = state.lang === 'vn' ? row.industry_vn : (row.industry_en || row.industry_vn);
            const headline = state.lang === 'vn' ? row.headline : (state.translatedHeadlines[row.headline] || row.headline);
            const ma15Status = getMA15Status(row.pct_ma15);
            const ma15Text = ma15Status.key === 'N/A' ? 'N/A' : ma15Status.key;

            return [
                idx + 1,
                formatDateTime(row.publish_time),
                row.single_stock || '-',
                row.price_change_today_pct ? `${row.price_change_today_pct.toFixed(2)}%` : '0.00%',
                ma15Text,
                name || '-',
                industry || '-',
                row.current_close ? (row.current_close / 1000).toFixed(1) : '-',
                row.current_volume ? (row.current_volume / 1000000).toFixed(2) + 'M' : '-',
                headline,
                row.news_link || ''
            ];
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Auto-size columns
        const colWidths = headers.map((h, i) => {
            const maxLen = Math.max(
                h.length,
                ...rows.slice(0, 100).map(r => String(r[i] || '').length) // Sample first 100 rows for performance
            );
            return { wch: Math.min(maxLen + 2, 50) };
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Tin Tức Chứng Khoán');

        // Generate filename with date range
        const filename = `TinTucChungKhoan_${state.fromDate}_${state.toDate}.xlsx`;
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Export error:', error);
        alert('Lỗi khi xuất file Excel. Vui lòng thử lại.');
    } finally {
        // Re-enable button
        btn.disabled = false;
        btnText.innerText = originalText;
        btn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
}
