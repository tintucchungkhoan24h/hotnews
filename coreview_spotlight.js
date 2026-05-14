// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW STOCK - Data Fetching & Table Logic
// Version: 1.8 - Fixed headline sort direction bug (DESC/ASC logic)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stock View Initialization ─────────────────────────────────────────────

function initSpotlightView() {
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
    createPicker('fromDateSpotlight', (iso) => {
        stateSpotlight.fromDateSpotlight = iso;
        setPickerLimits('toDateSpotlight', iso, maxDate);
        if (stateSpotlight.toDateSpotlight < iso) {
            stateSpotlight.toDateSpotlight = iso;
            setPickerValue('toDateSpotlight', iso);
        }
        stateSpotlight.currentPage = 0;
        fetchSpotlightData();
    });
    
    createPicker('toDateSpotlight', (iso) => {
        stateSpotlight.toDateSpotlight = iso;
        setPickerLimits('fromDateSpotlight', minDate, iso);
        if (stateSpotlight.fromDateSpotlight > iso) {
            stateSpotlight.fromDateSpotlight = iso;
            setPickerValue('fromDateSpotlight', iso);
        }
        stateSpotlight.currentPage = 0;
        fetchSpotlightData();
    });

    setPickerLimits('fromDateSpotlight', minDate, maxDate);
    setPickerLimits('toDateSpotlight', minDate, maxDate);

    // Only set default dates on first load; preserve user selection on tab revisit
    if (!stateSpotlight.fromDateSpotlight) stateSpotlight.fromDateSpotlight = dateToIso(lastWeek);
    if (!stateSpotlight.toDateSpotlight) stateSpotlight.toDateSpotlight = maxDate;
    
    console.log('Initial state dates - from:', stateSpotlight.fromDateSpotlight, 'to:', stateSpotlight.toDateSpotlight);

    setPickerValue('fromDateSpotlight', stateSpotlight.fromDateSpotlight);
    setPickerValue('toDateSpotlight', stateSpotlight.toDateSpotlight);

    // Apply cross-constraints based on initial values
    setPickerLimits('fromDateSpotlight', minDate, stateSpotlight.toDateSpotlight);
    setPickerLimits('toDateSpotlight', stateSpotlight.fromDateSpotlight, maxDate);

    // Update UI labels based on current language
    updateSpotlightViewLabels();

    // Setup event listeners
    setupSpotlightViewEventListeners();

    // Wire export button via JS (more reliable than inline onclick in dynamic HTML)
    const exportBtnEl = document.getElementById('exportBtnSpotlight');
    if (exportBtnEl) {
        exportBtnEl.onclick = function() { exportSpotlightToExcel(exportBtnEl); };
    }

    // Initial render
    renderSpotlightHeaders();
    console.log('Calling initial fetchSpotlightData...');
    fetchSpotlightData();
}

// Update all stock view labels based on current language
function updateSpotlightViewLabels() {
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateSpotlight.lang || 'vn';

    const searchInputSpotlight = document.getElementById('searchInputSpotlight');
    if (searchInputSpotlight) searchInputSpotlight.placeholder = i18n[lang].searchPlaceholder;
    
    const lblFromSpotlight = document.getElementById('lblFromSpotlight');
    if (lblFromSpotlight) lblFromSpotlight.innerText = i18n[lang].lblFrom;
    
    const lblToSpotlight = document.getElementById('lblToSpotlight');
    if (lblToSpotlight) lblToSpotlight.innerText = i18n[lang].lblTo;
    
    const prevBtnSpotlight = document.getElementById('prevBtnSpotlight');
    if (prevBtnSpotlight) prevBtnSpotlight.innerText = i18n[lang].prev;
    
    const nextBtnSpotlight = document.getElementById('nextBtnSpotlight');
    if (nextBtnSpotlight) nextBtnSpotlight.innerText = i18n[lang].next;
    
    const exportBtnSpotlightText = document.getElementById('exportBtnSpotlightText');
    if (exportBtnSpotlightText) exportBtnSpotlightText.innerText = i18n[lang].exportBtn;
    
    const filterBtnTextSpotlight = document.getElementById('filterBtnTextSpotlight');
    if (filterBtnTextSpotlight) filterBtnTextSpotlight.innerText = i18n[lang].filterBtn;
    
    const loadingTextSpotlight = document.getElementById('loadingTextSpotlight');
    if (loadingTextSpotlight) loadingTextSpotlight.innerText = i18n[lang].loading;
    
    const refreshSpotlightBtn = document.getElementById('refreshSpotlightBtn');
    if (refreshSpotlightBtn) refreshSpotlightBtn.title = i18n[lang].refreshBtn;
}

