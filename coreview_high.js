// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW HIGH VOLATILITY - Data Fetching & Table Logic
// Version: 1.8 - Fixed headline sort direction bug (DESC/ASC logic)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stock View Initialization ─────────────────────────────────────────────

function initHighView() {
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
    createPicker('fromDateHigh', (iso) => {
        stateHigh.fromDate = iso;
        setPickerLimits('toDateHigh', iso, maxDate);
        if (stateHigh.toDate < iso) {
            stateHigh.toDate = iso;
            setPickerValue('toDateHigh', iso);
        }
        stateHigh.currentPage = 0;
        if (typeof window.clearDefaultRangeFiltersForTab === 'function') {
            window.clearDefaultRangeFiltersForTab('high');
        }
        if (typeof window.invalidateBoundsForTab === 'function') {
            window.invalidateBoundsForTab('high');
        }
        fetchHighData().then(() => {
            if (typeof window.refreshBoundsForTab === 'function') {
                window.refreshBoundsForTab('high');
            }
        });
    });
    
    createPicker('toDateHigh', (iso) => {
        stateHigh.toDate = iso;
        setPickerLimits('fromDateHigh', minDate, iso);
        if (stateHigh.fromDate > iso) {
            stateHigh.fromDate = iso;
            setPickerValue('fromDateHigh', iso);
        }
        stateHigh.currentPage = 0;
        if (typeof window.clearDefaultRangeFiltersForTab === 'function') {
            window.clearDefaultRangeFiltersForTab('high');
        }
        if (typeof window.invalidateBoundsForTab === 'function') {
            window.invalidateBoundsForTab('high');
        }
        fetchHighData().then(() => {
            if (typeof window.refreshBoundsForTab === 'function') {
                window.refreshBoundsForTab('high');
            }
        });
    });

    setPickerLimits('fromDateHigh', minDate, maxDate);
    setPickerLimits('toDateHigh', minDate, maxDate);

    // Only set default dates on first load; preserve user selection on tab revisit
    if (!stateHigh.fromDate) stateHigh.fromDate = dateToIso(lastWeek);
    if (!stateHigh.toDate) stateHigh.toDate = maxDate;
    
    console.log('Initial state dates - from:', stateHigh.fromDate, 'to:', stateHigh.toDate);

    setPickerValue('fromDateHigh', stateHigh.fromDate);
    setPickerValue('toDateHigh', stateHigh.toDate);

    // Apply cross-constraints based on initial values
    setPickerLimits('fromDateHigh', minDate, stateHigh.toDate);
    setPickerLimits('toDateHigh', stateHigh.fromDate, maxDate);

    // Update UI labels based on current language
    updateHighViewLabels();

    // Setup event listeners
    setupHighViewEventListeners();

    // Initial render
    renderHighHeaders();
    console.log('Calling initial fetchHighData...');
    fetchHighData();
}

// Update all stock view labels based on current language
function updateHighViewLabels() {
    const searchInput = document.getElementById('searchInputHigh');
    if (searchInput) searchInput.placeholder = i18n[stateHigh.lang].searchPlaceholder;
    
    const lblFrom = document.getElementById('lblFromHigh');
    if (lblFrom) lblFrom.innerText = i18n[stateHigh.lang].lblFrom;
    
    const lblTo = document.getElementById('lblToHigh');
    if (lblTo) lblTo.innerText = i18n[stateHigh.lang].lblTo;
    
    const prevBtn = document.getElementById('prevBtnHigh');
    if (prevBtn) prevBtn.innerText = i18n[stateHigh.lang].prev;
    
    const nextBtn = document.getElementById('nextBtnHigh');
    if (nextBtn) nextBtn.innerText = i18n[stateHigh.lang].next;
    
    const exportBtnText = document.getElementById('exportBtnTextHigh');
    if (exportBtnText) exportBtnText.innerText = i18n[stateHigh.lang].exportBtn;
    
    const filterBtnText = document.getElementById('filterBtnTextHigh');
    if (filterBtnText) filterBtnText.innerText = i18n[stateHigh.lang].filterBtn;
    
    const loadingText = document.getElementById('loadingTextHigh');
    if (loadingText) loadingText.innerText = i18n[stateHigh.lang].loading;
    
    const refreshStockBtn = document.getElementById('refreshHighBtn');
    if (refreshStockBtn) refreshStockBtn.title = i18n[stateHigh.lang].refreshBtn;
}

