// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW STABLE VOLATILITY - Data Fetching & Table Logic
// Version: 1.8 - Fixed headline sort direction bug (DESC/ASC logic)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stock View Initialization ─────────────────────────────────────────────

function initStableView() {
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
    createPicker('fromDateStable', (iso) => {
        stateStable.fromDate = iso;
        setPickerLimits('toDateStable', iso, maxDate);
        if (stateStable.toDate < iso) {
            stateStable.toDate = iso;
            setPickerValue('toDateStable', iso);
        }
        stateStable.currentPage = 0;
        if (typeof window.clearDefaultRangeFiltersForTab === 'function') {
            window.clearDefaultRangeFiltersForTab('stable');
        }
        if (typeof window.invalidateBoundsForTab === 'function') {
            window.invalidateBoundsForTab('stable');
        }
        fetchStableData().then(() => {
            if (typeof window.refreshBoundsForTab === 'function') {
                window.refreshBoundsForTab('stable');
            }
        });
    });
    
    createPicker('toDateStable', (iso) => {
        stateStable.toDate = iso;
        setPickerLimits('fromDateStable', minDate, iso);
        if (stateStable.fromDate > iso) {
            stateStable.fromDate = iso;
            setPickerValue('fromDateStable', iso);
        }
        stateStable.currentPage = 0;
        if (typeof window.clearDefaultRangeFiltersForTab === 'function') {
            window.clearDefaultRangeFiltersForTab('stable');
        }
        if (typeof window.invalidateBoundsForTab === 'function') {
            window.invalidateBoundsForTab('stable');
        }
        fetchStableData().then(() => {
            if (typeof window.refreshBoundsForTab === 'function') {
                window.refreshBoundsForTab('stable');
            }
        });
    });

    setPickerLimits('fromDateStable', minDate, maxDate);
    setPickerLimits('toDateStable', minDate, maxDate);

    // Only set default dates on first load; preserve user selection on tab revisit
    if (!stateStable.fromDate) stateStable.fromDate = dateToIso(lastWeek);
    if (!stateStable.toDate) stateStable.toDate = maxDate;
    
    console.log('Initial state dates - from:', stateStable.fromDate, 'to:', stateStable.toDate);

    setPickerValue('fromDateStable', stateStable.fromDate);
    setPickerValue('toDateStable', stateStable.toDate);

    // Apply cross-constraints based on initial values
    setPickerLimits('fromDateStable', minDate, stateStable.toDate);
    setPickerLimits('toDateStable', stateStable.fromDate, maxDate);

    // Update UI labels based on current language
    updateStableViewLabels();

    // Setup event listeners
    setupStableViewEventListeners();

    // Initial render
    renderStableHeaders();
    console.log('Calling initial fetchStableData...');
    fetchStableData();
}

// Update all stock view labels based on current language
function updateStableViewLabels() {
    const searchInput = document.getElementById('searchInputStable');
    if (searchInput) searchInput.placeholder = i18n[stateStable.lang].searchPlaceholder;
    
    const lblFrom = document.getElementById('lblFromStable');
    if (lblFrom) lblFrom.innerText = i18n[stateStable.lang].lblFrom;
    
    const lblTo = document.getElementById('lblToStable');
    if (lblTo) lblTo.innerText = i18n[stateStable.lang].lblTo;
    
    const prevBtn = document.getElementById('prevBtnStable');
    if (prevBtn) prevBtn.innerText = i18n[stateStable.lang].prev;
    
    const nextBtn = document.getElementById('nextBtnStable');
    if (nextBtn) nextBtn.innerText = i18n[stateStable.lang].next;
    
    const exportBtnText = document.getElementById('exportBtnTextStable');
    if (exportBtnText) exportBtnText.innerText = i18n[stateStable.lang].exportBtn;
    
    const filterBtnText = document.getElementById('filterBtnTextStable');
    if (filterBtnText) filterBtnText.innerText = i18n[stateStable.lang].filterBtn;
    
    const loadingText = document.getElementById('loadingTextStable');
    if (loadingText) loadingText.innerText = i18n[stateStable.lang].loading;
    
    const refreshStockBtn = document.getElementById('refreshStableBtn');
    if (refreshStockBtn) refreshStockBtn.title = i18n[stateStable.lang].refreshBtn;
}

