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
        if (typeof window.clearDefaultRangeFiltersForTab === 'function') {
            window.clearDefaultRangeFiltersForTab('stock');
        }
        if (typeof window.invalidateBoundsForTab === 'function') {
            window.invalidateBoundsForTab('stock');
        }
        fetchData().then(() => {
            if (typeof window.refreshBoundsForTab === 'function') {
                window.refreshBoundsForTab('stock');
            }
        });
    });
    
    createPicker('toDate', (iso) => {
        state.toDate = iso;
        setPickerLimits('fromDate', minDate, iso);
        if (state.fromDate > iso) {
            state.fromDate = iso;
            setPickerValue('fromDate', iso);
        }
        state.currentPage = 0;
        if (typeof window.clearDefaultRangeFiltersForTab === 'function') {
            window.clearDefaultRangeFiltersForTab('stock');
        }
        if (typeof window.invalidateBoundsForTab === 'function') {
            window.invalidateBoundsForTab('stock');
        }
        fetchData().then(() => {
            if (typeof window.refreshBoundsForTab === 'function') {
                window.refreshBoundsForTab('stock');
            }
        });
    });

    setPickerLimits('fromDate', minDate, maxDate);
    setPickerLimits('toDate', minDate, maxDate);

    // Only set default dates on first load; preserve user selection on tab revisit
    if (!state.fromDate) state.fromDate = dateToIso(lastWeek);
    if (!state.toDate) state.toDate = maxDate;
    
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
    fetchData().then(() => {
        if (typeof window.refreshBoundsForTab === 'function') {
            window.refreshBoundsForTab('stock');
        }
    });
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

    const stockVideoBtnText = document.getElementById('stockVideoBtnText');
    if (stockVideoBtnText) stockVideoBtnText.innerText = i18n[state.lang].watchNewsBtn;

    const fastNewsBtnText = document.getElementById('fastNewsBtnText');
    if (fastNewsBtnText) {
        fastNewsBtnText.innerText = window._fastNewsMode ? 
            (i18n[state.lang].hideFastNewsBtn || '❌ Ẩn tóm tắt') : 
            (i18n[state.lang].fastNewsBtn || '⚡ Điểm tin nhanh');
    }

    // Removed active styling changes for fast news button so it stays the same format
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
            const lastPage = Math.ceil(state.totalCount / state.pageSize) - 1;
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

// ─── Fast News Toggle ───────────────────────────────────────────────────────

window._fastNewsMode = false;

