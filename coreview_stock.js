// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW STOCK - Data Fetching & Table Logic
// Version: 1.8 - Fixed headline sort direction bug (DESC/ASC logic)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stock View Initialization ─────────────────────────────────────────────

function initStockView() {
    console.log('=== INIT STOCK VIEW ===');
    
    // Force GMT+7 timezone for all date operations
    const today = getGMT7Date();
    console.log('Today (GMT+7):', today);
    
    // Allow selection of last 30 days (including today)
    const twentyNineDaysAgo = new Date(today);
    twentyNineDaysAgo.setDate(today.getDate() - 29);
    
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    // Use GMT+7 date formatting
    const minDate = dateToIso(twentyNineDaysAgo);
    const maxDate = dateToIso(today);
    
    console.log('Date range - min:', minDate, 'max:', maxDate);

    // Init custom date pickers
    createPicker('fromDate', (iso) => {
        state.fromDate = iso;
        setPickerLimits('toDate', iso, maxDate);
        if (state.toDate < iso) {
            state.toDate = iso;
            setPickerValue('toDate', iso);
        }
        state.currentPage = 0;
        fetchData();
    });
    
    createPicker('toDate', (iso) => {
        state.toDate = iso;
        setPickerLimits('fromDate', minDate, iso);
        if (state.fromDate > iso) {
            state.fromDate = iso;
            setPickerValue('fromDate', iso);
        }
        state.currentPage = 0;
        fetchData();
    });

    setPickerLimits('fromDate', minDate, maxDate);
    setPickerLimits('toDate', minDate, maxDate);

    state.fromDate = dateToIso(lastWeek);
    state.toDate = maxDate;
    
    console.log('Initial state dates - from:', state.fromDate, 'to:', state.toDate);

    setPickerValue('fromDate', state.fromDate);
    setPickerValue('toDate', state.toDate);

    // Apply cross-constraints based on initial values
    setPickerLimits('fromDate', minDate, state.toDate);
    setPickerLimits('toDate', state.fromDate, maxDate);

    // Update UI labels based on current language
    updateStockViewLabels();

    // Setup event listeners
    setupStockViewEventListeners();

    // Initial render
    renderHeaders();
    console.log('Calling initial fetchData...');
    fetchData();
}

// Update all stock view labels based on current language
function updateStockViewLabels() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.placeholder = i18n[state.lang].searchPlaceholder;
    
    const lblFrom = document.getElementById('lblFrom');
    if (lblFrom) lblFrom.innerText = i18n[state.lang].lblFrom;
    
    const lblTo = document.getElementById('lblTo');
    if (lblTo) lblTo.innerText = i18n[state.lang].lblTo;
    
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.innerText = i18n[state.lang].prev;
    
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.innerText = i18n[state.lang].next;
    
    const exportBtnText = document.getElementById('exportBtnText');
    if (exportBtnText) exportBtnText.innerText = i18n[state.lang].exportBtn;
    
    const filterBtnText = document.getElementById('filterBtnText');
    if (filterBtnText) filterBtnText.innerText = i18n[state.lang].filterBtn;
    
    const loadingText = document.getElementById('loadingText');
    if (loadingText) loadingText.innerText = i18n[state.lang].loading;
    
    const refreshStockBtn = document.getElementById('refreshStockBtn');
    if (refreshStockBtn) refreshStockBtn.title = i18n[state.lang].refreshBtn;
}

// Setup all event listeners for stock view
function setupStockViewEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toUpperCase();
            state.currentPage = 0;
            fetchData();
        });
    }

    // Pagination buttons
    const firstBtn = document.getElementById('firstBtn');
    if (firstBtn) {
        firstBtn.onclick = () => { 
            state.currentPage = 0; 
            fetchData(); 
        };
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.onclick = () => { 
            state.currentPage--; 
            fetchData(); 
        };
    }

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.onclick = () => { 
            state.currentPage++; 
            fetchData(); 
        };
    }

    const lastBtn = document.getElementById('lastBtn');
    if (lastBtn) {
        lastBtn.onclick = () => {
            const lastPage = Math.floor(state.totalCount / state.pageSize);
            console.log('=== LAST BUTTON CLICKED ===');
            console.log('Current page:', state.currentPage);
            console.log('Total count:', state.totalCount);
            console.log('Page size:', state.pageSize);
            console.log('Calculated last page:', lastPage);
            state.currentPage = lastPage; 
            fetchData(); 
        };
    }
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