// Setup all event listeners for stock view
function setupStableViewEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInputStable');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            stateStable.searchQuery = e.target.value.toUpperCase();
            stateStable.currentPage = 0;
            fetchStableData();
        });
    }

    // Pagination buttons
    const firstBtn = document.getElementById('firstBtnStable');
    if (firstBtn) {
        firstBtn.onclick = () => { 
            stateStable.currentPage = 0; 
            fetchStableData(); 
        };
    }

    const prevBtn = document.getElementById('prevBtnStable');
    if (prevBtn) {
        prevBtn.onclick = () => { 
            stateStable.currentPage--; 
            fetchStableData(); 
        };
    }

    const nextBtn = document.getElementById('nextBtnStable');
    if (nextBtn) {
        nextBtn.onclick = () => { 
            stateStable.currentPage++; 
            fetchStableData(); 
        };
    }

    const lastBtn = document.getElementById('lastBtnStable');
    if (lastBtn) {
        lastBtn.onclick = () => {
            const lastPage = Math.ceil(stateStable.totalCount / stateStable.pageSize) - 1;
            console.log('=== LAST BUTTON CLICKED ===');
            console.log('Current page:', stateStable.currentPage);
            console.log('Total count:', stateStable.totalCount);
            console.log('Page size:', stateStable.pageSize);
            console.log('Calculated last page:', lastPage);
            stateStable.currentPage = lastPage; 
            fetchStableData(); 
        };
    }
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