function toggleFastNews() {
    window.toggleFastNewsGeneric('fastNewsBtnText', renderBody);
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

        if (filterState.stock.volume && typeof filterState.stock.volume.min === 'number' && typeof filterState.stock.volume.max === 'number') {
            const minVolume = Math.floor(filterState.stock.volume.min * 1000000);
            const maxVolume = Math.ceil(filterState.stock.volume.max * 1000000);
            filters.push(`current_volume=gte.${minVolume}`);
            filters.push(`current_volume=lte.${maxVolume}`);
        }

        if (filterState.stock.price && typeof filterState.stock.price.min === 'number' && typeof filterState.stock.price.max === 'number') {
            const minPrice = Math.floor(filterState.stock.price.min * 1000);
            const maxPrice = Math.ceil(filterState.stock.price.max * 1000);
            filters.push(`current_close=gte.${minPrice}`);
            filters.push(`current_close=lte.${maxPrice}`);
        }

        if (filterState.stock.priceChange && typeof filterState.stock.priceChange.min === 'number' && typeof filterState.stock.priceChange.max === 'number') {
            const minPriceChange = filterState.stock.priceChange.min;
            const maxPriceChange = filterState.stock.priceChange.max;
            filters.push(`price_change_today_pct=gte.${minPriceChange}`);
            filters.push(`price_change_today_pct=lte.${maxPriceChange}`);
        }
    }
    
    // Filter out records where quote_50_word is empty
    filters.push('quote_50_word=not.is.null');
    filters.push('quote_50_word=neq.');

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
                let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${state.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${state.toDate}T23:59:59%2B07:00:00`;
                
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
            
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${state.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${state.toDate}T23:59:59%2B07:00:00`;
            
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
            const filterQuery = buildFilterQuery();
            console.debug('fetchData: Applying filters, filterState.stock.volume =', filterState.stock && filterState.stock.volume, 'filterQuery=', filterQuery);
            url += filterQuery;
            
            const nullsOrder = state.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getDbField(state.sortCol)}.${state.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

            console.debug('fetchData: requesting URL', url);
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
                    console.debug('[Stock] Sorting %Chg client-side, direction:', state.sortDesc ? 'DESC' : 'ASC');
                    state.data.sort((a, b) => {
                        const av = Number(a.price_change_today_pct ?? 0);
                        const bv = Number(b.price_change_today_pct ?? 0);
                        return dir * (av - bv);
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
        await prefetchHeadlineTranslations(state.data, state.lang);
        renderBody();
        renderPaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderHeaders() {
    const cols = [
        { id: 'index',                 w: 'w-12 text-center', s: false },
        { id: 'publish_time',          w: 'w-20',  s: true },
        { id: 'single_stock',          w: 'w-20',  s: true },
        { id: 'price_change_today_pct',w: 'w-20',  s: true },
        { id: 'ma15',                  w: 'w-24',  s: true, dbField: 'pct_ma15' },
        { id: 'current_close',         w: 'w-20',  s: true },
        { id: 'current_volume',        w: 'w-20',  s: true },
        { id: 'organ_name',            w: 'w-28',  s: true },
        { id: 'industry',              w: 'w-20',  s: true },
        { id: 'headline',              w: 'w-auto', s: true }
    ];
    document.getElementById('tableHeader').innerHTML = cols.map(c => `
        <th class="px-2 py-4 ${c.s ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.s ? getSortClass(c.id) : ''}" 
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
    if (colId === 'industry') return 'industry_vn';
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
    if (id === 'price_change_today_pct') {
        console.debug('[Stock] handleSort: %Chg clicked. sortCol=', state.sortCol, 'sortDesc=', state.sortDesc ? 'DESC' : 'ASC');
    }
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

    // Clear headline translation cache for the current language so that
    // all translations are re-fetched fresh from mul_lang_headline.
    if (window.headlineTranslationCache && state.lang && state.lang !== 'vi') {
        const suffix = `_${state.lang}`;
        Object.keys(window.headlineTranslationCache).forEach(key => {
            if (key.endsWith(suffix)) {
                delete window.headlineTranslationCache[key];
            }
        });
        console.log(`[Refresh Stock] Cleared translation cache for lang="${state.lang}"`);
    }

    // Reset to first page and refetch (main data + translations)
    state.currentPage = 0;
    fetchData();
}

// Toggle clear button visibility
function toggleClearBtn(btnId, value) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('hidden', !value);
}

// Clear stock search input
function clearStockSearch() {
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
    const btn = document.getElementById('clearStockBtn');
    if (btn) btn.classList.add('hidden');
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
        const name = getTranslatedOrgan(row.single_stock, row.organ_name, state.lang);
        const industry = getTranslatedIndustry(row.industry_vn, state.lang);
        const headline = getTranslatedHeadline(row, state.lang);
        const pct = row.price_change_today_pct || 0;
        const color = pct > 0 ? 'text-fin-green' : (pct < 0 ? 'text-fin-red' : 'text-gray-400');
        
        // Get MA15 status
        const ma15Status = getMA15Status(row.pct_ma15);
        const ma15TooltipKey = ma15Status.key === 'N/A'
            ? 'na'
            : (ma15Status.key === '⏫ MA15' ? 'strongAbove'
                : ma15Status.key === '⬆️ MA15' ? 'above'
                : ma15Status.key === '↔️ MA15' ? 'at'
                : ma15Status.key === '⬇️ MA15' ? 'below'
                : ma15Status.key === '⏬ MA15' ? 'strongBelow'
                : 'na');
        const ma15Tooltip = i18n[state.lang].ma15Tooltip[ma15TooltipKey];
        const ma15Bold = ma15Status.bold ? 'font-bold' : '';
        const ma15SvgIcons = {
            '⏫ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8-8 8 8H4z"/><path d="M4 11l8-8 8 8H4z"/></svg>`,
            '⬆️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15l8-8 8 8H4z"/></svg>`,
            '↔️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 12l-4-4v3H3v2h1v3l4-4zm8 0l4 4v-3h1v-2h-1V8l-4 4z"/></svg>`,
            '⬇️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9l-8 8-8-8h16z"/></svg>`,
            '⏬ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6l-8 8-8-8h16z"/><path d="M20 13l-8 8-8-8h16z"/></svg>`,
        };
        const ma15Cell = ma15Status.key === 'N/A'
            ? `<span style="color:#6b7280;">${i18n[state.lang].notApplicable}</span>`
            : `<span class="inline-flex items-center gap-1 ${ma15Bold}" style="${ma15Status.style}">${ma15SvgIcons[ma15Status.key] || ''}${ma15Status.label}</span>`;
        
        // Highlight headline in yellow if news_impact_score >= 30
        const impactScore = row.news_impact_score || 0;
        const headlineColor = impactScore >= 40 ? 'text-fin-gold font-semibold' : 'text-gray-300';
        
        return `
            <tr class="hover:bg-fin-gold/5 transition-colors"
                data-quote="${(row.quote_50_word||'').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"
                data-stock="${(row.single_stock||'').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"
                data-source="${(row.source_name||'').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"
                data-headline="${(headline||'').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}"
                data-link="${(row.news_link||'').replace(/"/g, '&quot;')}"
                data-time="${formatDateTime(row.publish_time)}"
                onclick="window.toggleNewsQuoteTooltip&&toggleNewsQuoteTooltip(event, this)">
                <td class="px-2 py-2 text-center text-gray-500 text-xs">${(state.currentPage * state.pageSize) + idx + 1}</td>
                <td class="px-2 py-2 text-gray-400 text-xs">${formatDateTime(row.publish_time)}</td>
                <td class="px-2 py-2">
                    <span class="stock-badge" onclick="openTvChart('${row.single_stock || ''}', '${row.com_group_code || ''}')" title="${i18n[state.lang].chartTooltip}">
                        ${row.single_stock || '-'}
                        <svg class="chart-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                        </svg>
                    </span>
                </td>
                <td class="px-2 py-2 font-bold ${color} text-sm">${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</td>
                <td class="px-2 py-2 text-xs company-name-cell" onclick="showCompanyTooltip(event, this)" title="${ma15Tooltip}"><div class="flex items-center">${ma15Cell}</div></td>
                <td class="px-2 py-2 font-semibold text-xs">${(row.current_close/1000).toFixed(1)}</td>
                <td class="px-2 py-2 text-gray-400 text-xs">${(row.current_volume/1000000).toFixed(2)}M</td>
                <td class="px-2 py-2 text-gray-200 text-xs truncate max-w-[200px] company-name-cell" onclick="showCompanyTooltip(event, this)" title="${name}">${name || '-'}</td>
                <td class="px-2 py-2 text-gray-400 text-xs">${industry || '-'}</td>
                <td class="px-2 py-2"
                    onmouseenter="(function(e, el){ e.stopPropagation(); var tr=el.closest('tr'); var q=window.extractFixedSentences&&extractFixedSentences(tr.dataset.quote, tr.dataset.stock); if(!q) q=(typeof state!=='undefined'&&state.lang==='en')?'Updating...':'Đang cập nhật...'; if(q) showNewsQuoteTooltip(e, q, tr.dataset.source, null, null, tr.dataset.headline, tr.dataset.time); })(event, this)"
                    onmouseleave="(function(e, el){ var tr=el.closest('tr'); if (window._toggledNewsQuoteTr === tr) { var q=window.extractFixedSentences&&extractFixedSentences(tr.dataset.quote, tr.dataset.stock); if(!q) q=(typeof state!=='undefined'&&state.lang==='en')?'Updating...':'Đang cập nhật...'; if(q) showNewsQuoteTooltip(e, q, tr.dataset.source, tr, tr.dataset.link, tr.dataset.headline); } else { hideNewsQuoteTooltip&&hideNewsQuoteTooltip(); } })(event, this)">
                    <a href="${row.news_link}" target="_blank" class="${headlineColor} hover:text-fin-gold hover:underline transition-all text-xs line-clamp-1">
                        ${headline}
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    // If fast news mode is active, insert inline quote rows below each data row
    if (window._fastNewsMode) {
        window.injectFastNewsRowsGeneric('tableBody', 'stock');
    }

    // Bind touch events for mobile row highlight
    bindRowTouchEvents();
}

// Note: _injectFastNewsRows and _updateFastNewsWidths have been extracted to window.injectFastNewsRowsGeneric

// Listen to resize to update widths
window.addEventListener('resize', () => {
    if (window._fastNewsMode) {
        _updateFastNewsWidths();
    }
});

// Safe HTML escaping helper for fast news rows
function _fnqEsc(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
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
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${state.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${state.toDate}T23:59:59%2B07:00:00`;
            
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
            console.debug('[Stock][Export] Sorting %Chg client-side, direction:', state.sortDesc ? 'DESC' : 'ASC');
            allData.sort((a, b) => {
                const av = Number(a.price_change_today_pct ?? 0);
                const bv = Number(b.price_change_today_pct ?? 0);
                return dir * (av - bv);
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

        // Prefetch headline translations for the full export dataset
        await prefetchHeadlineTranslations(allData, state.lang);

        // Build Excel data
        const headers = [
            i18n[state.lang].cols.index,
            i18n[state.lang].cols.publish_time,
            i18n[state.lang].cols.single_stock,
            i18n[state.lang].cols.price_change_today_pct,
            i18n[state.lang].cols.ma15,
            i18n[state.lang].cols.current_close,
            i18n[state.lang].cols.current_volume,
            i18n[state.lang].cols.organ_name,
            i18n[state.lang].cols.industry,
            i18n[state.lang].cols.headline,
            i18n[state.lang].cols.link
        ];

        const rows = allData.map((row, idx) => {
            const name = getTranslatedOrgan(row.single_stock, row.organ_name, state.lang);
            const industry = getTranslatedIndustry(row.industry_vn, state.lang);
            const headline = getTranslatedHeadline(row, state.lang);
            const ma15Status = getMA15Status(row.pct_ma15);
            const ma15Text = ma15Status.key === 'N/A' ? i18n[state.lang].notApplicable : ma15Status.key;

            return [
                idx + 1,
                formatDateTime(row.publish_time),
                row.single_stock || '-',
                row.price_change_today_pct ? `${row.price_change_today_pct.toFixed(2)}%` : '0.00%',
                ma15Text,
                row.current_close ? (row.current_close / 1000).toFixed(1) : '-',
                row.current_volume ? (row.current_volume / 1000000).toFixed(2) + 'M' : '-',
                name || '-',
                industry || '-',
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

        XLSX.utils.book_append_sheet(wb, ws, i18n[state.lang].excelSheetName);

        // Generate filename with date range
        const filename = `${i18n[state.lang].exportFilePrefix.stock}_${state.fromDate}_${state.toDate}.xlsx`;
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Export error:', error);
        alert(i18n[state.lang].exportError);
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

// ─── News Quote Tooltip (shared globally) ──────────────────────────────────

/**
 * Decode HTML entities (e.g. &aacute; → á) to proper Unicode.
 * The DB stores quote_50_word / summary with HTML entities which must be
 * decoded before display — otherwise they appear as raw text in the popup.
 */
window.decodeHtmlEntities = function(str) {
    if (!str || str.indexOf('&') === -1) return str; // fast-path: no entities
    const ta = document.createElement('textarea');
    ta.innerHTML = str;
    return ta.value;
};

/**
 * Extract up to 2 complete sentences anchored to the first sentence that
 * mentions `ticker` inside `text` (hotnews.quote_50_word).
 * Split on ". " followed by an uppercase character (Vietnamese-safe).
 */
window.extractFixedSentences = function(text, ticker) {
    if (!text || !ticker) return '';

    // Decode HTML entities first so the text is clean Unicode
    // (quote_50_word is stored with entities like &aacute; in the DB)
    text = window.decodeHtmlEntities(text);

    const sentences = text.split(/\.(?=\s+\p{Lu})/u)
                          .map(s => s.trim())
                          .filter(s => s.length > 0);

    const tickerRegex = new RegExp(`\\b${ticker}\\b`, 'i');
    const tickerIndex = sentences.findIndex(s => tickerRegex.test(s));

    let finalText = text;
    if (tickerIndex !== -1) {
        const result = [sentences[tickerIndex]];
        if (tickerIndex + 1 < sentences.length) {
            result.push(sentences[tickerIndex + 1]);
        }
        finalText = '... ' + result.join('. ') + ' ...';
    }

    // Escape HTML to prevent XSS
    const div = document.createElement('div');
    div.textContent = finalText;
    let safeHTML = div.innerHTML;

    // Highlight ticker (yellow and bold)
    const highlightRegex = new RegExp(`\\b(${ticker})\\b`, 'gi');
    safeHTML = safeHTML.replace(highlightRegex, '<span class="text-fin-gold font-bold">$1</span>');

    return safeHTML;
};

// Show the news-quote-tooltip next to the hovered headline cell.
(function() {
    let _nqHideTimer = null;
    let _nqScrollRafId = null;

    function _nqPosition(e) {
        const tip = document.getElementById('news-quote-tooltip');
        if (!tip) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 12;

        tip.style.maxWidth = Math.min(480, vw - 32) + 'px';
        
        // Reset max-height and overflow before measuring to get true height
        tip.style.maxHeight = '';
        tip.style.overflowY = 'hidden';

        const tw = tip.offsetWidth  || 420;
        const th = tip.offsetHeight || 60;

        let x = (e.clientX ?? vw / 2) - tw / 2;
        x = Math.max(margin, Math.min(x, vw - tw - margin));

        const clientY = e.clientY ?? vh / 2;
        const spaceAbove = clientY - margin * 2;
        const spaceBelow = vh - clientY - margin * 2;
        
        let y;
        let finalMaxHeight;

        if (spaceBelow >= th || spaceBelow > spaceAbove) {
            // Place below
            y = clientY + 18;
            finalMaxHeight = Math.max(100, spaceBelow - 18);
        } else {
            // Place above
            y = clientY - Math.min(th, spaceAbove) - 18;
            finalMaxHeight = Math.max(100, spaceAbove - 18);
        }

        y = Math.max(margin, y);

        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
        tip.style.maxHeight = finalMaxHeight + 'px';
        tip.style.overflowY = th > finalMaxHeight ? 'auto' : 'hidden';
    }

    // Reposition the tooltip anchored to a row.
    // For stock rows: uses the .stock-badge element as the anchor point.
    // For macro rows (no .stock-badge): uses the row's own bounding rect.
    function _nqRepositionToAnchor(tip, trElement) {
        if (!tip || !trElement) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const margin = 8;
        const stockBadge = trElement.querySelector ? trElement.querySelector('.stock-badge') : null;
        let rect;
        if (stockBadge) {
            rect = stockBadge.getBoundingClientRect();
        } else if (trElement.getBoundingClientRect) {
            // macro row — anchor below the row itself
            const rowRect = trElement.getBoundingClientRect();
            rect = { left: rowRect.left + 8, bottom: rowRect.bottom, top: rowRect.top, right: rowRect.left + 80 };
        } else {
            return;
        }
        // Reset max-height and overflow to get true height
        tip.style.maxHeight = '';
        tip.style.overflowY = 'hidden';
        
        const tw = tip.offsetWidth || 420;
        const th = tip.offsetHeight || 60;
        
        let x = rect.left;
        if (x + tw > vw - margin) x = vw - tw - margin;
        if (x < margin) x = margin;

        const spaceAbove = rect.top - margin * 2;
        const spaceBelow = vh - rect.bottom - margin * 2;
        
        let y;
        let finalMaxHeight;

        if (spaceBelow >= th || spaceBelow > spaceAbove) {
            // Place below
            y = rect.bottom + margin;
            finalMaxHeight = Math.max(100, spaceBelow);
        } else {
            // Place above
            y = rect.top - Math.min(th, spaceAbove) - margin;
            finalMaxHeight = Math.max(100, spaceAbove);
        }
        
        y = Math.max(margin, y);

        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
        tip.style.maxHeight = finalMaxHeight + 'px';
        tip.style.overflowY = th > finalMaxHeight ? 'auto' : 'hidden';
    }

    // On scroll: reposition the popup to stay glued to its anchor row
    function _nqOnScroll() {
        cancelAnimationFrame(_nqScrollRafId);
        _nqScrollRafId = requestAnimationFrame(() => {
            const tip = document.getElementById('news-quote-tooltip');
            if (!tip || !tip.classList.contains('visible') || tip.dataset.anchorMode !== 'true') return;
            // Determine the active anchor row (stock or macro tabs)
            const anchorTr = window._toggledNewsQuoteTr || window._toggledMacroTr || null;
            if (anchorTr) {
                _nqRepositionToAnchor(tip, anchorTr);
            }
        });
    }

    // Attach scroll listener once — fires on the window (covers all scrollable containers)
    window.addEventListener('scroll', _nqOnScroll, { passive: true });
    // Also cover the inner table-container scroll (horizontal or vertical)
    document.addEventListener('scroll', _nqOnScroll, { passive: true, capture: true });

    // Expose reposition helper globally so other tab scripts can reuse it
    window._nqRepositionToAnchor = _nqRepositionToAnchor;

    window.showNewsQuoteTooltip = function(e, quoteText, sourceName, anchorTr = null, link = null, title = null, time = null) {
        if (!quoteText) return;
        const tip = document.getElementById('news-quote-tooltip');
        if (!tip) return;

        clearTimeout(_nqHideTimer);
        tip.classList.remove('visible');
        tip.dataset.showTime = Date.now(); // Track when it was shown for mobile logic
        tip.dataset.link = link || (anchorTr ? anchorTr.dataset.link : '');
        tip.dataset.anchorMode = anchorTr ? 'true' : 'false';
        
        if (anchorTr) {
            tip.style.pointerEvents = 'auto';
            tip.style.cursor = 'pointer';
        } else {
            tip.style.pointerEvents = 'none';
            tip.style.cursor = 'default';
        }

        const reqId = String(Date.now() + Math.random());
        tip.dataset.reqId = reqId;

        // Safely escape plain text for innerHTML
        const esc = (t) => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
        // Decode HTML entities (e.g. &aacute; → á) so translated headlines render correctly
        const decodeHtml = (html) => { const ta = document.createElement('textarea'); ta.innerHTML = html; return ta.value; };

        const rawTitle = title ? decodeHtml(title) : '';
        // quoteText may still carry HTML entities if it came from the macro summary path
        // (macro summary is read from dataset.summary which stores raw DB entities).
        // decodeHtmlEntities converts e.g. &aacute; → á before display.
        const plainQuote = quoteText
            ? window.decodeHtmlEntities((new DOMParser().parseFromString(quoteText, 'text/html')).body.textContent)
            : '';
        const currentLang = window._appLang || 'vi';

        // Helper: find ticker from clicked row (anchorTr) or hovered row
        const getTicker = () => {
            if (anchorTr && anchorTr.dataset && anchorTr.dataset.stock) return anchorTr.dataset.stock;
            if (e && e.target && e.target.closest) {
                const hoveredTr = e.target.closest('tr');
                if (hoveredTr && hoveredTr.dataset && hoveredTr.dataset.stock) return hoveredTr.dataset.stock;
            }
            return null;
        };

        // Helper: highlight all occurrences of the ticker in gold+bold inside escaped HTML
        const applyTickerHighlight = (safeHTML) => {
            const ticker = getTicker();
            if (!ticker) return safeHTML;
            const safeTicker = ticker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const highlightRegex = new RegExp(`\\b(${safeTicker})\\b`, 'gi');
            return safeHTML.replace(highlightRegex, '<span style="color:#ffd700;font-weight:bold;">$1</span>');
        };

        let htmlContent = '';
        if (sourceName) {
            const displayTime = time || (anchorTr && anchorTr.dataset && anchorTr.dataset.time ? anchorTr.dataset.time : null);
            const displaySource = displayTime ? `${sourceName} ${displayTime}` : sourceName;
            htmlContent += `<div style="font-size: 10px; color: #9ca3af; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em;">${esc(displaySource)}</div>`;
        }
        if (rawTitle) {
            htmlContent += `<div id="nq-title" style="font-size: 12px; color: #ffd700; font-weight: 600; margin-bottom: 6px; line-height: 1.4;">${esc(rawTitle)}</div>`;
        }

        if (currentLang === 'vi') {
            // Vietnamese: extractFixedSentences already applied highlight spans — use directly
            htmlContent += `<div id="nq-quote" style="font-size: 12px; color: #d1d5db; line-height: 1.5;">${quoteText}</div>`;
        } else {
            // Non-Vietnamese: show plain text with loading indicator while translation fetches
            htmlContent += `<div id="nq-quote" style="font-size: 12px; color: #d1d5db; line-height: 1.5;">${applyTickerHighlight(esc(plainQuote))} <span style="opacity:0.5;">(...)</span></div>`;
        }

        tip.innerHTML = htmlContent;

        if (currentLang !== 'vi' && window.translateText) {
            if (rawTitle) {
                window.translateText(rawTitle, currentLang).then(translated => {
                    if (tip.dataset.reqId === reqId) {
                        const tEl = tip.querySelector('#nq-title');
                        if (tEl) tEl.innerHTML = esc(translated);
                    }
                });
            }
            if (plainQuote) {
                window.translateText(plainQuote, currentLang).then(translated => {
                    if (tip.dataset.reqId === reqId) {
                        const qEl = tip.querySelector('#nq-quote');
                        if (qEl) qEl.innerHTML = applyTickerHighlight(esc(translated));
                    }
                });
            }
        }

        requestAnimationFrame(() => {
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            tip.style.maxWidth = Math.min(480, vw - 32) + 'px';

            if (anchorTr) {
                _nqRepositionToAnchor(tip, anchorTr);
            } else {
                _nqPosition(e);
            }
            tip.classList.add('visible');
        });
    };

    window._toggledNewsQuoteTr = null;

    window.toggleNewsQuoteTooltip = function(e, trElement) {
        const tip = document.getElementById('news-quote-tooltip');
        if (!tip) return;

        // Don't toggle if the click was on the stock-badge (chart link) or a <a> headline
        if (e.target.closest('.stock-badge') || e.target.closest('a')) return;
        
        if (tip.classList.contains('visible') && window._toggledNewsQuoteTr === trElement) {
            window.hideNewsQuoteTooltip();
            window._toggledNewsQuoteTr = null;
        } else {
            var q = window.extractFixedSentences && extractFixedSentences(trElement.dataset.quote, trElement.dataset.stock);
            if (!q) {
                q = (typeof state !== 'undefined' && state.lang === 'en') ? 'Updating...' : 'Đang cập nhật...';
            }
            var link = trElement.dataset.link || '';
            var title = trElement.dataset.headline || '';
            if (q) {
                // Clear macro tab state when switching to a stock tab row
                window._toggledMacroTr = null;
                window.showNewsQuoteTooltip(e, q, trElement.dataset.source, trElement, link, title);
                window._toggledNewsQuoteTr = trElement;
            }
        }
    };

    window.hideNewsQuoteTooltip = function() {
        const tip = document.getElementById('news-quote-tooltip');
        if (!tip) return;
        
        clearTimeout(_nqHideTimer);
        tip.classList.remove('visible');
        // Disable pointer events so hidden popup never blocks clicks on rows beneath it
        tip.style.pointerEvents = 'none';
        tip.dataset.link = '';
    };

    // Close popup when clicking outside any table row or the popup itself
    document.addEventListener('click', function(e) {
        const tip = document.getElementById('news-quote-tooltip');
        if (!tip || !tip.classList.contains('visible')) return;

        // Allow clicks on the popup (to open link)
        if (tip.contains(e.target)) return;

        // Allow clicks on any <tr> (handled by toggle functions)
        if (e.target.closest('tr')) return;

        // Everything else → close
        tip.classList.remove('visible');
        tip.style.pointerEvents = 'none';
        tip.dataset.link = '';
        window._toggledNewsQuoteTr = null;
        window._toggledMacroTr = null;
    }, true); // capture phase so it fires before row onclick
})();

// ─── Exchange Detection ────────────────────────────────────────────────────
// Derives TradingView exchange prefix from the com_group_code DB column.
// com_group_code values: 'HOSE-VNINDEX' | 'HNX-HNXIndex' | 'UPCOM-UpcomIndex'
function detectExchange(comGroupCode) {
    if (!comGroupCode) return 'HOSE';
    const code = comGroupCode.toUpperCase();
    if (code.startsWith('HNX'))   return 'HNX';
    if (code.startsWith('UPCOM')) return 'UPCOM';
    return 'HOSE';
}

// Click ticker → open TradingView in new tab (correct symbol, no popup issues)
function openTvChart(ticker, comGroupCode) {
    if (!ticker || ticker === '-') return;
    const symbol   = ticker.trim().toUpperCase();
    const exchange = detectExchange(comGroupCode);
    window.open(`https://www.tradingview.com/chart/?symbol=${exchange}%3A${symbol}`, '_blank');
}
// Expose functions globally for fast news row injection
window._fnqEsc = function(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

window._updateFastNewsWidths = function() {
    const container = document.querySelector('.table-container');
    if (!container) return;
    const boxes = document.querySelectorAll('.fast-news-inline-box');
    const targetWidth = container.clientWidth - 24; // account for margin 0 12px
    boxes.forEach(box => {
        box.style.width = targetWidth + 'px';
    });
};

window.injectFastNewsRowsGeneric = function(tbodyId, prefixId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    const dataRows = Array.from(tbody.querySelectorAll('tr[data-quote], tr[data-summary]'));
    dataRows.forEach((tr) => {
        const quote = tr.dataset.quote || tr.dataset.summary || '';
        const stock = tr.dataset.stock || '';
        const headline = tr.dataset.headline || '';
        const source = tr.dataset.source || '';
        const time = tr.dataset.time || '';
        const link = tr.dataset.link || '';

        let quoteText = quote;
        // extractFixedSentences is in coreview_stock.js, we assume it's global if loaded
        if (stock && window.extractFixedSentences) {
            let extracted = window.extractFixedSentences(quote, stock);
            if (extracted) quoteText = extracted;
        }

        if (!quoteText) {
            // Wait, for macro it might be legitimately empty if no summary
            if (prefixId === 'macro' && !quote) {
                quoteText = '-';
            } else {
                quoteText = (typeof state !== 'undefined' && state.lang !== 'vi') ? 'Updating...' : 'Đang cập nhật...';
            }
        }

        const decodeHtml = (html) => { const ta = document.createElement('textarea'); ta.innerHTML = html; return ta.value; };
        const rawHeadline = decodeHtml(headline);

        const colCount = tr.children.length;
        const uniqueId = `fnq-${prefixId}-${tr.rowIndex}`;

        const quoteRow = document.createElement('tr');
        quoteRow.className = 'fast-news-quote-row';
        if (stock) quoteRow.dataset.fastNewsRowFor = stock;
        quoteRow.innerHTML = `
            <td colspan="${colCount}" style="padding: 0; border-top: none; vertical-align: top;">
                <div class="fast-news-inline-box" id="${uniqueId}" style="position: sticky; left: 0;">
                    <div class="fast-news-header">
                        <span class="fast-news-source">${source ? window._fnqEsc(source) + (time ? ' · ' + window._fnqEsc(time) : '') : (time ? window._fnqEsc(time) : '')}</span>
                        ${link ? `<a target="_blank" href="${window._fnqEsc(link)}" class="fast-news-link" rel="noopener noreferrer">↗</a>` : ''}
                    </div>
                    <div class="fast-news-headline" id="${uniqueId}-title">${window._fnqEsc(rawHeadline)}</div>
                    <div class="fast-news-quote" id="${uniqueId}-quote">${quoteText}</div>
                </div>
            </td>
        `;

        tr.insertAdjacentElement('afterend', quoteRow);

        requestAnimationFrame(() => {
            const box = document.getElementById(uniqueId);
            if (box) box.classList.add('show');
        });

        const currentLang = window._appLang || (typeof state !== 'undefined' ? state.lang : 'vi');
        if (currentLang !== 'vi' && window.translateText) {
            const plainQuote = quoteText
                ? window.decodeHtmlEntities
                    ? window.decodeHtmlEntities((new DOMParser().parseFromString(quoteText, 'text/html')).body.textContent)
                    : quoteText
                : '';

            const esc = window._fnqEsc;
            const applyHL = (safeHTML) => {
                if (!stock) return safeHTML;
                const safeS = stock.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return safeHTML.replace(new RegExp(`\\b(${safeS})\\b`, 'gi'), '<span style="color:#ffd700;font-weight:bold;">$1</span>');
            };

            if (rawHeadline) {
                window.translateText(rawHeadline, currentLang).then(translated => {
                    const el = document.getElementById(`${uniqueId}-title`);
                    if (el) el.innerHTML = esc(translated);
                });
            }
            if (plainQuote && plainQuote !== '-') {
                window.translateText(plainQuote, currentLang).then(translated => {
                    const el = document.getElementById(`${uniqueId}-quote`);
                    if (el) el.innerHTML = stock ? applyHL(esc(translated)) : esc(translated);
                });
            }
        }
    });

    if (window._updateFastNewsWidths) window._updateFastNewsWidths();
};

window.toggleFastNewsGeneric = function(btnTextId, renderFunction) {
    window._fastNewsMode = !window._fastNewsMode;
    const btnText = document.getElementById(btnTextId);
    if (btnText) {
        btnText.innerText = window._fastNewsMode ? 
            (i18n[state.lang].hideFastNewsBtn || '❌ Ẩn tóm tắt') : 
            (i18n[state.lang].fastNewsBtn || '⚡ Điểm tin nhanh');
    }
    if (typeof renderFunction === 'function') {
        if (window._fastNewsMode) {
            renderFunction();
        } else {
            const boxes = document.querySelectorAll('.fast-news-inline-box.show');
            if (boxes.length > 0) {
                boxes.forEach(box => box.classList.remove('show'));
                setTimeout(() => {
                    renderFunction();
                }, 300);
            } else {
                renderFunction();
            }
        }
    }
};