// Setup all event listeners for stock view
function setupSpotlightViewEventListeners() {
    // Search input
    const searchInputSpotlight = document.getElementById('searchInputSpotlight');
    if (searchInputSpotlight) {
        searchInputSpotlight.addEventListener('input', (e) => {
            stateSpotlight.searchQuery = e.target.value.toUpperCase();
            stateSpotlight.currentPage = 0;
            fetchSpotlightData();
        });
    }

    // Pagination buttons
    const firstBtnSpotlight = document.getElementById('firstBtnSpotlight');
    if (firstBtnSpotlight) {
        firstBtnSpotlight.onclick = () => { 
            stateSpotlight.currentPage = 0; 
            fetchSpotlightData(); 
        };
    }

    const prevBtnSpotlight = document.getElementById('prevBtnSpotlight');
    if (prevBtnSpotlight) {
        prevBtnSpotlight.onclick = () => { 
            stateSpotlight.currentPage--; 
            fetchSpotlightData(); 
        };
    }

    const nextBtnSpotlight = document.getElementById('nextBtnSpotlight');
    if (nextBtnSpotlight) {
        nextBtnSpotlight.onclick = () => { 
            stateSpotlight.currentPage++; 
            fetchSpotlightData(); 
        };
    }

    const lastBtnSpotlight = document.getElementById('lastBtnSpotlight');
    if (lastBtnSpotlight) {
        lastBtnSpotlight.onclick = () => {
            const lastPage = Math.floor(stateSpotlight.totalCount / stateSpotlight.pageSize);
            console.log('=== LAST BUTTON CLICKED ===');
            console.log('Current page:', stateSpotlight.currentPage);
            console.log('Total count:', stateSpotlight.totalCount);
            console.log('Page size:', stateSpotlight.pageSize);
            console.log('Calculated last page:', lastPage);
            stateSpotlight.currentPage = lastPage; 
            fetchSpotlightData(); 
        };
    }
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

// Helper function to build filter query parameters
function buildSpotlightFilterQuery() {
    const filters = [];
    
    // DEFAULT FILTER: Always add recommendation = HOLD or BUY for spotlight
    filters.push('or=(recommendation.eq.HOLD,recommendation.eq.BUY)');
    
    // Get filter state from global scope
    if (typeof filterState !== 'undefined' && filterState.spotlight) {
        // Stock code filter
        if (filterState.spotlight.single_stock.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('single_stock=eq.__IMPOSSIBLE__');
        } else if (filterState.spotlight.single_stock.size > 0) {
            // Specific codes selected
            const codes = Array.from(filterState.spotlight.single_stock);
            if (codes.length === 1) {
                filters.push(`single_stock=eq.${codes[0]}`);
            } else {
                const orConditions = codes.map(code => `single_stock.eq.${code}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }
        // If size is 0 and no __NONE__, it means "all selected" - don't add any filter
        
        // MA15 filter
        if (filterState.spotlight.ma15.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('pct_ma15=eq.999999');
        } else if (filterState.spotlight.ma15.size > 0) {
            // Specific ranges selected
            const ma15Filters = [];
            filterState.spotlight.ma15.forEach(key => {
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
        if (filterState.spotlight.industry.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('industry_vn=eq.__IMPOSSIBLE__');
        } else if (filterState.spotlight.industry.size > 0) {
            // Specific industries selected
            const industries = Array.from(filterState.spotlight.industry);
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

async function fetchSpotlightData() {
    document.getElementById('loadingStateSpotlight').classList.remove('hidden');
    
    console.log('=== FETCH DATA START ===');
    console.log('Current page:', stateSpotlight.currentPage);
    console.log('Page size:', stateSpotlight.pageSize);
    console.log('Sort column:', stateSpotlight.sortCol);
    
    try {
        let allData = [];
        
        // For headline column, we need to fetch ALL data for accurate client-side sorting
        if (stateSpotlight.sortCol === 'headline') {
            // For headline sorting, we must fetch ALL records to sort correctly
            // We'll fetch in batches if needed
            const batchSize = 1000;
            let allData = [];
            let offset = 0;
            let hasMore = true;
            
            console.log('Fetching all records for headline sorting...');
            
            while (hasMore) {
                let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${stateSpotlight.fromDateSpotlight}T00:00:00Z&publish_time=lte.${stateSpotlight.toDateSpotlight}T23:59:59Z`;
                
                // Handle multiple stock codes separated by comma
                if (stateSpotlight.searchQuery) {
                    const stockCodes = stateSpotlight.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                    if (stockCodes.length === 1) {
                        url += `&single_stock=ilike.*${stockCodes[0]}*`;
                    } else if (stockCodes.length > 1) {
                        const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                        url += `&or=(${orConditions})`;
                    }
                }
                
                // Apply filters
                url += buildSpotlightFilterQuery();
                
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
                            stateSpotlight.totalCount = parseInt(match[1]);
                            console.log('Total count from server:', stateSpotlight.totalCount);
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
                stateSpotlight.data = [];
                stateSpotlight.totalCount = 0;
            } else {
                // Client-side sort by news_impact_score
                console.log('Table: Sorting by headline, sortDesc:', stateSpotlight.sortDesc);
                allData.sort((a, b) => {
                    const av = a.news_impact_score ?? 0;
                    const bv = b.news_impact_score ?? 0;
                    if (stateSpotlight.sortDesc) {
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
                if (!stateSpotlight.totalCount) {
                    stateSpotlight.totalCount = allData.length;
                    console.log('Total count from data length:', stateSpotlight.totalCount);
                }
                
                // Apply pagination to sorted results
                const start = stateSpotlight.currentPage * stateSpotlight.pageSize;
                const end = start + stateSpotlight.pageSize;
                console.log('Pagination - start:', start, 'end:', end);
                console.log('Available data length:', allData.length);
                
                stateSpotlight.data = allData.slice(start, end);
                console.log('Sliced data length:', stateSpotlight.data.length);
                console.log('Data records:', stateSpotlight.data.map(r => r.single_stock));
            }
        } else {
            // For other columns, use server-side pagination
            const start = stateSpotlight.currentPage * stateSpotlight.pageSize;
            const end = start + stateSpotlight.pageSize - 1;
            
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${stateSpotlight.fromDateSpotlight}T00:00:00Z&publish_time=lte.${stateSpotlight.toDateSpotlight}T23:59:59Z`;
            
            // Handle multiple stock codes separated by comma
            if (stateSpotlight.searchQuery) {
                const stockCodes = stateSpotlight.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filters
            url += buildSpotlightFilterQuery();
            
            const nullsOrder = stateSpotlight.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getDbFieldSpotlight(stateSpotlight.sortCol)}.${stateSpotlight.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

            const res = await fetch(url, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Range': `${start}-${end}`, 'Prefer': 'count=exact' }
            });

            const json = await res.json();

            // Supabase returns an error object (not an array) on failure
            if (!Array.isArray(json)) {
                console.error('Supabase error:', json);
                stateSpotlight.data = [];
                stateSpotlight.totalCount = 0;
            } else {
                stateSpotlight.data = json;
                // For %Chg column, re-sort client-side treating NULL as 0
                // so NULLs appear between positives and negatives, not at extremes
                if (stateSpotlight.sortCol === 'price_change_today_pct') {
                    const dir = stateSpotlight.sortDesc ? -1 : 1;
                    stateSpotlight.data.sort((a, b) => {
                        const av = a.price_change_today_pct ?? 0;
                        const bv = b.price_change_today_pct ?? 0;
                        return dir * (bv - av);
                    });
                }
                const contentRange = res.headers.get('content-range');
                if (contentRange) {
                    const match = contentRange.match(/\/(\d+)$/);
                    if (match) stateSpotlight.totalCount = parseInt(match[1]);
                } else {
                    stateSpotlight.totalCount = stateSpotlight.data.length;
                }
            }
        }
        
        // Preload translations in background
        if (stateSpotlight.data.length > 0) {
            translateNames(stateSpotlight.data.map(d => d.organ_name));
            translateHeadlines(stateSpotlight.data.map(d => d.headline));
        }
        
        console.log('=== FETCH DATA END ===');
        console.log('Final stateSpotlight.data.length:', stateSpotlight.data.length);
        console.log('Final stateSpotlight.totalCount:', stateSpotlight.totalCount);
        console.log('Final stateSpotlight.currentPage:', stateSpotlight.currentPage);
    } catch (e) { 
        console.error('fetchSpotlightData error:', e);
        stateSpotlight.data = [];
        stateSpotlight.totalCount = 0;
    } finally {
        document.getElementById('loadingStateSpotlight').classList.add('hidden');
        renderSpotlightBody();
        renderSpotlightPaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderSpotlightHeaders() {
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
    const _lang = (typeof state !== 'undefined' ? state.lang : null) || stateSpotlight.lang || 'vn';
    document.getElementById('tableHeaderSpotlight').innerHTML = cols.map(c => `
        <th class="px-4 py-4 ${c.s ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.s ? getSortClassSpotlight(c.id) : ''}" 
            ${c.s ? `onclick="handleSpotlightSort('${c.id}')"` : ''}>
            <div class="flex items-center">
                <span>${i18n[_lang].cols[c.id]}</span>
                ${c.s ? '<span class="sort-icon"></span>' : ''}
            </div>
        </th>
    `).join('');
}

// Map display column id → actual database field name (language-aware)
function getDbFieldSpotlight(colId) {
    if (colId === 'ma15')     return 'pct_ma15';
    if (colId === 'headline') return 'news_impact_score';
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateSpotlight.lang || 'vn';
    if (colId === 'industry') return lang === 'en' ? 'industry_en' : 'industry_vn';
    return colId;
}

function getSortClassSpotlight(id) { 
    if (stateSpotlight.sortCol === id) {
        return stateSpotlight.sortDesc ? 'sorted-desc' : 'sorted-asc';
    }
    return 'unsorted';
}

function handleSpotlightSort(id) {
    if (stateSpotlight.sortCol === id) {
        // Same column clicked
        if (!stateSpotlight.sortDesc) {
            // Currently ASC → go to DESC
            stateSpotlight.sortDesc = true;
        } else {
            // Currently DESC → return to default (timesfm_point DESC)
            stateSpotlight.sortCol = 'timesfm_point';
            stateSpotlight.sortDesc = true;
        }
    } else {
        // Different column clicked, start with ASC (except for headline)
        stateSpotlight.sortCol = id;
        if (id === 'headline') {
            stateSpotlight.sortDesc = true; // Highest impact score first for headline
        } else {
            stateSpotlight.sortDesc = false;
        }
    }
    stateSpotlight.currentPage = 0; 
    renderSpotlightHeaders(); 
    fetchSpotlightData();
}

// Refresh stock data with current filters (keeps page at 0)
function refreshSpotlightData() {
    const btn = document.getElementById('refreshSpotlightBtn');
    const icon = document.getElementById('refreshSpotlightIcon');
    
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
    stateSpotlight.currentPage = 0;
    fetchSpotlightData();
}

// Toggle clear button visibility (spotlight-safe wrapper)
function toggleClearBtn(btnId, value) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('hidden', !value);
}

// Clear stock search input
function clearSpotlightSearch() {
    const input = document.getElementById('searchInputSpotlight');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
    const btn = document.getElementById('clearSpotlightBtn');
    if (btn) btn.classList.add('hidden');
}

// Format date as dd/mm hh:mm (spotlight)
function formatDateTimeSpotlight(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

// Get MA15 status and color based on pct_ma15 value (spotlight)
function getMA15StatusSpotlight(pctMa15) {
    if (pctMa15 === null || pctMa15 === undefined) {
        return { key: 'N/A', icon: '—', label: 'N/A', style: 'color:#6b7280;', bold: false };
    }
    if (pctMa15 > 5) {
        return { key: '⏫ MA15', icon: '⏫', label: 'MA15', style: 'color:#00c853;', bold: true };
    } else if (pctMa15 > 1) {
        return { key: '⬆️ MA15', icon: '⬆️', label: 'MA15', style: 'color:#00e676;', bold: false };
    } else if (pctMa15 > -1) {
        return { key: '↔️ MA15', icon: '↔', label: 'MA15', style: 'color:#ffffff;', bold: false };
    } else if (pctMa15 > -5) {
        return { key: '⬇️ MA15', icon: '⬇️', label: 'MA15', style: 'color:#ff6b6b;', bold: false };
    } else {
        return { key: '⏬ MA15', icon: '⏬', label: 'MA15', style: 'color:#ff1744;', bold: true };
    }
}

function renderSpotlightBody() {
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateSpotlight.lang || 'vn';
    const tbody = document.getElementById('tableBodySpotlight');
    if (stateSpotlight.data.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyStateSpotlight').classList.remove('hidden');
        document.getElementById('emptyStateSpotlight').innerText = i18n[lang].empty;
        return;
    }
    document.getElementById('emptyStateSpotlight').classList.add('hidden');
    
    tbody.innerHTML = stateSpotlight.data.map((row, idx) => {
        const name = lang === 'vn' ? row.organ_name : (stateSpotlight.translatedNames[row.organ_name] || row.organ_name);
        const industry = lang === 'vn' ? row.industry_vn : (row.industry_en || row.industry_vn);
        const headline = lang === 'vn' ? row.headline : (stateSpotlight.translatedHeadlines[row.headline] || row.headline);
        const pct = row.price_change_today_pct || 0;
        const color = pct > 0 ? 'text-fin-green' : (pct < 0 ? 'text-fin-red' : 'text-gray-400');
        
        // Get MA15 status
        const ma15Status = getMA15StatusSpotlight(row.pct_ma15);
        const ma15Tooltip = ma15Status.key === 'N/A'
            ? i18n[lang].ma15Tooltip.na
            : (i18n[lang].ma15Tooltip[ma15Status.key] || '');
        const ma15Bold = ma15Status.bold ? 'font-bold' : '';
        const ma15SvgIcons = {
            '⏫ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8-8 8 8H4z"/><path d="M4 11l8-8 8 8H4z"/></svg>`,
            '⬆️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15l8-8 8 8H4z"/></svg>`,
            '↔️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 12l-4-4v3H3v2h1v3l4-4zm8 0l4 4v-3h1v-2h-1V8l-4 4z"/></svg>`,
            '⬇️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9l-8 8-8-8h16z"/></svg>`,
            '⏬ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6l-8 8-8-8h16z"/><path d="M20 13l-8 8-8-8h16z"/></svg>`,
        };
        const ma15Cell = ma15Status.key === 'N/A'
            ? `<span style="color:#6b7280;">${i18n[lang].notApplicable}</span>`
            : `<span class="inline-flex items-center gap-1 ${ma15Bold}" style="${ma15Status.style}">${ma15SvgIcons[ma15Status.key] || ''}${ma15Status.label}</span>`;
        
        // Highlight headline in yellow if news_impact_score >= 30
        const impactScore = row.news_impact_score || 0;
        const headlineColor = impactScore >= 30 ? 'text-fin-gold font-semibold' : 'text-gray-300';
        
        return `
            <tr class="hover:bg-fin-gold/5 transition-colors">
                <td class="px-4 py-4 text-center text-gray-500 text-xs">${(stateSpotlight.currentPage * stateSpotlight.pageSize) + idx + 1}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatDateTimeSpotlight(row.publish_time)}</td>
                <td class="px-4 py-4">
                    <span class="stock-badge" onclick="openTvChart('${row.single_stock || ''}')" title="${i18n[lang].chartTooltip}">
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
    bindRowTouchEventsSpotlight();
}

// Touch support: highlight stock badge when user taps any cell in a row
function bindRowTouchEventsSpotlight() {
    const tbody = document.getElementById('tableBodySpotlight');
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

function renderSpotlightPaginationUI() {
    console.log('=== RENDER PAGINATION UI ===');
    console.log('stateSpotlight.totalCount:', stateSpotlight.totalCount);
    console.log('stateSpotlight.currentPage:', stateSpotlight.currentPage);
    console.log('stateSpotlight.pageSize:', stateSpotlight.pageSize);
    
    if (stateSpotlight.totalCount === 0) {
        document.getElementById('paginationInfoSpotlight').innerText = '';
        document.getElementById('pageNumbersSpotlight').innerHTML = '';
        document.getElementById('firstBtnSpotlight').disabled = true;
        document.getElementById('prevBtnSpotlight').disabled = true;
        document.getElementById('nextBtnSpotlight').disabled = true;
        document.getElementById('lastBtnSpotlight').disabled = true;
        return;
    }
    
    const start = (stateSpotlight.currentPage * stateSpotlight.pageSize) + 1;
    const end = Math.min(start + stateSpotlight.pageSize - 1, stateSpotlight.totalCount);
    console.log('Pagination display - start:', start, 'end:', end);
    
    document.getElementById('paginationInfoSpotlight').innerText = i18n[(typeof state !== 'undefined' ? state.lang : null) || stateSpotlight.lang || 'vn'].paging(start, end, stateSpotlight.totalCount);
    
    // Calculate total pages
    const totalPages = Math.ceil(stateSpotlight.totalCount / stateSpotlight.pageSize);
    console.log('Total pages:', totalPages);
    
    // Show 3 page numbers on mobile, 5 on wider screens
    const maxPages = window.innerWidth < 480 ? 3 : 5;
    
    // Generate page numbers
    const pageNumbersSpotlightContainer = document.getElementById('pageNumbersSpotlight');
    pageNumbersSpotlightContainer.innerHTML = '';
    
    // Show max page numbers at a time
    let startPage = Math.max(0, stateSpotlight.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - (maxPages - 1));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
            i === stateSpotlight.currentPage 
                ? 'bg-fin-gold text-fin-blue border border-fin-gold' 
                : 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
        }`;
        pageBtn.innerText = i + 1;
        pageBtn.onclick = () => {
            stateSpotlight.currentPage = i;
            fetchSpotlightData();
        };
        pageNumbersSpotlightContainer.appendChild(pageBtn);
    }
    
    document.getElementById('firstBtnSpotlight').disabled = stateSpotlight.currentPage === 0;
    document.getElementById('prevBtnSpotlight').disabled = stateSpotlight.currentPage === 0;
    document.getElementById('nextBtnSpotlight').disabled = end >= stateSpotlight.totalCount;
    document.getElementById('lastBtnSpotlight').disabled = end >= stateSpotlight.totalCount;
}

// ─── Excel Export ──────────────────────────────────────────────────────────

window.exportSpotlightToExcel = async function exportSpotlightToExcel(btnRef) {
    console.log('=== SPOTLIGHT EXPORT CLICKED ===');
    const btn = btnRef || document.getElementById('exportBtnSpotlight');
    const btnText = btn ? btn.querySelector('span[id="exportBtnSpotlightText"], span') : null;
    if (!btn || !btnText) {
        console.error('Export button elements not found', { btn, btnText });
        return;
    }
    
    // Guard: ensure dates are initialized
    if (!stateSpotlight.fromDateSpotlight || !stateSpotlight.toDateSpotlight) {
        console.error('Export failed: dates not initialized');
        return;
    }
    
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateSpotlight.lang || 'vn';
    const originalText = btnText.innerText;
    
    console.log('Export started - Current sort:', stateSpotlight.sortCol, stateSpotlight.sortDesc ? 'DESC' : 'ASC');
    
    // Disable button and show loading state
    btn.disabled = true;
    btnText.innerText = i18n[lang].exporting;
    btn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        // Fetch ALL filtered records in batches (Supabase max: 1000 per request)
        const batchSize = 1000;
        let allData = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${stateSpotlight.fromDateSpotlight}T00:00:00Z&publish_time=lte.${stateSpotlight.toDateSpotlight}T23:59:59Z`;
            
            // Apply search query filter
            if (stateSpotlight.searchQuery) {
                const stockCodes = stateSpotlight.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filter popup filters (includes recommendation=eq.hold by default)
            const filterQuery = buildSpotlightFilterQuery();
            if (filterQuery) {
                url += filterQuery;
            }
            
            // For headline and price_change_today_pct, sort client-side; otherwise server-side
            if (stateSpotlight.sortCol === 'headline' || stateSpotlight.sortCol === 'price_change_today_pct') {
                url += `&order=publish_time.desc`;
            } else {
                url += `&order=${getDbFieldSpotlight(stateSpotlight.sortCol)}.${stateSpotlight.sortDesc ? 'desc' : 'asc'}.nullslast`;
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
            if (!Array.isArray(batch)) {
                console.error('Supabase export error:', batch);
                throw new Error(batch?.message || 'Supabase returned non-array response');
            }
            if (batch.length === 0) {
                hasMore = false;
                break;
            }

            allData = allData.concat(batch);
            
            if (batch.length < batchSize) {
                hasMore = false;
            } else {
                offset += batchSize;
            }

            btnText.innerText = `${i18n[lang].exporting} (${allData.length})`;
        }

        // Client-side sort for %Chg column
        if (stateSpotlight.sortCol === 'price_change_today_pct') {
            const dir = stateSpotlight.sortDesc ? -1 : 1;
            allData.sort((a, b) => {
                const av = a.price_change_today_pct ?? 0;
                const bv = b.price_change_today_pct ?? 0;
                return dir * (bv - av);
            });
        }
        
        // Client-side sort for headline column by news_impact_score
        if (stateSpotlight.sortCol === 'headline') {
            allData.sort((a, b) => {
                const av = a.news_impact_score ?? 0;
                const bv = b.news_impact_score ?? 0;
                return stateSpotlight.sortDesc ? bv - av : av - bv;
            });
        }

        // Build Excel data
        const headers = [
            i18n[lang].cols.index,
            i18n[lang].cols.publish_time,
            i18n[lang].cols.single_stock,
            i18n[lang].cols.price_change_today_pct,
            i18n[lang].cols.ma15,
            i18n[lang].cols.organ_name,
            i18n[lang].cols.industry,
            i18n[lang].cols.current_close,
            i18n[lang].cols.current_volume,
            i18n[lang].cols.headline,
            i18n[lang].cols.link
        ];

        const rows = allData.map((row, idx) => {
            const name = lang === 'vn' ? row.organ_name : (stateSpotlight.translatedNames[row.organ_name] || row.organ_name);
            const industry = lang === 'vn' ? row.industry_vn : (row.industry_en || row.industry_vn);
            const headline = lang === 'vn' ? row.headline : (stateSpotlight.translatedHeadlines[row.headline] || row.headline);
            const ma15Status = getMA15StatusSpotlight(row.pct_ma15);
            const ma15Text = ma15Status.key === 'N/A' ? i18n[lang].notApplicable : ma15Status.key;

            return [
                idx + 1,
                formatDateTimeSpotlight(row.publish_time),
                row.single_stock || '-',
                row.price_change_today_pct != null ? `${row.price_change_today_pct.toFixed(2)}%` : '0.00%',
                ma15Text,
                name || '-',
                industry || '-',
                row.current_close ? (row.current_close / 1000).toFixed(1) : '-',
                row.current_volume ? (row.current_volume / 1000000).toFixed(2) + 'M' : '-',
                headline || '-',
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
                ...rows.slice(0, 100).map(r => String(r[i] || '').length)
            );
            return { wch: Math.min(maxLen + 2, 50) };
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, i18n[lang].spotlight.sheetName);

        const filename = `${i18n[lang].exportFilePrefix.spotlight}_${stateSpotlight.fromDateSpotlight}_${stateSpotlight.toDateSpotlight}.xlsx`;
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Export error:', error);
        alert(i18n[stateSpotlight.lang].exportErrorWithMessage.replace('{message}', error.message || i18n[stateSpotlight.lang].exportError.split('. ')[1]));
    } finally {
        btn.disabled = false;
        btnText.innerText = originalText;
        btn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
}

// ─── Company Name Tooltip ──────────────────────────────────────────────────
// Note: showCompanyTooltip and openTvChart are defined in coreview_stock.js and shared globally.