// Helper function to build filter query parameters
function buildStableFilterQuery() {
    const filters = [];

    if (typeof filterState !== 'undefined' && filterState.stable) {
        // Stock code filter
        if (filterState.stable.single_stock.has('__NONE__')) {
            filters.push('single_stock=eq.__IMPOSSIBLE__');
        } else if (filterState.stable.single_stock.size > 0) {
            const codes = Array.from(filterState.stable.single_stock);
            if (codes.length === 1) {
                filters.push(`single_stock=eq.${codes[0]}`);
            } else {
                const orConditions = codes.map(code => `single_stock.eq.${code}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }

        // MA15 filter
        if (filterState.stable.ma15.has('__NONE__')) {
            filters.push('pct_ma15=eq.999999');
        } else if (filterState.stable.ma15.size > 0) {
            const ma15Filters = [];
            filterState.stable.ma15.forEach(key => {
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

        // Industry filter
        if (filterState.stable.industry.has('__NONE__')) {
            filters.push('industry_vn=eq.__IMPOSSIBLE__');
        } else if (filterState.stable.industry.size > 0) {
            const industries = Array.from(filterState.stable.industry);
            if (industries.length === 1) {
                filters.push(`industry_vn=eq.${encodeURIComponent(industries[0])}`);
            } else {
                const orConditions = industries.map(ind => `industry_vn.eq.${encodeURIComponent(ind)}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }

        if (filterState.stable.volume && typeof filterState.stable.volume.min === 'number' && typeof filterState.stable.volume.max === 'number') {
            const minVolume = Math.floor(filterState.stable.volume.min * 1000000);
            const maxVolume = Math.ceil(filterState.stable.volume.max * 1000000);
            filters.push(`current_volume=gte.${minVolume}`);
            filters.push(`current_volume=lte.${maxVolume}`);
        }

        if (filterState.stable.price && typeof filterState.stable.price.min === 'number' && typeof filterState.stable.price.max === 'number') {
            const minPrice = Math.floor(filterState.stable.price.min * 1000);
            const maxPrice = Math.ceil(filterState.stable.price.max * 1000);
            filters.push(`current_close=gte.${minPrice}`);
            filters.push(`current_close=lte.${maxPrice}`);
        }

        if (filterState.stable.priceChange && typeof filterState.stable.priceChange.min === 'number' && typeof filterState.stable.priceChange.max === 'number') {
            const minPriceChange = filterState.stable.priceChange.min;
            const maxPriceChange = filterState.stable.priceChange.max;
            filters.push(`price_change_today_pct=gte.${minPriceChange}`);
            filters.push(`price_change_today_pct=lte.${maxPriceChange}`);
        }
    }

    return filters.length > 0 ? '&' + filters.join('&') : '';
}

async function fetchStableData() {
    document.getElementById('loadingStateStable').classList.remove('hidden');
    
    console.log('=== FETCH DATA START ===');
    console.log('Current page:', stateStable.currentPage);
    console.log('Page size:', stateStable.pageSize);
    console.log('Sort column:', stateStable.sortCol);
    console.log('Date range:', stateStable.fromDate, '->', stateStable.toDate);
    
    try {
        let allData = [];
        
        // For headline column, we need to fetch ALL data for accurate client-side sorting
        if (stateStable.sortCol === 'headline') {
            // For headline sorting, we must fetch ALL records to sort correctly
            // We'll fetch in batches if needed
            const batchSize = 1000;
            let allData = [];
            let offset = 0;
            let hasMore = true;
            
            console.log('Fetching all records for headline sorting...');
            
            while (hasMore) {
                let url = `${SUPABASE_URL}/rest/v1/stable_volatility?select=*&match_method=eq.TICKER&publish_time=gte.${stateStable.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${stateStable.toDate}T23:59:59%2B07:00:00`;
                
                // Handle multiple stock codes separated by comma
                if (stateStable.searchQuery) {
                    const stockCodes = stateStable.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                    if (stockCodes.length === 1) {
                        url += `&single_stock=ilike.*${stockCodes[0]}*`;
                    } else if (stockCodes.length > 1) {
                        const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                        url += `&or=(${orConditions})`;
                    }
                }
                
                // Apply filters
                url += buildStableFilterQuery();
                
                // Fetch with default order, will sort client-side
                url += `&order=publish_time.desc&limit=${batchSize}&offset=${offset}`;
                
                console.log('Headline fetch URL:', url);
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
                            stateStable.totalCount = parseInt(match[1]);
                            console.log('Total count from server:', stateStable.totalCount);
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
                stateStable.data = [];
                stateStable.totalCount = 0;
            } else {
                // Client-side sort by news_impact_score
                console.log('Table: Sorting by headline, sortDesc:', stateStable.sortDesc);
                allData.sort((a, b) => {
                    const av = a.news_impact_score ?? 0;
                    const bv = b.news_impact_score ?? 0;
                    if (stateStable.sortDesc) {
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
                if (!stateStable.totalCount) {
                    stateStable.totalCount = allData.length;
                    console.log('Total count from data length:', stateStable.totalCount);
                }
                
                // Apply pagination to sorted results
                const start = stateStable.currentPage * stateStable.pageSize;
                const end = start + stateStable.pageSize;
                console.log('Pagination - start:', start, 'end:', end);
                console.log('Available data length:', allData.length);
                
                stateStable.data = allData.slice(start, end);
                console.log('Sliced data length:', stateStable.data.length);
                console.log('Data records:', stateStable.data.map(r => r.single_stock));
            }
        } else {
            // For other columns, use server-side pagination
            const start = stateStable.currentPage * stateStable.pageSize;
            const end = start + stateStable.pageSize - 1;
            
            let url = `${SUPABASE_URL}/rest/v1/stable_volatility?select=*&match_method=eq.TICKER&publish_time=gte.${stateStable.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${stateStable.toDate}T23:59:59%2B07:00:00`;
            
            // Handle multiple stock codes separated by comma
            if (stateStable.searchQuery) {
                const stockCodes = stateStable.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filters
            url += buildStableFilterQuery();
            console.log('Fetch URL:', url);
            
            const nullsOrder = stateStable.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getStableDbField(stateStable.sortCol)}.${stateStable.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

            const res = await fetch(url, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Range': `${start}-${end}`, 'Prefer': 'count=exact' }
            });

            const json = await res.json();

            // Supabase returns an error object (not an array) on failure
            if (!Array.isArray(json)) {
                console.error('Supabase error:', json);
                stateStable.data = [];
                stateStable.totalCount = 0;
            } else {
                stateStable.data = json;
                // For %Chg column, re-sort client-side treating NULL as 0
                // so NULLs appear between positives and negatives, not at extremes
                if (stateStable.sortCol === 'price_change_today_pct') {
                    const dir = stateStable.sortDesc ? -1 : 1;
                    console.debug('[Stable] Sorting %Chg client-side, direction:', stateStable.sortDesc ? 'DESC' : 'ASC');
                    stateStable.data.sort((a, b) => {
                        const av = Number(a.price_change_today_pct ?? 0);
                        const bv = Number(b.price_change_today_pct ?? 0);
                        return dir * (av - bv);
                    });
                }
                const contentRange = res.headers.get('content-range');
                if (contentRange) {
                    const match = contentRange.match(/\/(\d+)$/);
                    if (match) stateStable.totalCount = parseInt(match[1]);
                } else {
                    stateStable.totalCount = stateStable.data.length;
                }
            }
        }
        

        
        console.log('=== FETCH DATA END ===');
        console.log('Final stateStable.data.length:', stateStable.data.length);
        console.log('Final stateStable.totalCount:', stateStable.totalCount);
        console.log('Final stateStable.currentPage:', stateStable.currentPage);
    } catch (e) { 
        console.error('fetchStableData error:', e);
        stateStable.data = [];
        stateStable.totalCount = 0;
    } finally {
        document.getElementById('loadingStateStable').classList.add('hidden');
        await prefetchHeadlineTranslations(stateStable.data, stateStable.lang);
        renderStableBody();
        renderStablePaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderStableHeaders() {
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
    document.getElementById('tableHeaderStable').innerHTML = cols.map(c => `
        <th class="px-4 py-4 ${c.s ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.s ? getStableSortClass(c.id) : ''}" 
            ${c.s ? `onclick="handleStableSort('${c.id}')"` : ''}>
            <div class="flex items-center">
                <span>${i18n[stateStable.lang].cols[c.id]}</span>
                ${c.s ? '<span class="sort-icon"></span>' : ''}
            </div>
        </th>
    `).join('');
}

// Map display column id → actual database field name (language-aware)
function getStableDbField(colId) {
    if (colId === 'ma15')     return 'pct_ma15';
    if (colId === 'headline') return 'news_impact_score';
    if (colId === 'industry') return 'industry_vn';
    return colId;
}

function getStableSortClass(id) { 
    if (stateStable.sortCol === id) {
        return stateStable.sortDesc ? 'sorted-desc' : 'sorted-asc';
    }
    return 'unsorted';
}

function handleStableSort(id) {
    if (stateStable.sortCol === id) {
        // Same column clicked
        if (!stateStable.sortDesc) {
            // Currently ASC → go to DESC
            stateStable.sortDesc = true;
        } else {
            // Currently DESC → return to default (timesfm_point DESC)
            stateStable.sortCol = 'timesfm_point';
            stateStable.sortDesc = true;
        }
    } else {
        // Different column clicked, start with ASC (except for headline)
        stateStable.sortCol = id;
        if (id === 'headline') {
            stateStable.sortDesc = true; // Highest impact score first for headline
        } else {
            stateStable.sortDesc = false;
        }
    }
    stateStable.currentPage = 0; 
    renderStableHeaders(); 
    if (id === 'price_change_today_pct') {
        console.debug('[Stable] handleStableSort: %Chg clicked. sortCol=', stateStable.sortCol, 'sortDesc=', stateStable.sortDesc ? 'DESC' : 'ASC');
    }
    fetchStableData();
}

// Refresh stock data with current filters (keeps page at 0)
function refreshStableData() {
    const btn = document.getElementById('refreshStableBtn');
    const icon = document.getElementById('refreshStableIcon');
    
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
    if (window.headlineTranslationCache && stateStable.lang && stateStable.lang !== 'vi') {
        const suffix = `_${stateStable.lang}`;
        Object.keys(window.headlineTranslationCache).forEach(key => {
            if (key.endsWith(suffix)) {
                delete window.headlineTranslationCache[key];
            }
        });
        console.log(`[Refresh Stable] Cleared translation cache for lang="${stateStable.lang}"`);
    }

    // Reset to first page and refetch (main data + translations)
    stateStable.currentPage = 0;
    fetchStableData();
}

// Toggle clear button visibility
function toggleClearBtn(btnId, value) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('hidden', !value);
}

// Clear stock search input
function clearStableSearch() {
    const input = document.getElementById('searchInputStable');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
    const btn = document.getElementById('clearStableBtn');
    if (btn) btn.classList.add('hidden');
}

// Format date as dd/mm hh:mm
function formatStableDateTime(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

// Get MA15 status and color based on pct_ma15 value
function getStableMA15Status(pctMa15) {
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

function renderStableBody() {
    const tbody = document.getElementById('tableBodyStable');
    if (stateStable.data.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyStateStable').classList.remove('hidden');
        document.getElementById('emptyStateStable').innerText = i18n[stateStable.lang].empty;
        return;
    }
    document.getElementById('emptyStateStable').classList.add('hidden');
    
    tbody.innerHTML = stateStable.data.map((row, idx) => {
        const name = getTranslatedOrgan(row.single_stock, row.organ_name, stateStable.lang);
        const industry = getTranslatedIndustry(row.industry_vn, stateStable.lang);
        const headline = getTranslatedHeadline(row, stateStable.lang);
        const pct = row.price_change_today_pct || 0;
        const color = pct > 0 ? 'text-fin-green' : (pct < 0 ? 'text-fin-red' : 'text-gray-400');
        
        // Get MA15 status
        const ma15Status = getStableMA15Status(row.pct_ma15);
        const ma15TooltipKey = ma15Status.key === 'N/A'
            ? 'na'
            : (ma15Status.key === '⏫ MA15' ? 'strongAbove'
                : ma15Status.key === '⬆️ MA15' ? 'above'
                : ma15Status.key === '↔️ MA15' ? 'at'
                : ma15Status.key === '⬇️ MA15' ? 'below'
                : ma15Status.key === '⏬ MA15' ? 'strongBelow'
                : 'na');
        const ma15Tooltip = i18n[stateStable.lang].ma15Tooltip[ma15TooltipKey];
        const ma15Bold = ma15Status.bold ? 'font-bold' : '';
        const ma15SvgIcons = {
            '⏫ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8-8 8 8H4z"/><path d="M4 11l8-8 8 8H4z"/></svg>`,
            '⬆️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15l8-8 8 8H4z"/></svg>`,
            '↔️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 12l-4-4v3H3v2h1v3l4-4zm8 0l4 4v-3h1v-2h-1V8l-4 4z"/></svg>`,
            '⬇️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9l-8 8-8-8h16z"/></svg>`,
            '⏬ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6l-8 8-8-8h16z"/><path d="M20 13l-8 8-8-8h16z"/></svg>`,
        };
        const ma15Cell = ma15Status.key === 'N/A'
            ? `<span style="color:#6b7280;">${i18n[stateStable.lang].notApplicable}</span>`
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
                data-time="${formatStableDateTime(row.publish_time)}"
                onclick="window.toggleNewsQuoteTooltip&&toggleNewsQuoteTooltip(event, this)">
                <td class="px-4 py-4 text-center text-gray-500 text-xs">${(stateStable.currentPage * stateStable.pageSize) + idx + 1}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatStableDateTime(row.publish_time)}</td>
                <td class="px-4 py-4">
                    <span class="stock-badge" onclick="openTvChart('${row.single_stock || ''}', '${row.com_group_code || ''}')" title="${i18n[stateStable.lang].chartTooltip}">
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
                <td class="px-4 py-4"
                    onmouseenter="(function(e, el){ e.stopPropagation(); var tr=el.closest('tr'); var q=window.extractFixedSentences&&extractFixedSentences(tr.dataset.quote, tr.dataset.stock); if(q) showNewsQuoteTooltip(e, q, tr.dataset.source, null, null, tr.dataset.headline, tr.dataset.time); })(event, this)"
                    onmouseleave="(function(e, el){ var tr=el.closest('tr'); if (window._toggledNewsQuoteTr === tr) { var q=window.extractFixedSentences&&extractFixedSentences(tr.dataset.quote, tr.dataset.stock); if(q) showNewsQuoteTooltip(e, q, tr.dataset.source, tr, tr.dataset.link, tr.dataset.headline); } else { hideNewsQuoteTooltip&&hideNewsQuoteTooltip(); } })(event, this)">
                    <a href="${row.news_link}" target="_blank" class="${headlineColor} hover:text-fin-gold hover:underline transition-all text-xs line-clamp-1">
                        ${headline}
                    </a>
                </td>
            </tr>
        `;
    }).join('');

    // Bind touch events for mobile row highlight
    bindStableRowTouchEvents();
}

// Touch support: highlight stock badge when user taps any cell in a row
function bindStableRowTouchEvents() {
    const tbody = document.getElementById('tableBodyStable');
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

function renderStablePaginationUI() {
    console.log('=== RENDER PAGINATION UI ===');
    console.log('stateStable.totalCount:', stateStable.totalCount);
    console.log('stateStable.currentPage:', stateStable.currentPage);
    console.log('stateStable.pageSize:', stateStable.pageSize);
    
    if (stateStable.totalCount === 0) {
        document.getElementById('paginationInfoStable').innerText = '';
        document.getElementById('pageNumbersStable').innerHTML = '';
        document.getElementById('firstBtnStable').disabled = true;
        document.getElementById('prevBtnStable').disabled = true;
        document.getElementById('nextBtnStable').disabled = true;
        document.getElementById('lastBtnStable').disabled = true;
        return;
    }
    
    const start = (stateStable.currentPage * stateStable.pageSize) + 1;
    const end = Math.min(start + stateStable.pageSize - 1, stateStable.totalCount);
    console.log('Pagination display - start:', start, 'end:', end);
    
    document.getElementById('paginationInfoStable').innerText = i18n[stateStable.lang].paging(start, end, stateStable.totalCount);
    
    // Calculate total pages
    const totalPages = Math.ceil(stateStable.totalCount / stateStable.pageSize);
    console.log('Total pages:', totalPages);
    
    // Show 3 page numbers on mobile, 5 on wider screens
    const maxPages = window.innerWidth < 480 ? 3 : 5;
    
    // Generate page numbers
    const pageNumbersContainer = document.getElementById('pageNumbersStable');
    pageNumbersContainer.innerHTML = '';
    
    // Show max page numbers at a time
    let startPage = Math.max(0, stateStable.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - (maxPages - 1));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
            i === stateStable.currentPage 
                ? 'bg-fin-gold text-fin-blue border border-fin-gold' 
                : 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
        }`;
        pageBtn.innerText = i + 1;
        pageBtn.onclick = () => {
            stateStable.currentPage = i;
            fetchStableData();
        };
        pageNumbersContainer.appendChild(pageBtn);
    }
    
    document.getElementById('firstBtnStable').disabled = stateStable.currentPage === 0;
    document.getElementById('prevBtnStable').disabled = stateStable.currentPage === 0;
    document.getElementById('nextBtnStable').disabled = end >= stateStable.totalCount;
    document.getElementById('lastBtnStable').disabled = end >= stateStable.totalCount;
}

// ─── Excel Export ──────────────────────────────────────────────────────────

async function exportStableToExcel() {
    const btn = document.getElementById('exportBtnStable');
    const btnText = document.getElementById('exportBtnTextStable');
    const originalText = btnText.innerText;
    
    console.log('Export started - Current sort:', stateStable.sortCol, stateStable.sortDesc ? 'DESC' : 'ASC');
    
    // Disable button and show loading state
    btn.disabled = true;
    btnText.innerText = i18n[stateStable.lang].exporting;
    btn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        // Fetch ALL filtered records in batches (Supabase max: 1000 per request)
        const batchSize = 1000;
        let allData = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            let url = `${SUPABASE_URL}/rest/v1/stable_volatility?select=*&match_method=eq.TICKER&publish_time=gte.${stateStable.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${stateStable.toDate}T23:59:59%2B07:00:00`;
            
            // Apply search query filter
            if (stateStable.searchQuery) {
                const stockCodes = stateStable.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filter popup filters
            const filterQuery = buildStableFilterQuery();
            if (filterQuery) {
                url += filterQuery;
            }
            
            // For headline and price_change_today_pct, we'll sort client-side, so use default order
            // For other columns, use server-side sort
            if (stateStable.sortCol === 'headline' || stateStable.sortCol === 'price_change_today_pct') {
                // Fetch with default order, will sort client-side later
                url += `&order=publish_time.desc`;
            } else {
                const nullsOrder = '.nullslast';
                url += `&order=${getStableDbField(stateStable.sortCol)}.${stateStable.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;
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
            btnText.innerText = `${i18n[stateStable.lang].exporting} (${allData.length})`;
        }

        // Client-side sort for %Chg column (same as table)
        if (stateStable.sortCol === 'price_change_today_pct') {
            const dir = stateStable.sortDesc ? -1 : 1;
            console.debug('[Stable][Export] Sorting %Chg client-side, direction:', stateStable.sortDesc ? 'DESC' : 'ASC');
            allData.sort((a, b) => {
                const av = Number(a.price_change_today_pct ?? 0);
                const bv = Number(b.price_change_today_pct ?? 0);
                return dir * (av - bv);
            });
        }
        
        // Client-side sort for headline column by news_impact_score (same as table)
        if (stateStable.sortCol === 'headline') {
            console.log('Export: Sorting by headline (news_impact_score), sortDesc:', stateStable.sortDesc);
            allData.sort((a, b) => {
                const av = a.news_impact_score ?? 0;
                const bv = b.news_impact_score ?? 0;
                if (stateStable.sortDesc) {
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
        await prefetchHeadlineTranslations(allData, stateStable.lang);

        // Build Excel data
        const headers = [
            i18n[stateStable.lang].cols.index,
            i18n[stateStable.lang].cols.publish_time,
            i18n[stateStable.lang].cols.single_stock,
            i18n[stateStable.lang].cols.price_change_today_pct,
            i18n[stateStable.lang].cols.ma15,
            i18n[stateStable.lang].cols.organ_name,
            i18n[stateStable.lang].cols.industry,
            i18n[stateStable.lang].cols.current_close,
            i18n[stateStable.lang].cols.current_volume,
            i18n[stateStable.lang].cols.headline,
            i18n[stateStable.lang].cols.link
        ];

        const rows = allData.map((row, idx) => {
            const name = getTranslatedOrgan(row.single_stock, row.organ_name, stateStable.lang);
            const industry = getTranslatedIndustry(row.industry_vn, stateStable.lang);
            const headline = getTranslatedHeadline(row, stateStable.lang);
            const ma15Status = getStableMA15Status(row.pct_ma15);
            const ma15Text = ma15Status.key === 'N/A' ? i18n[stateStable.lang].notApplicable : ma15Status.key;

            return [
                idx + 1,
                formatStableDateTime(row.publish_time),
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

        XLSX.utils.book_append_sheet(wb, ws, i18n[stateStable.lang].stable.sheetName);

        // Generate filename with date range
        const filename = `${i18n[stateStable.lang].exportFilePrefix.stable}_${stateStable.fromDate}_${stateStable.toDate}.xlsx`;
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Export error:', error);
        alert(i18n[stateStable.lang].exportError);
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