// Setup all event listeners for stock view
function setupHighViewEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInputHigh');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            stateHigh.searchQuery = e.target.value.toUpperCase();
            stateHigh.currentPage = 0;
            fetchHighData();
        });
    }

    // Pagination buttons
    const firstBtn = document.getElementById('firstBtnHigh');
    if (firstBtn) {
        firstBtn.onclick = () => { 
            stateHigh.currentPage = 0; 
            fetchHighData(); 
        };
    }

    const prevBtn = document.getElementById('prevBtnHigh');
    if (prevBtn) {
        prevBtn.onclick = () => { 
            stateHigh.currentPage--; 
            fetchHighData(); 
        };
    }

    const nextBtn = document.getElementById('nextBtnHigh');
    if (nextBtn) {
        nextBtn.onclick = () => { 
            stateHigh.currentPage++; 
            fetchHighData(); 
        };
    }

    const lastBtn = document.getElementById('lastBtnHigh');
    if (lastBtn) {
        lastBtn.onclick = () => {
            const lastPage = Math.ceil(stateHigh.totalCount / stateHigh.pageSize) - 1;
            console.log('=== LAST BUTTON CLICKED ===');
            console.log('Current page:', stateHigh.currentPage);
            console.log('Total count:', stateHigh.totalCount);
            console.log('Page size:', stateHigh.pageSize);
            console.log('Calculated last page:', lastPage);
            stateHigh.currentPage = lastPage; 
            fetchHighData(); 
        };
    }
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