// Helper function to build filter query parameters
function buildFilterQuery() {
    const filters = [];
    
    // Get filter state from global scope
    if (typeof filterState !== 'undefined' && filterState.stock) {
        // Stock code filter
        if (filterState.stock.single_stock.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('single_stock=eq.__IMPOSSIBLE__');
        } else if (filterState.stock.single_stock.size > 0) {
            // Specific codes selected
            const codes = Array.from(filterState.stock.single_stock);
            if (codes.length === 1) {
                filters.push(`single_stock=eq.${codes[0]}`);
            } else {
                const orConditions = codes.map(code => `single_stock.eq.${code}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }
        // If size is 0 and no __NONE__, it means "all selected" - don't add any filter
        
        // MA15 filter
        if (filterState.stock.ma15.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('pct_ma15=eq.999999');
        } else if (filterState.stock.ma15.size > 0) {
            // Specific ranges selected
            const ma15Filters = [];
            filterState.stock.ma15.forEach(key => {
                if (key === '⏫ MA15') {
                    ma15Filters.push('pct_ma15.gt.5');
                } else if (key === '⬆️ MA15') {
                    ma15Filters.push('and(pct_ma15.gt.1,pct_ma15.lte.5)');
                } else if (key === '↔️ MA15') {
                    ma15Filters.push('and(pct_ma15.gte.-1,pct_ma15.lte.1)');
                } else if (key === '⬇️ MA15') {
                    ma15Filters.push('and(pct_ma15.gte.-5,pct_ma15.lt.-1)');
                } else if (key === '⏬ MA15') {
                    ma15Filters.push('pct_ma15.lt.-5');
                }
            });
            if (ma15Filters.length > 0) {
                filters.push(`or=(${ma15Filters.join(',')})`);
            }
        }
        // If size is 0 and no __NONE__, it means "all selected" - don't add any filter
        
        // Industry filter
        if (filterState.stock.industry.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('industry_vn=eq.__IMPOSSIBLE__');
        } else if (filterState.stock.industry.size > 0) {
            // Specific industries selected
            const industries = Array.from(filterState.stock.industry);
            if (industries.length === 1) {
                filters.push(`industry_vn=eq.${encodeURIComponent(industries[0])}`);
            } else {
                const orConditions = industries.map(ind => `industry_vn.eq.${encodeURIComponent(ind)}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }
        // If size is 0 and no __NONE__, it means "all selected" - don't add any filter
    }
    
    return filters.length > 0 ? '&' + filters.join('&') : '';
}

async function fetchData() {
    document.getElementById('loadingState').classList.remove('hidden');
    
    console.log('=== FETCH DATA START ===');
    console.log('Current page:', state.currentPage);
    console.log('Page size:', state.pageSize);
    console.log('Sort column:', state.sortCol);
    
    try {
        let allData = [];
        
        // For headline column, we need to fetch ALL data for accurate client-side sorting
        if (state.sortCol === 'headline') {
            // For headline sorting, we must fetch ALL records to sort correctly
            // We'll fetch in batches if needed
            const batchSize = 1000;
            let allData = [];
            let offset = 0;
            let hasMore = true;
            
            console.log('Fetching all records for headline sorting...');
            
            while (hasMore) {
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
                
                // Apply filters
                url += buildFilterQuery();
                
                // Fetch with default order, will sort client-side
                url += `&order=publish_time.desc&limit=${batchSize}&offset=${offset}`;
                
                console.log(`Fetching batch ${Math.floor(offset / batchSize) + 1}, offset: ${offset}`);
                
                const res = await fetch(url, {
                    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Prefer': 'count=exact' }
                });

                const json = await res.json();
                
                if (!Array.isArray(json) || json.length === 0) {
                    hasMore = false;
                    break;
                }
                
                allData = allData.concat(json);
                console.log(`Fetched ${json.length} records, total so far: ${allData.length}`);
                
                // Get total count from first batch
                if (offset === 0) {
                    const contentRange = res.headers.get('content-range');
                    console.log('Content-Range header:', contentRange);
                    if (contentRange) {
                        const match = contentRange.match(/\/(\d+)$/);
                        if (match) {
                            state.totalCount = parseInt(match[1]);
                            console.log('Total count from server:', state.totalCount);
                        }
                    }
                }
                
                // If we got fewer records than batchSize, we've reached the end
                if (json.length < batchSize) {
                    hasMore = false;
                } else {
                    offset += batchSize;
                }
            }
            
            console.log('Total fetched records:', allData.length);
            
            if (allData.length === 0) {
                state.data = [];
                state.totalCount = 0;
            } else {
                // Client-side sort by news_impact_score
                console.log('Table: Sorting by headline, sortDesc:', state.sortDesc);
                allData.sort((a, b) => {
                    const av = a.news_impact_score ?? 0;
                    const bv = b.news_impact_score ?? 0;
                    if (state.sortDesc) {
                        return bv - av; // DESC: highest first
                    } else {
                        return av - bv; // ASC: lowest first
                    }
                });
                console.log('Table: After sort, first 3:', allData.slice(0, 3).map(r => ({
                    stock: r.single_stock,
                    score: r.news_impact_score,
                    headline: r.headline?.substring(0, 40)
                })));
                
                // Set total count if not already set
                if (!state.totalCount) {
                    state.totalCount = allData.length;
                    console.log('Total count from data length:', state.totalCount);
                }
                
                // Apply pagination to sorted results
                const start = state.currentPage * state.pageSize;
                const end = start + state.pageSize;
                console.log('Pagination - start:', start, 'end:', end);
                console.log('Available data length:', allData.length);
                
                state.data = allData.slice(start, end);
                console.log('Sliced data length:', state.data.length);
                console.log('Data records:', state.data.map(r => r.single_stock));
            }
        } else {
            // For other columns, use server-side pagination
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
            
            // Apply filters
            url += buildFilterQuery();
            
            const nullsOrder = state.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getDbField(state.sortCol)}.${state.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

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
            }
        }
        
        // Preload translations in background
        if (state.data.length > 0) {
            translateNames(state.data.map(d => d.organ_name));
            translateHeadlines(state.data.map(d => d.headline));
        }
        
        console.log('=== FETCH DATA END ===');
        console.log('Final state.data.length:', state.data.length);
        console.log('Final state.totalCount:', state.totalCount);
        console.log('Final state.currentPage:', state.currentPage);
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
        { id: 'headline',              w: 'w-auto', s: true }
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
    if (colId === 'headline') return 'news_impact_score';
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
        // Different column clicked, start with ASC (except for headline)
        state.sortCol = id;
        if (id === 'headline') {
            state.sortDesc = true; // Highest impact score first for headline
        } else {
            state.sortDesc = false;
        }
    }
    state.currentPage = 0; 
    renderHeaders(); 
    fetchData();
}

// Refresh stock data with current filters (keeps page at 0)
function refreshStockData() {
    const btn = document.getElementById('refreshStockBtn');
    const icon = document.getElementById('refreshStockIcon');
    
    // Spin animation
    if (icon) {
        icon.style.transition = 'transform 0.6s ease';
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            icon.style.transition = 'none';
            icon.style.transform = 'rotate(0deg)';
        }, 600);
    }
    
    // Reset to first page and refetch
    state.currentPage = 0;
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
    console.log('=== RENDER PAGINATION UI ===');
    console.log('state.totalCount:', state.totalCount);
    console.log('state.currentPage:', state.currentPage);
    console.log('state.pageSize:', state.pageSize);
    
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
    console.log('Pagination display - start:', start, 'end:', end);
    
    document.getElementById('paginationInfo').innerText = i18n[state.lang].paging(start, end, state.totalCount);
    
    // Calculate total pages
    const totalPages = Math.ceil(state.totalCount / state.pageSize);
    console.log('Total pages:', totalPages);
    
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
    
    console.log('Export started - Current sort:', state.sortCol, state.sortDesc ? 'DESC' : 'ASC');
    
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
            
            // Apply search query filter
            if (state.searchQuery) {
                const stockCodes = state.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filter popup filters
            const filterQuery = buildFilterQuery();
            if (filterQuery) {
                url += filterQuery;
            }
            
            // For headline and price_change_today_pct, we'll sort client-side, so use default order
            // For other columns, use server-side sort
            if (state.sortCol === 'headline' || state.sortCol === 'price_change_today_pct') {
                // Fetch with default order, will sort client-side later
                url += `&order=publish_time.desc`;
            } else {
                const nullsOrder = '.nullslast';
                url += `&order=${getDbField(state.sortCol)}.${state.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;
            }
            url += `&limit=${batchSize}&offset=${offset}`;
            
            console.log('Export fetch URL:', url);

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
        
        // Client-side sort for headline column by news_impact_score (same as table)
        if (state.sortCol === 'headline') {
            console.log('Export: Sorting by headline (news_impact_score), sortDesc:', state.sortDesc);
            allData.sort((a, b) => {
                const av = a.news_impact_score ?? 0;
                const bv = b.news_impact_score ?? 0;
                if (state.sortDesc) {
                    return bv - av; // DESC: highest first
                } else {
                    return av - bv; // ASC: lowest first
                }
            });
            console.log('Export: After sort, first 3:', allData.slice(0, 3).map(r => ({
                stock: r.single_stock,
                score: r.news_impact_score,
                headline: r.headline?.substring(0, 40)
            })));
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

// ─── Company Name Tooltip ──────────────────────────────────────────────────

(function() {
    // Wait for tooltip element to be available
    setTimeout(() => {
        const tooltip = document.getElementById('company-tooltip');
        if (!tooltip) return;
        
        let hideTimer = null;

        function positionTooltip(e) {
            const margin = 12;
            const tw = tooltip.offsetWidth  || 280;
            const th = tooltip.offsetHeight || 48;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // Prefer below the tap/click point, fall back to above
            let x = (e.clientX ?? e.touches?.[0]?.clientX ?? vw / 2) - tw / 2;
            let y = (e.clientY ?? e.touches?.[0]?.clientY ?? vh / 2) + 16;

            // Clamp horizontally
            x = Math.max(margin, Math.min(x, vw - tw - margin));
            // Flip above if it would go off the bottom
            if (y + th > vh - margin) {
                y = (e.clientY ?? e.touches?.[0]?.clientY ?? vh / 2) - th - 16;
            }
            y = Math.max(margin, y);

            tooltip.style.left = x + 'px';
            tooltip.style.top  = y + 'px';
        }

        window.showCompanyTooltip = function(e, cell) {
            const fullName = cell.getAttribute('title');
            if (!fullName || fullName === '-') return;

            // Reset animation by toggling class
            tooltip.classList.remove('visible');
            tooltip.textContent = fullName;

            // Position before showing (need a frame for offsetWidth to be valid)
            requestAnimationFrame(() => {
                positionTooltip(e);
                tooltip.classList.add('visible');

                clearTimeout(hideTimer);
                hideTimer = setTimeout(() => {
                    tooltip.classList.remove('visible');
                }, 4000);
            });

            e.stopPropagation();
        };

        // Tap/click anywhere else hides it immediately
        document.addEventListener('click',     () => { clearTimeout(hideTimer); tooltip.classList.remove('visible'); });
        document.addEventListener('touchstart', () => { clearTimeout(hideTimer); tooltip.classList.remove('visible'); }, { passive: true });
    }, 100);
})();

// ─── TradingView Chart ─────────────────────────────────────────────────────

const HNX_SET = new Set(['AAV','ADC','ALT','AMC','AME','AMV','API','APS','ARM','ATS','BAB','BAX','BBS','BCC','BCF','BED','BKC','BNA','BPC','BTS','BTW','BVS','BXH','C69','CAG','CAN','CAP','CAR','CCR','CDN','CEO','CET','CIA','CJC','CKV','CLH','CLM','CMC','CMS','CPC','CSC','CST','CTB','CTP','CTT','CX8','D11','DAD','DAE','DC2','DDG','DHP','DHT','DIH','DL1','DNC','DNP','DP3','DS3','DST','DTD','DTG','DTK','DVM','DXP','EBS','ECI','EID','EVS','FID','GDW','GIC','GKM','GLT','GMA','GMX','HAD','HAT','HBS','HCC','HCT','HDA','HEV','HGM','HHC','HJS','HKT','HLC','HLD','HMH','HMR','HOM','HTC','HUT','HVT','ICG','IDC','IDJ','IDV','INC','INN','IPA','ITQ','IVS','KDM','KHS','KKC','KMT','KSD','KSF','KST','KSV','KTS','L14','L18','L40','LAS','LBE','LCD','LDP','LHC','LIG','MAC','MAS','MBG','MBS','MCC','MCF','MCO','MDC','MED','MEL','MIC','MKV','MST','MVB','NAG','NAP','NBC','NBP','NBW','NDN','NDX','NET','NFC','NHC','NRC','NSH','NST','NTH','NTP','NVB','OCH','ONE','PBP','PCE','PCH','PCT','PDB','PEN','PGN','PGS','PGT','PHN','PIA','PIC','PJC','PLC','PMB','PMC','PMP','PMS','POT','PPE','PPP','PPS','PPT','PPY','PRC','PRE','PSC','PSD','PSE','PSI','PSW','PTD','PTI','PTS','PTX','PV2','PVB','PVC','PVG','PVI','PVS','QHD','QST','QTC','RCL','S55','S99','SAF','SCG','SCI','SD5','SD9','SDA','SDC','SDG','SDN','SDU','SEB','SED','SFN','SGC','SGD','SGH','SHE','SHN','SHS','SJ1','SJE','SLS','SMN','SMT','SPC','SRA','SSM','STC','STP','SVN','SZB','TA9','TD6','TDT','TET','TFC','THB','THD','THS','THT','TIG','TJC','TKU','TMB','TMC','TMX','TNG','TOT','TPP','TSB','TTC','TTH','TTL','TTT','TV3','TV4','TVC','TVD','TXM','UNI','V12','V21','VBC','VC1','VC2','VC3','VC6','VC7','VC9','VCC','VCM','VCS','VDL','VE1','VE3','VE4','VFS','VGP','VGS','VHE','VHL','VIF','VIG','VIT','VLA','VMC','VMS','VNC','VNF','VNR','VNT','VSA','VSM','VTC','VTH','VTJ','VTV','VTZ','WCS','WSS','X20']);

const UPCOM_SET = new Set(['A32','AAH','AAS','ABB','ABC','ABI','ABW','ACE','ACM','ACS','ACV','AG1','AGF','AGM','AGP','AGX','AIC','AIG','ALC','ALV','AMP','AMS','APC','APF','APL','APP','APT','ART','ATA','ATG','AVC','AVF','AVG','BAL','BBH','BBM','BBT','BCA','BCB','BCP','BCR','BCV','BDG','BDT','BDW','BEL','BGE','BGW','BHA','BHC','BHG','BHH','BHI','BHK','BHP','BIG','BIO','BLF','BLI','BLN','BLT','BMD','BMF','BMG','BMJ','BMK','BMS','BMV','BNW','BOT','BQB','BQP','BRR','BRS','BSA','BSD','BSG','BSH','BSL','BSP','BSQ','BT1','BT6','BTB','BTD','BTG','BTH','BTN','BTU','BTV','BVB','BVG','BVL','BVN','BWA','BWS','C21','C22','C4G','C92','CAD','CAT','CBI','CBS','CC1','CCA','CCM','CCP','CCS','CCT','CCV','CDG','CDO','CDP','CDR','CEN','CFM','CFV','CGV','CH5','CHC','CHS','CI5','CID','CIP','CK8','CKA','CKD','CLX','CMD','CMF','CMI','CMK','CMM','CMN','CMP','CMT','CMW','CNA','CNC','CNN','CNT','CPA','CPH','CPI','CQN','CQT','CSI','CT3','CT6','CTA','CTW','CTX','CVN','CYC','DAC','DAG','DAN','DAS','DBM','DC1','DCF','DCG','DCH','DCR','DCS','DCT','DCV','DDB','DDH','DDM','DDN','DDV','DFC','DFF','DGT','DHB','DHD','DHN','DIC','DID','DKC','DKG','DLD','DLR','DLT','DM7','DMN','DMS','DNA','DND','DNE','DNH','DNL','DNM','DNN','DNT','DNW','DOC','DOP','DP1','DP2','DPC','DPH','DPP','DRG','DRI','DSD','DSG','DSH','DSP','DTC','DTE','DTH','DTI','DTP','DUS','DVC','DVG','DVN','DVT','DVW','DWC','DWS','DXL','DZM','E12','E29','ECO','EFI','EGL','EIC','EIN','EME','EMG','EMS','F88','FBC','FCC','FCS','FGL','FHN','FHS','FIC','FOC','FOX','FRC','FRM','FSO','FT1','FTI','FTM','G20','G36','GCB','GCF','GDA','GER','GGG','GH3','GLC','GLW','GMC','GND','GPC','GSM','GTD','GTS','GTT','GVT','H11','HAC','HAF','HAM','HAN','HAV','HBC','HBD','HBH','HC1','HC3','HCI','HD2','HD6','HD8','HDM','HDP','HDW','HEC','HEJ','HEP','HES','HFB','HFC','HFX','HGT','HHB','HHG','HHN','HIO','HJC','HKB','HLA','HLB','HLO','HLS','HLT','HLY','HMD','HMG','HMS','HNB','HND','HNF','HNG','HNI','HNM','HNP','HNR','HOT','HPB','HPD','HPH','HPI','HPM','HPO','HPP','HPT','HPW','HRB','HSA','HSM','HSP','HSV','HTE','HTM','HTP','HTT','HU3','HU4','HU6','HUG','HVA','HVX','HWS','IBD','ICC','ICF','ICI','ICN','IDP','IFS','IHK','ILA','ILC','ILS','IME','IN4','IRC','ISG','ISH','IST','ITA','ITS','JOS','KCB','KGM','KHD','KHW','KHX','KIP','KPF','KSQ','KTC','KTL','KTT','KVC','L12','L35','L43','L45','L61','L62','L63','LAI','LAW','LCC','LCM','LDW','LEC','LG9','LIC','LKW','LLM','LM3','LM7','LMC','LMH','LMI','LNC','LO5','LPT','LQN','LSG','LTC','LTG','LUT','M10','MA1','MBN','MBT','MCG','MDA','MDF','MEC','MEF','MES','MFS','MGC','MGG','MGR','MH3','MHL','MIE','MKP','MLC','MLS','MML','MNB','MND','MPC','MPT','MPY','MQB','MQN','MRF','MSR','MTA','MTB','MTG','MTH','MTL','MTP','MTS','MTV','MVC','MVN','MZG','NAC','NAS','NAU','NAW','NBE','NBT','NCG','NCS','ND2','NDC','NDF','NDP','NDT','NDW','NED','NGC','NHV','NJC','NLS','NNT','NOS','NQB','NQN','NSG','NSL','NSS','NTF','NTT','NTW','NUE','NVP','NWT','NXT','ODE','OIL','ONW','PAI','PAP','PAS','PAT','PBC','PBT','PCC','PCF','PCG','PCM','PDC','PEG','PEQ','PFL','PGB','PHH','PHP','PHS','PID','PIS','PIV','PJS','PLA','PLE','PLO','PMJ','PMT','PMW','PND','PNG','PNP','PNT','POB','POM','POS','POV','PPH','PPI','PQN','PRO','PRT','PSB','PSG','PSH','PSL','PSN','PSP','PTE','PTG','PTH','PTM','PTO','PTP','PTT','PTV','PVE','PVH','PVL','PVM','PVO','PVR','PVV','PVX','PVY','PWA','PWS','PXA','PXI','PXL','PXM','PXS','PXT','QBS','QCC','QHW','QNC','QNS','QNT','QNU','QNW','QPH','QSP','QTP','RAT','RBC','RCC','RCD','RDP','RGG','RIC','RTB','S12','S72','S74','SAC','SAL','SAS','SB1','SBB','SBD','SBH','SBL','SBM','SBR','SBS','SCC','SCD','SCJ','SCL','SCO','SD2','SD3','SD4','SD6','SD7','SD8','SDD','SDK','SDP','SDT','SDV','SDY','SEA','SEP','SGB','SGI','SGP','SGS','SHC','SHG','SID','SIG','SII','SIV','SJF','SJG','SJM','SKH','SKN','SKV','SLD','SNC','SNZ','SP2','SPB','SPD','SPH','SPI','SPV','SRB','SSF','SSG','SSH','SSN','STD','STH','STL','STS','STT','STW','SVG','SVH','SWC','SZE','SZG','TA6','TAB','TAN','TAR','TAW','TB8','TBD','TBR','TBW','TCJ','TCK','TCW','TDB','TDF','TDS','TED','TGG','TGP','TH1','THM','THN','THP','THU','THW','TID','TIE','TIN','TIS','TKA','TKC','TL4','TLP','TMG','TMW','TNA','TNB','TNP','TNS','TNV','TNW','TOP','TOS','TOW','TPS','TQN','TQW','TR1','TRS','TRT','TRV','TS3','TSD','TSG','TSJ','TST','TT6','TTB','TTD','TTG','TTN','TTS','TTZ','TUG','TV1','TV6','TVA','TVG','TVH','TVM','TVN','TW3','UCT','UDC','UDJ','UDL','UEM','UMC','UPC','UPH','UPS','USC','USD','UTT','UXC','VAV','VBB','VBG','VBH','VCE','VCP','VCR','VCT','VCX','VDB','VDG','VDN','VDT','VE2','VE8','VE9','VEA','VEC','VEF','VES','VET','VFC','VFR','VGG','VGI','VGL','VGR','VGT','VGV','VHD','VHF','VHG','VHH','VIE','VIM','VIN','VIR','VIW','VKC','VKP','VLB','VLC','VLG','VLP','VLS','VLW','VMA','VMG','VMK','VMT','VNA','VNB','VNH','VNI','VNP','VNX','VNY','VNZ','VPA','VPC','VPR','VPW','VQC','VRG','VSE','VSF','VSG','VSN','VST','VTA','VTD','VTE','VTG','VTI','VTK','VTM','VTQ','VTR','VTS','VTX','VUA','VVN','VW3','VWS','VXB','VXP','VXT','WSB','WTC','X26','X77','XDH','XHC','XLV','XMC','XMD','XMP','XPH','YBC','YTC']);

// Persisted exchange overrides (user corrections saved to localStorage)
const CACHE_VERSION = 'v3';
const exchangeCache = (() => {
    try {
        if (localStorage.getItem('tvExchangeCacheVer') !== CACHE_VERSION) {
            localStorage.removeItem('tvExchangeCache');
            localStorage.setItem('tvExchangeCacheVer', CACHE_VERSION);
            return {};
        }
        return JSON.parse(localStorage.getItem('tvExchangeCache') || '{}');
    } catch (_) { return {}; }
})();

function saveExchangeCache(symbol, exchange) {
    exchangeCache[symbol] = exchange;
    try { localStorage.setItem('tvExchangeCache', JSON.stringify(exchangeCache)); } catch (_) {}
}

function detectExchange(symbol) {
    if (exchangeCache[symbol]) return exchangeCache[symbol];
    if (HNX_SET.has(symbol))   return 'HNX';
    if (UPCOM_SET.has(symbol)) return 'UPCOM';
    return 'HOSE';
}

// Click ticker → open TradingView in new tab (correct symbol, no popup issues)
function openTvChart(ticker) {
    if (!ticker || ticker === '-') return;
    const symbol   = ticker.trim().toUpperCase();
    const exchange = detectExchange(symbol);
    window.open(`https://www.tradingview.com/chart/?symbol=${exchange}%3A${symbol}`, '_blank');
}