// Helper function to build filter query parameters
function buildHighFilterQuery() {
    const filters = [];

    if (typeof filterState !== 'undefined' && filterState.high) {
        if (filterState.high.single_stock.has('__NONE__')) {
            filters.push('single_stock=eq.__IMPOSSIBLE__');
        } else if (filterState.high.single_stock.size > 0) {
            const codes = Array.from(filterState.high.single_stock);
            if (codes.length === 1) {
                filters.push(`single_stock=eq.${codes[0]}`);
            } else {
                const orConditions = codes.map(code => `single_stock.eq.${code}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }

        if (filterState.high.ma15.has('__NONE__')) {
            filters.push('pct_ma15=eq.999999');
        } else if (filterState.high.ma15.size > 0) {
            const ma15Filters = [];
            filterState.high.ma15.forEach(key => {
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

        if (filterState.high.industry.has('__NONE__')) {
            filters.push('industry_vn=eq.__IMPOSSIBLE__');
        } else if (filterState.high.industry.size > 0) {
            const industries = Array.from(filterState.high.industry);
            if (industries.length === 1) {
                filters.push(`industry_vn=eq.${encodeURIComponent(industries[0])}`);
            } else {
                const orConditions = industries.map(ind => `industry_vn.eq.${encodeURIComponent(ind)}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }

        if (filterState.high.volume && typeof filterState.high.volume.min === 'number' && typeof filterState.high.volume.max === 'number') {
            const minVolume = Math.floor(filterState.high.volume.min * 1000000);
            const maxVolume = Math.ceil(filterState.high.volume.max * 1000000);
            filters.push(`current_volume=gte.${minVolume}`);
            filters.push(`current_volume=lte.${maxVolume}`);
        }

        if (filterState.high.price && typeof filterState.high.price.min === 'number' && typeof filterState.high.price.max === 'number') {
            const minPrice = Math.floor(filterState.high.price.min * 1000);
            const maxPrice = Math.ceil(filterState.high.price.max * 1000);
            filters.push(`current_close=gte.${minPrice}`);
            filters.push(`current_close=lte.${maxPrice}`);
        }

        if (filterState.high.priceChange && typeof filterState.high.priceChange.min === 'number' && typeof filterState.high.priceChange.max === 'number') {
            const minPriceChange = filterState.high.priceChange.min;
            const maxPriceChange = filterState.high.priceChange.max;
            filters.push(`price_change_today_pct=gte.${minPriceChange}`);
            filters.push(`price_change_today_pct=lte.${maxPriceChange}`);
        }
    }

    return filters.length > 0 ? '&' + filters.join('&') : '';
}

async function fetchHighData() {
    document.getElementById('loadingStateHigh').classList.remove('hidden');
    
    console.log('=== FETCH DATA START ===');
    console.log('Current page:', stateHigh.currentPage);
    console.log('Page size:', stateHigh.pageSize);
    console.log('Sort column:', stateHigh.sortCol);
    console.log('Date range:', stateHigh.fromDate, '->', stateHigh.toDate);
    
    try {
        let allData = [];
        
        // For headline column, we need to fetch ALL data for accurate client-side sorting
        if (stateHigh.sortCol === 'headline') {
            // For headline sorting, we must fetch ALL records to sort correctly
            // We'll fetch in batches if needed
            const batchSize = 1000;
            let allData = [];
            let offset = 0;
            let hasMore = true;
            
            console.log('Fetching all records for headline sorting...');
            
            while (hasMore) {
                let url = `${SUPABASE_URL}/rest/v1/high_volatility?select=*&match_method=eq.TICKER&publish_time=gte.${stateHigh.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${stateHigh.toDate}T23:59:59%2B07:00:00`;
                
                // Handle multiple stock codes separated by comma
                if (stateHigh.searchQuery) {
                    const stockCodes = stateHigh.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                    if (stockCodes.length === 1) {
                        url += `&single_stock=ilike.*${stockCodes[0]}*`;
                    } else if (stockCodes.length > 1) {
                        const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                        url += `&or=(${orConditions})`;
                    }
                }
                
                // Apply filters
                url += buildHighFilterQuery();
                
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
                            stateHigh.totalCount = parseInt(match[1]);
                            console.log('Total count from server:', stateHigh.totalCount);
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
                stateHigh.data = [];
                stateHigh.totalCount = 0;
            } else {
                // Client-side sort by news_impact_score
                console.log('Table: Sorting by headline, sortDesc:', stateHigh.sortDesc);
                allData.sort((a, b) => {
                    const av = a.news_impact_score ?? 0;
                    const bv = b.news_impact_score ?? 0;
                    if (stateHigh.sortDesc) {
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
                if (!stateHigh.totalCount) {
                    stateHigh.totalCount = allData.length;
                    console.log('Total count from data length:', stateHigh.totalCount);
                }
                
                // Apply pagination to sorted results
                const start = stateHigh.currentPage * stateHigh.pageSize;
                const end = start + stateHigh.pageSize;
                console.log('Pagination - start:', start, 'end:', end);
                console.log('Available data length:', allData.length);
                
                stateHigh.data = allData.slice(start, end);
                console.log('Sliced data length:', stateHigh.data.length);
                console.log('Data records:', stateHigh.data.map(r => r.single_stock));
            }
        } else {
            // For other columns, use server-side pagination
            const start = stateHigh.currentPage * stateHigh.pageSize;
            const end = start + stateHigh.pageSize - 1;
            
            let url = `${SUPABASE_URL}/rest/v1/high_volatility?select=*&match_method=eq.TICKER&publish_time=gte.${stateHigh.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${stateHigh.toDate}T23:59:59%2B07:00:00`;
            
            // Handle multiple stock codes separated by comma
            if (stateHigh.searchQuery) {
                const stockCodes = stateHigh.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filters
            url += buildHighFilterQuery();
            console.log('Fetch URL:', url);
            
            const nullsOrder = stateHigh.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getHighDbField(stateHigh.sortCol)}.${stateHigh.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

            const res = await fetch(url, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Range': `${start}-${end}`, 'Prefer': 'count=exact' }
            });

            const json = await res.json();

            // Supabase returns an error object (not an array) on failure
            if (!Array.isArray(json)) {
                console.error('Supabase error:', json);
                stateHigh.data = [];
                stateHigh.totalCount = 0;
            } else {
                stateHigh.data = json;
                // For %Chg column, re-sort client-side treating NULL as 0
                // so NULLs appear between positives and negatives, not at extremes
                if (stateHigh.sortCol === 'price_change_today_pct') {
                    const dir = stateHigh.sortDesc ? -1 : 1;
                    console.debug('[High] Sorting %Chg client-side, direction:', stateHigh.sortDesc ? 'DESC' : 'ASC');
                    stateHigh.data.sort((a, b) => {
                        const av = Number(a.price_change_today_pct ?? 0);
                        const bv = Number(b.price_change_today_pct ?? 0);
                        return dir * (av - bv);
                    });
                }
                const contentRange = res.headers.get('content-range');
                if (contentRange) {
                    const match = contentRange.match(/\/(\d+)$/);
                    if (match) stateHigh.totalCount = parseInt(match[1]);
                } else {
                    stateHigh.totalCount = stateHigh.data.length;
                }
            }
        }
        

        
        console.log('=== FETCH DATA END ===');
        console.log('Final stateHigh.data.length:', stateHigh.data.length);
        console.log('Final stateHigh.totalCount:', stateHigh.totalCount);
        console.log('Final stateHigh.currentPage:', stateHigh.currentPage);
    } catch (e) { 
        console.error('fetchHighData error:', e);
        stateHigh.data = [];
        stateHigh.totalCount = 0;
    } finally {
        document.getElementById('loadingStateHigh').classList.add('hidden');
        await prefetchHeadlineTranslations(stateHigh.data, stateHigh.lang);
        renderHighBody();
        renderHighPaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderHighHeaders() {
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
    document.getElementById('tableHeaderHigh').innerHTML = cols.map(c => `
        <th class="px-4 py-4 ${c.s ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.s ? getHighSortClass(c.id) : ''}" 
            ${c.s ? `onclick="handleHighSort('${c.id}')"` : ''}>
            <div class="flex items-center">
                <span>${i18n[stateHigh.lang].cols[c.id]}</span>
                ${c.s ? '<span class="sort-icon"></span>' : ''}
            </div>
        </th>
    `).join('');
}

// Map display column id → actual database field name (language-aware)
function getHighDbField(colId) {
    if (colId === 'ma15')     return 'pct_ma15';
    if (colId === 'headline') return 'news_impact_score';
    if (colId === 'industry') return 'industry_vn';
    return colId;
}

function getHighSortClass(id) { 
    if (stateHigh.sortCol === id) {
        return stateHigh.sortDesc ? 'sorted-desc' : 'sorted-asc';
    }
    return 'unsorted';
}

function handleHighSort(id) {
    if (stateHigh.sortCol === id) {
        // Same column clicked
        if (!stateHigh.sortDesc) {
            // Currently ASC → go to DESC
            stateHigh.sortDesc = true;
        } else {
            // Currently DESC → return to default (timesfm_point DESC)
            stateHigh.sortCol = 'timesfm_point';
            stateHigh.sortDesc = true;
        }
    } else {
        // Different column clicked, start with ASC (except for headline)
        stateHigh.sortCol = id;
        if (id === 'headline') {
            stateHigh.sortDesc = true; // Highest impact score first for headline
        } else {
            stateHigh.sortDesc = false;
        }
    }
    stateHigh.currentPage = 0; 
    renderHighHeaders(); 
    if (id === 'price_change_today_pct') {
        console.debug('[High] handleHighSort: %Chg clicked. sortCol=', stateHigh.sortCol, 'sortDesc=', stateHigh.sortDesc ? 'DESC' : 'ASC');
    }
    fetchHighData();
}

// Refresh stock data with current filters (keeps page at 0)
function refreshHighData() {
    const btn = document.getElementById('refreshHighBtn');
    const icon = document.getElementById('refreshHighIcon');
    
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
    if (window.headlineTranslationCache && stateHigh.lang && stateHigh.lang !== 'vi') {
        const suffix = `_${stateHigh.lang}`;
        Object.keys(window.headlineTranslationCache).forEach(key => {
            if (key.endsWith(suffix)) {
                delete window.headlineTranslationCache[key];
            }
        });
        console.log(`[Refresh High] Cleared translation cache for lang="${stateHigh.lang}"`);
    }

    // Reset to first page and refetch (main data + translations)
    stateHigh.currentPage = 0;
    fetchHighData();
}

// Toggle clear button visibility
function toggleClearBtn(btnId, value) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('hidden', !value);
}

// Clear stock search input
function clearHighSearch() {
    const input = document.getElementById('searchInputHigh');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
    const btn = document.getElementById('clearHighBtn');
    if (btn) btn.classList.add('hidden');
}

// Format date as dd/mm hh:mm
function formatHighDateTime(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

// Get MA15 status and color based on pct_ma15 value
function getHighMA15Status(pctMa15) {
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

function renderHighBody() {
    const tbody = document.getElementById('tableBodyHigh');
    if (stateHigh.data.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyStateHigh').classList.remove('hidden');
        document.getElementById('emptyStateHigh').innerText = i18n[stateHigh.lang].empty;
        return;
    }
    document.getElementById('emptyStateHigh').classList.add('hidden');
    
    tbody.innerHTML = stateHigh.data.map((row, idx) => {
        const name = getTranslatedOrgan(row.single_stock, row.organ_name, stateHigh.lang);
        const industry = getTranslatedIndustry(row.industry_vn, stateHigh.lang);
        const headline = getTranslatedHeadline(row, stateHigh.lang);
        const pct = row.price_change_today_pct || 0;
        const color = pct > 0 ? 'text-fin-green' : (pct < 0 ? 'text-fin-red' : 'text-gray-400');
        
        // Get MA15 status
        const ma15Status = getHighMA15Status(row.pct_ma15);
        const ma15TooltipKey = ma15Status.key === 'N/A'
            ? 'na'
            : (ma15Status.key === '⏫ MA15' ? 'strongAbove'
                : ma15Status.key === '⬆️ MA15' ? 'above'
                : ma15Status.key === '↔️ MA15' ? 'at'
                : ma15Status.key === '⬇️ MA15' ? 'below'
                : ma15Status.key === '⏬ MA15' ? 'strongBelow'
                : 'na');
        const ma15Tooltip = i18n[stateHigh.lang].ma15Tooltip[ma15TooltipKey];
        const ma15Bold = ma15Status.bold ? 'font-bold' : '';
        const ma15SvgIcons = {
            '⏫ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8-8 8 8H4z"/><path d="M4 11l8-8 8 8H4z"/></svg>`,
            '⬆️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 15l8-8 8 8H4z"/></svg>`,
            '↔️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 12l-4-4v3H3v2h1v3l4-4zm8 0l4 4v-3h1v-2h-1V8l-4 4z"/></svg>`,
            '⬇️ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 9l-8 8-8-8h16z"/></svg>`,
            '⏬ MA15': `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6l-8 8-8-8h16z"/><path d="M20 13l-8 8-8-8h16z"/></svg>`,
        };
        const ma15Cell = ma15Status.key === 'N/A'
            ? `<span style="color:#6b7280;">${i18n[stateHigh.lang].notApplicable}</span>`
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
                data-time="${formatHighDateTime(row.publish_time)}"
                onclick="window.toggleNewsQuoteTooltip&&toggleNewsQuoteTooltip(event, this)">
                <td class="px-4 py-4 text-center text-gray-500 text-xs">${(stateHigh.currentPage * stateHigh.pageSize) + idx + 1}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatHighDateTime(row.publish_time)}</td>
                <td class="px-4 py-4">
                    <span class="stock-badge" onclick="openTvChart('${row.single_stock || ''}', '${row.com_group_code || ''}')" title="${i18n[stateHigh.lang].chartTooltip}">
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
    bindHighRowTouchEvents();
}

// Touch support: highlight stock badge when user taps any cell in a row
function bindHighRowTouchEvents() {
    const tbody = document.getElementById('tableBodyHigh');
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

function renderHighPaginationUI() {
    console.log('=== RENDER PAGINATION UI ===');
    console.log('stateHigh.totalCount:', stateHigh.totalCount);
    console.log('stateHigh.currentPage:', stateHigh.currentPage);
    console.log('stateHigh.pageSize:', stateHigh.pageSize);
    
    if (stateHigh.totalCount === 0) {
        document.getElementById('paginationInfoHigh').innerText = '';
        document.getElementById('pageNumbersHigh').innerHTML = '';
        document.getElementById('firstBtnHigh').disabled = true;
        document.getElementById('prevBtnHigh').disabled = true;
        document.getElementById('nextBtnHigh').disabled = true;
        document.getElementById('lastBtnHigh').disabled = true;
        return;
    }
    
    const start = (stateHigh.currentPage * stateHigh.pageSize) + 1;
    const end = Math.min(start + stateHigh.pageSize - 1, stateHigh.totalCount);
    console.log('Pagination display - start:', start, 'end:', end);
    
    document.getElementById('paginationInfoHigh').innerText = i18n[stateHigh.lang].paging(start, end, stateHigh.totalCount);
    
    // Calculate total pages
    const totalPages = Math.ceil(stateHigh.totalCount / stateHigh.pageSize);
    console.log('Total pages:', totalPages);
    
    // Show 3 page numbers on mobile, 5 on wider screens
    const maxPages = window.innerWidth < 480 ? 3 : 5;
    
    // Generate page numbers
    const pageNumbersContainer = document.getElementById('pageNumbersHigh');
    pageNumbersContainer.innerHTML = '';
    
    // Show max page numbers at a time
    let startPage = Math.max(0, stateHigh.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - (maxPages - 1));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
            i === stateHigh.currentPage 
                ? 'bg-fin-gold text-fin-blue border border-fin-gold' 
                : 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
        }`;
        pageBtn.innerText = i + 1;
        pageBtn.onclick = () => {
            stateHigh.currentPage = i;
            fetchHighData();
        };
        pageNumbersContainer.appendChild(pageBtn);
    }
    
    document.getElementById('firstBtnHigh').disabled = stateHigh.currentPage === 0;
    document.getElementById('prevBtnHigh').disabled = stateHigh.currentPage === 0;
    document.getElementById('nextBtnHigh').disabled = end >= stateHigh.totalCount;
    document.getElementById('lastBtnHigh').disabled = end >= stateHigh.totalCount;
}

// ─── Excel Export ──────────────────────────────────────────────────────────

async function exportHighToExcel() {
    const btn = document.getElementById('exportBtnHigh');
    const btnText = document.getElementById('exportBtnTextHigh');
    const originalText = btnText.innerText;
    
    console.log('Export started - Current sort:', stateHigh.sortCol, stateHigh.sortDesc ? 'DESC' : 'ASC');
    
    // Disable button and show loading state
    btn.disabled = true;
    btnText.innerText = i18n[stateHigh.lang].exporting;
    btn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        // Fetch ALL filtered records in batches (Supabase max: 1000 per request)
        const batchSize = 1000;
        let allData = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            let url = `${SUPABASE_URL}/rest/v1/high_volatility?select=*&match_method=eq.TICKER&publish_time=gte.${stateHigh.fromDate}T00:00:00%2B07:00:00&publish_time=lte.${stateHigh.toDate}T23:59:59%2B07:00:00`;
            
            // Apply search query filter
            if (stateHigh.searchQuery) {
                const stockCodes = stateHigh.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filter popup filters
            const filterQuery = buildHighFilterQuery();
            if (filterQuery) {
                url += filterQuery;
            }
            
            // For headline and price_change_today_pct, we'll sort client-side, so use default order
            // For other columns, use server-side sort
            if (stateHigh.sortCol === 'headline' || stateHigh.sortCol === 'price_change_today_pct') {
                // Fetch with default order, will sort client-side later
                url += `&order=publish_time.desc`;
            } else {
                const nullsOrder = '.nullslast';
                url += `&order=${getHighDbField(stateHigh.sortCol)}.${stateHigh.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;
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
            btnText.innerText = `${i18n[stateHigh.lang].exporting} (${allData.length})`;
        }

        // Client-side sort for %Chg column (same as table)
        if (stateHigh.sortCol === 'price_change_today_pct') {
            const dir = stateHigh.sortDesc ? -1 : 1;
            console.debug('[High][Export] Sorting %Chg client-side, direction:', stateHigh.sortDesc ? 'DESC' : 'ASC');
            allData.sort((a, b) => {
                const av = Number(a.price_change_today_pct ?? 0);
                const bv = Number(b.price_change_today_pct ?? 0);
                return dir * (av - bv);
            });
        }
        
        // Client-side sort for headline column by news_impact_score (same as table)
        if (stateHigh.sortCol === 'headline') {
            console.log('Export: Sorting by headline (news_impact_score), sortDesc:', stateHigh.sortDesc);
            allData.sort((a, b) => {
                const av = a.news_impact_score ?? 0;
                const bv = b.news_impact_score ?? 0;
                if (stateHigh.sortDesc) {
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
        await prefetchHeadlineTranslations(allData, stateHigh.lang);

        // Build Excel data
        const headers = [
            i18n[stateHigh.lang].cols.index,
            i18n[stateHigh.lang].cols.publish_time,
            i18n[stateHigh.lang].cols.single_stock,
            i18n[stateHigh.lang].cols.price_change_today_pct,
            i18n[stateHigh.lang].cols.ma15,
            i18n[stateHigh.lang].cols.organ_name,
            i18n[stateHigh.lang].cols.industry,
            i18n[stateHigh.lang].cols.current_close,
            i18n[stateHigh.lang].cols.current_volume,
            i18n[stateHigh.lang].cols.headline,
            i18n[stateHigh.lang].cols.link
        ];

        const rows = allData.map((row, idx) => {
            const name = getTranslatedOrgan(row.single_stock, row.organ_name, stateHigh.lang);
            const industry = getTranslatedIndustry(row.industry_vn, stateHigh.lang);
            const headline = getTranslatedHeadline(row, stateHigh.lang);
            const ma15Status = getHighMA15Status(row.pct_ma15);
            const ma15Text = ma15Status.key === 'N/A' ? i18n[stateHigh.lang].notApplicable : ma15Status.key;

            return [
                idx + 1,
                formatHighDateTime(row.publish_time),
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

        XLSX.utils.book_append_sheet(wb, ws, i18n[stateHigh.lang].high.sheetName);

        // Generate filename with date range
        const filename = `${i18n[stateHigh.lang].exportFilePrefix.high}_${stateHigh.fromDate}_${stateHigh.toDate}.xlsx`;
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Export error:', error);
        alert(i18n[stateHigh.lang].exportError);
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

