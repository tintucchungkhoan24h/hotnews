// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW STOCK - Data Fetching & Table Logic
// Version: 1.8 - Fixed headline sort direction bug (DESC/ASC logic)
// ═══════════════════════════════════════════════════════════════════════════

// ─── Stock View Initialization ─────────────────────────────────────────────

function initWatchlistView() {
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
    createPicker('fromDateWatchlist', (iso) => {
        stateWatchlist.fromDateWatchlist = iso;
        setPickerLimits('toDateWatchlist', iso, maxDate);
        if (stateWatchlist.toDateWatchlist < iso) {
            stateWatchlist.toDateWatchlist = iso;
            setPickerValue('toDateWatchlist', iso);
        }
        stateWatchlist.currentPage = 0;
        fetchWatchlistData();
    });
    
    createPicker('toDateWatchlist', (iso) => {
        stateWatchlist.toDateWatchlist = iso;
        setPickerLimits('fromDateWatchlist', minDate, iso);
        if (stateWatchlist.fromDateWatchlist > iso) {
            stateWatchlist.fromDateWatchlist = iso;
            setPickerValue('fromDateWatchlist', iso);
        }
        stateWatchlist.currentPage = 0;
        fetchWatchlistData();
    });

    setPickerLimits('fromDateWatchlist', minDate, maxDate);
    setPickerLimits('toDateWatchlist', minDate, maxDate);

    // Only set default dates on first load; preserve user selection on tab revisit
    if (!stateWatchlist.fromDateWatchlist) stateWatchlist.fromDateWatchlist = dateToIso(lastWeek);
    if (!stateWatchlist.toDateWatchlist) stateWatchlist.toDateWatchlist = maxDate;
    
    console.log('Initial state dates - from:', stateWatchlist.fromDateWatchlist, 'to:', stateWatchlist.toDateWatchlist);

    setPickerValue('fromDateWatchlist', stateWatchlist.fromDateWatchlist);
    setPickerValue('toDateWatchlist', stateWatchlist.toDateWatchlist);

    // Apply cross-constraints based on initial values
    setPickerLimits('fromDateWatchlist', minDate, stateWatchlist.toDateWatchlist);
    setPickerLimits('toDateWatchlist', stateWatchlist.fromDateWatchlist, maxDate);

    // Update UI labels based on current language
    updateWatchlistViewLabels();

    // Setup event listeners
    setupWatchlistViewEventListeners();

    // Wire export button via JS (more reliable than inline onclick in dynamic HTML)
    const exportBtnEl = document.getElementById('exportBtnWatchlist');
    if (exportBtnEl) {
        exportBtnEl.onclick = function() { exportWatchlistToExcel(exportBtnEl); };
    }

    // Initial render
    renderWatchlistHeaders();
    console.log('Calling initial fetchWatchlistData...');
    fetchWatchlistData();
}

// Update all stock view labels based on current language
function updateWatchlistViewLabels() {
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG;

    const searchInputWatchlist = document.getElementById('searchInputWatchlist');
    if (searchInputWatchlist) searchInputWatchlist.placeholder = i18n[lang].searchPlaceholder;
    
    const lblFromWatchlist = document.getElementById('lblFromWatchlist');
    if (lblFromWatchlist) lblFromWatchlist.innerText = i18n[lang].lblFrom;
    
    const lblToWatchlist = document.getElementById('lblToWatchlist');
    if (lblToWatchlist) lblToWatchlist.innerText = i18n[lang].lblTo;
    
    const prevBtnWatchlist = document.getElementById('prevBtnWatchlist');
    if (prevBtnWatchlist) prevBtnWatchlist.innerText = i18n[lang].prev;
    
    const nextBtnWatchlist = document.getElementById('nextBtnWatchlist');
    if (nextBtnWatchlist) nextBtnWatchlist.innerText = i18n[lang].next;
    
    const exportBtnWatchlistText = document.getElementById('exportBtnWatchlistText');
    if (exportBtnWatchlistText) exportBtnWatchlistText.innerText = i18n[lang].exportBtn;
    
    const filterBtnTextWatchlist = document.getElementById('filterBtnTextWatchlist');
    if (filterBtnTextWatchlist) filterBtnTextWatchlist.innerText = i18n[lang].filterBtn;
    
    const loadingTextWatchlist = document.getElementById('loadingTextWatchlist');
    if (loadingTextWatchlist) loadingTextWatchlist.innerText = i18n[lang].loading;
    
    const refreshWatchlistBtn = document.getElementById('refreshWatchlistBtn');
    if (refreshWatchlistBtn) refreshWatchlistBtn.title = i18n[lang].refreshBtn;
}

// Setup all event listeners for stock view
function setupWatchlistViewEventListeners() {
    // Search input
    const searchInputWatchlist = document.getElementById('searchInputWatchlist');
    if (searchInputWatchlist) {
        searchInputWatchlist.addEventListener('input', (e) => {
            stateWatchlist.searchQuery = e.target.value.toUpperCase();
            stateWatchlist.currentPage = 0;
            fetchWatchlistData();
        });
    }

    // Pagination buttons
    const firstBtnWatchlist = document.getElementById('firstBtnWatchlist');
    if (firstBtnWatchlist) {
        firstBtnWatchlist.onclick = () => { 
            stateWatchlist.currentPage = 0; 
            fetchWatchlistData(); 
        };
    }

    const prevBtnWatchlist = document.getElementById('prevBtnWatchlist');
    if (prevBtnWatchlist) {
        prevBtnWatchlist.onclick = () => { 
            stateWatchlist.currentPage--; 
            fetchWatchlistData(); 
        };
    }

    const nextBtnWatchlist = document.getElementById('nextBtnWatchlist');
    if (nextBtnWatchlist) {
        nextBtnWatchlist.onclick = () => { 
            stateWatchlist.currentPage++; 
            fetchWatchlistData(); 
        };
    }

    const lastBtnWatchlist = document.getElementById('lastBtnWatchlist');
    if (lastBtnWatchlist) {
        lastBtnWatchlist.onclick = () => {
            const lastPage = Math.ceil(stateWatchlist.totalCount / stateWatchlist.pageSize) - 1;
            console.log('=== LAST BUTTON CLICKED ===');
            console.log('Current page:', stateWatchlist.currentPage);
            console.log('Total count:', stateWatchlist.totalCount);
            console.log('Page size:', stateWatchlist.pageSize);
            console.log('Calculated last page:', lastPage);
            stateWatchlist.currentPage = lastPage; 
            fetchWatchlistData(); 
        };
    }
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

// Helper function to build filter query parameters
function buildWatchlistFilterQuery() {
    const filters = [];
    
    // DEFAULT FILTER: Always add wyckoff_phase = Accumulation for watchlist
    filters.push('wyckoff_phase=eq.Accumulation');
    
    // Get filter state from global scope
    if (typeof filterState !== 'undefined' && filterState.watchlist) {
        // Stock code filter
        if (filterState.watchlist.single_stock.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('single_stock=eq.__IMPOSSIBLE__');
        } else if (filterState.watchlist.single_stock.size > 0) {
            // Specific codes selected
            const codes = Array.from(filterState.watchlist.single_stock);
            if (codes.length === 1) {
                filters.push(`single_stock=eq.${codes[0]}`);
            } else {
                const orConditions = codes.map(code => `single_stock.eq.${code}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }
        // If size is 0 and no __NONE__, it means "all selected" - don't add any filter
        
        // MA15 filter
        if (filterState.watchlist.ma15.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('pct_ma15=eq.999999');
        } else if (filterState.watchlist.ma15.size > 0) {
            // Specific ranges selected
            const ma15Filters = [];
            filterState.watchlist.ma15.forEach(key => {
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
        if (filterState.watchlist.industry.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('industry_vn=eq.__IMPOSSIBLE__');
        } else if (filterState.watchlist.industry.size > 0) {
            // Specific industries selected
            const industries = Array.from(filterState.watchlist.industry);
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

async function fetchWatchlistData() {
    document.getElementById('loadingStateWatchlist').classList.remove('hidden');
    
    console.log('=== FETCH DATA START ===');
    console.log('Current page:', stateWatchlist.currentPage);
    console.log('Page size:', stateWatchlist.pageSize);
    console.log('Sort column:', stateWatchlist.sortCol);
    
    try {
        let allData = [];
        
        // For headline column, we need to fetch ALL data for accurate client-side sorting
        if (stateWatchlist.sortCol === 'headline') {
            // For headline sorting, we must fetch ALL records to sort correctly
            // We'll fetch in batches if needed
            const batchSize = 1000;
            let allData = [];
            let offset = 0;
            let hasMore = true;
            
            console.log('Fetching all records for headline sorting...');
            
            while (hasMore) {
                let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${stateWatchlist.fromDateWatchlist}T00:00:00Z&publish_time=lte.${stateWatchlist.toDateWatchlist}T23:59:59Z`;
                
                // Handle multiple stock codes separated by comma
                if (stateWatchlist.searchQuery) {
                    const stockCodes = stateWatchlist.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                    if (stockCodes.length === 1) {
                        url += `&single_stock=ilike.*${stockCodes[0]}*`;
                    } else if (stockCodes.length > 1) {
                        const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                        url += `&or=(${orConditions})`;
                    }
                }
                
                // Apply filters
                url += buildWatchlistFilterQuery();
                
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
                            stateWatchlist.totalCount = parseInt(match[1]);
                            console.log('Total count from server:', stateWatchlist.totalCount);
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
                stateWatchlist.data = [];
                stateWatchlist.totalCount = 0;
            } else {
                // Client-side sort by news_impact_score
                console.log('Table: Sorting by headline, sortDesc:', stateWatchlist.sortDesc);
                allData.sort((a, b) => {
                    const av = a.news_impact_score ?? 0;
                    const bv = b.news_impact_score ?? 0;
                    if (stateWatchlist.sortDesc) {
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
                if (!stateWatchlist.totalCount) {
                    stateWatchlist.totalCount = allData.length;
                    console.log('Total count from data length:', stateWatchlist.totalCount);
                }
                
                // Apply pagination to sorted results
                const start = stateWatchlist.currentPage * stateWatchlist.pageSize;
                const end = start + stateWatchlist.pageSize;
                console.log('Pagination - start:', start, 'end:', end);
                console.log('Available data length:', allData.length);
                
                stateWatchlist.data = allData.slice(start, end);
                console.log('Sliced data length:', stateWatchlist.data.length);
                console.log('Data records:', stateWatchlist.data.map(r => r.single_stock));
            }
        } else {
            // For other columns, use server-side pagination
            const start = stateWatchlist.currentPage * stateWatchlist.pageSize;
            const end = start + stateWatchlist.pageSize - 1;
            
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${stateWatchlist.fromDateWatchlist}T00:00:00Z&publish_time=lte.${stateWatchlist.toDateWatchlist}T23:59:59Z`;
            
            // Handle multiple stock codes separated by comma
            if (stateWatchlist.searchQuery) {
                const stockCodes = stateWatchlist.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filters
            url += buildWatchlistFilterQuery();
            
            const nullsOrder = stateWatchlist.sortCol === 'price_change_today_pct' ? '' : '.nullslast';
            url += `&order=${getDbFieldWatchlist(stateWatchlist.sortCol)}.${stateWatchlist.sortDesc ? 'desc' : 'asc'}${nullsOrder}`;

            const res = await fetch(url, {
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Range': `${start}-${end}`, 'Prefer': 'count=exact' }
            });

            const json = await res.json();

            // Supabase returns an error object (not an array) on failure
            if (!Array.isArray(json)) {
                console.error('Supabase error:', json);
                stateWatchlist.data = [];
                stateWatchlist.totalCount = 0;
            } else {
                stateWatchlist.data = json;
                // For %Chg column, re-sort client-side treating NULL as 0
                // so NULLs appear between positives and negatives, not at extremes
                if (stateWatchlist.sortCol === 'price_change_today_pct') {
                    const dir = stateWatchlist.sortDesc ? -1 : 1;
                    stateWatchlist.data.sort((a, b) => {
                        const av = a.price_change_today_pct ?? 0;
                        const bv = b.price_change_today_pct ?? 0;
                        return dir * (bv - av);
                    });
                }
                const contentRange = res.headers.get('content-range');
                if (contentRange) {
                    const match = contentRange.match(/\/(\d+)$/);
                    if (match) stateWatchlist.totalCount = parseInt(match[1]);
                } else {
                    stateWatchlist.totalCount = stateWatchlist.data.length;
                }
            }
        }
        

        
        console.log('=== FETCH DATA END ===');
        console.log('Final stateWatchlist.data.length:', stateWatchlist.data.length);
        console.log('Final stateWatchlist.totalCount:', stateWatchlist.totalCount);
        console.log('Final stateWatchlist.currentPage:', stateWatchlist.currentPage);
    } catch (e) { 
        console.error('fetchWatchlistData error:', e);
        stateWatchlist.data = [];
        stateWatchlist.totalCount = 0;
    } finally {
        document.getElementById('loadingStateWatchlist').classList.add('hidden');
        await prefetchHeadlineTranslations(stateWatchlist.data, (typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG);
        renderWatchlistBody();
        renderWatchlistPaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderWatchlistHeaders() {
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
    const _lang = (typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG;
    document.getElementById('tableHeaderWatchlist').innerHTML = cols.map(c => `
        <th class="px-4 py-4 ${c.s ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.s ? getSortClassWatchlist(c.id) : ''}" 
            ${c.s ? `onclick="handleWatchlistSort('${c.id}')"` : ''}>
            <div class="flex items-center">
                <span>${i18n[_lang].cols[c.id]}</span>
                ${c.s ? '<span class="sort-icon"></span>' : ''}
            </div>
        </th>
    `).join('');
}

// Map display column id → actual database field name (language-aware)
function getDbFieldWatchlist(colId) {
    if (colId === 'ma15')     return 'pct_ma15';
    if (colId === 'headline') return 'news_impact_score';
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG;
    if (colId === 'industry') return 'industry_vn';
    return colId;
}

function getSortClassWatchlist(id) { 
    if (stateWatchlist.sortCol === id) {
        return stateWatchlist.sortDesc ? 'sorted-desc' : 'sorted-asc';
    }
    return 'unsorted';
}

function handleWatchlistSort(id) {
    if (stateWatchlist.sortCol === id) {
        // Same column clicked
        if (!stateWatchlist.sortDesc) {
            // Currently ASC → go to DESC
            stateWatchlist.sortDesc = true;
        } else {
            // Currently DESC → return to default (timesfm_point DESC)
            stateWatchlist.sortCol = 'timesfm_point';
            stateWatchlist.sortDesc = true;
        }
    } else {
        // Different column clicked, start with ASC (except for headline)
        stateWatchlist.sortCol = id;
        if (id === 'headline') {
            stateWatchlist.sortDesc = true; // Highest impact score first for headline
        } else {
            stateWatchlist.sortDesc = false;
        }
    }
    stateWatchlist.currentPage = 0; 
    renderWatchlistHeaders(); 
    fetchWatchlistData();
}

// Refresh stock data with current filters (keeps page at 0)
function refreshWatchlistData() {
    const btn = document.getElementById('refreshWatchlistBtn');
    const icon = document.getElementById('refreshWatchlistIcon');
    
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
    stateWatchlist.currentPage = 0;
    fetchWatchlistData();
}

// Toggle clear button visibility (watchlist-safe wrapper)
function toggleClearBtn(btnId, value) {
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.toggle('hidden', !value);
}

// Clear stock search input
function clearWatchlistSearch() {
    const input = document.getElementById('searchInputWatchlist');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
    const btn = document.getElementById('clearWatchlistBtn');
    if (btn) btn.classList.add('hidden');
}

// Format date as dd/mm hh:mm (watchlist)
function formatDateTimeWatchlist(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

// Get MA15 status and color based on pct_ma15 value (watchlist)
function getMA15StatusWatchlist(pctMa15) {
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

function renderWatchlistBody() {
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG;
    const tbody = document.getElementById('tableBodyWatchlist');
    if (stateWatchlist.data.length === 0) {
        tbody.innerHTML = '';
        document.getElementById('emptyStateWatchlist').classList.remove('hidden');
        document.getElementById('emptyStateWatchlist').innerText = i18n[lang].empty;
        return;
    }
    document.getElementById('emptyStateWatchlist').classList.add('hidden');
    
    tbody.innerHTML = stateWatchlist.data.map((row, idx) => {
        const name = getTranslatedOrgan(row.single_stock, row.organ_name, lang);
        const industry = getTranslatedIndustry(row.industry_vn, lang);
        const headline = getTranslatedHeadline(row, lang);
        const pct = row.price_change_today_pct || 0;
        const color = pct > 0 ? 'text-fin-green' : (pct < 0 ? 'text-fin-red' : 'text-gray-400');
        
        // Get MA15 status
        const ma15Status = getMA15StatusWatchlist(row.pct_ma15);
        const ma15TooltipKey = ma15Status.key === 'N/A'
            ? 'na'
            : (ma15Status.key === '⏫ MA15' ? 'strongAbove'
                : ma15Status.key === '⬆️ MA15' ? 'above'
                : ma15Status.key === '↔️ MA15' ? 'at'
                : ma15Status.key === '⬇️ MA15' ? 'below'
                : ma15Status.key === '⏬ MA15' ? 'strongBelow'
                : 'na');
        const ma15Tooltip = i18n[lang].ma15Tooltip[ma15TooltipKey];
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
                <td class="px-4 py-4 text-center text-gray-500 text-xs">${(stateWatchlist.currentPage * stateWatchlist.pageSize) + idx + 1}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatDateTimeWatchlist(row.publish_time)}</td>
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
    bindRowTouchEventsWatchlist();
}

// Touch support: highlight stock badge when user taps any cell in a row
function bindRowTouchEventsWatchlist() {
    const tbody = document.getElementById('tableBodyWatchlist');
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

function renderWatchlistPaginationUI() {
    console.log('=== RENDER PAGINATION UI ===');
    console.log('stateWatchlist.totalCount:', stateWatchlist.totalCount);
    console.log('stateWatchlist.currentPage:', stateWatchlist.currentPage);
    console.log('stateWatchlist.pageSize:', stateWatchlist.pageSize);
    
    if (stateWatchlist.totalCount === 0) {
        document.getElementById('paginationInfoWatchlist').innerText = '';
        document.getElementById('pageNumbersWatchlist').innerHTML = '';
        document.getElementById('firstBtnWatchlist').disabled = true;
        document.getElementById('prevBtnWatchlist').disabled = true;
        document.getElementById('nextBtnWatchlist').disabled = true;
        document.getElementById('lastBtnWatchlist').disabled = true;
        return;
    }
    
    const start = (stateWatchlist.currentPage * stateWatchlist.pageSize) + 1;
    const end = Math.min(start + stateWatchlist.pageSize - 1, stateWatchlist.totalCount);
    console.log('Pagination display - start:', start, 'end:', end);
    
    document.getElementById('paginationInfoWatchlist').innerText = i18n[(typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG].paging(start, end, stateWatchlist.totalCount);
    
    // Calculate total pages
    const totalPages = Math.ceil(stateWatchlist.totalCount / stateWatchlist.pageSize);
    console.log('Total pages:', totalPages);
    
    // Show 3 page numbers on mobile, 5 on wider screens
    const maxPages = window.innerWidth < 480 ? 3 : 5;
    
    // Generate page numbers
    const pageNumbersWatchlistContainer = document.getElementById('pageNumbersWatchlist');
    pageNumbersWatchlistContainer.innerHTML = '';
    
    // Show max page numbers at a time
    let startPage = Math.max(0, stateWatchlist.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - (maxPages - 1));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
            i === stateWatchlist.currentPage 
                ? 'bg-fin-gold text-fin-blue border border-fin-gold' 
                : 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
        }`;
        pageBtn.innerText = i + 1;
        pageBtn.onclick = () => {
            stateWatchlist.currentPage = i;
            fetchWatchlistData();
        };
        pageNumbersWatchlistContainer.appendChild(pageBtn);
    }
    
    document.getElementById('firstBtnWatchlist').disabled = stateWatchlist.currentPage === 0;
    document.getElementById('prevBtnWatchlist').disabled = stateWatchlist.currentPage === 0;
    document.getElementById('nextBtnWatchlist').disabled = end >= stateWatchlist.totalCount;
    document.getElementById('lastBtnWatchlist').disabled = end >= stateWatchlist.totalCount;
}

// ─── Excel Export ──────────────────────────────────────────────────────────

window.exportWatchlistToExcel = async function exportWatchlistToExcel(btnRef) {
    console.log('=== WATCHLIST EXPORT CLICKED ===');
    const btn = btnRef || document.getElementById('exportBtnWatchlist');
    const btnText = btn ? btn.querySelector('span[id="exportBtnWatchlistText"], span') : null;
    if (!btn || !btnText) {
        console.error('Export button elements not found', { btn, btnText });
        return;
    }
    
    // Guard: ensure dates are initialized
    if (!stateWatchlist.fromDateWatchlist || !stateWatchlist.toDateWatchlist) {
        console.error('Export failed: dates not initialized');
        return;
    }
    
    const lang = (typeof state !== 'undefined' ? state.lang : null) || stateWatchlist.lang || DEFAULT_LANG;
    const originalText = btnText.innerText;
    
    console.log('Export started - Current sort:', stateWatchlist.sortCol, stateWatchlist.sortDesc ? 'DESC' : 'ASC');
    
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
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.TICKER&publish_time=gte.${stateWatchlist.fromDateWatchlist}T00:00:00Z&publish_time=lte.${stateWatchlist.toDateWatchlist}T23:59:59Z`;
            
            // Apply search query filter
            if (stateWatchlist.searchQuery) {
                const stockCodes = stateWatchlist.searchQuery.split(',').map(s => s.trim()).filter(s => s);
                if (stockCodes.length === 1) {
                    url += `&single_stock=ilike.*${stockCodes[0]}*`;
                } else if (stockCodes.length > 1) {
                    const orConditions = stockCodes.map(code => `single_stock.ilike.*${code}*`).join(',');
                    url += `&or=(${orConditions})`;
                }
            }
            
            // Apply filter popup filters (includes wyckoff_phase=Accumulation by default)
            const filterQuery = buildWatchlistFilterQuery();
            if (filterQuery) {
                url += filterQuery;
            }
            
            // For headline and price_change_today_pct, sort client-side; otherwise server-side
            if (stateWatchlist.sortCol === 'headline' || stateWatchlist.sortCol === 'price_change_today_pct') {
                url += `&order=publish_time.desc`;
            } else {
                url += `&order=${getDbFieldWatchlist(stateWatchlist.sortCol)}.${stateWatchlist.sortDesc ? 'desc' : 'asc'}.nullslast`;
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
        if (stateWatchlist.sortCol === 'price_change_today_pct') {
            const dir = stateWatchlist.sortDesc ? -1 : 1;
            allData.sort((a, b) => {
                const av = a.price_change_today_pct ?? 0;
                const bv = b.price_change_today_pct ?? 0;
                return dir * (bv - av);
            });
        }
        
        // Client-side sort for headline column by news_impact_score
        if (stateWatchlist.sortCol === 'headline') {
            allData.sort((a, b) => {
                const av = a.news_impact_score ?? 0;
                const bv = b.news_impact_score ?? 0;
                return stateWatchlist.sortDesc ? bv - av : av - bv;
            });
        }

        // Prefetch headline translations for the full export dataset
        await prefetchHeadlineTranslations(allData, lang);

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
            const name = getTranslatedOrgan(row.single_stock, row.organ_name, lang);
            const industry = getTranslatedIndustry(row.industry_vn, lang);
            const headline = getTranslatedHeadline(row, lang);
            const ma15Status = getMA15StatusWatchlist(row.pct_ma15);
            const ma15Text = ma15Status.key === 'N/A' ? i18n[lang].notApplicable : ma15Status.key;

            return [
                idx + 1,
                formatDateTimeWatchlist(row.publish_time),
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

        XLSX.utils.book_append_sheet(wb, ws, i18n[lang].watchlist.sheetName);

        const filename = `${i18n[lang].exportFilePrefix.watchlist}_${stateWatchlist.fromDateWatchlist}_${stateWatchlist.toDateWatchlist}.xlsx`;
        XLSX.writeFile(wb, filename);

    } catch (error) {
        console.error('Export error:', error);
        alert(i18n[stateWatchlist.lang].exportErrorWithMessage.replace('{message}', error.message || i18n[stateWatchlist.lang].exportError.split('. ')[1]));
    } finally {
        btn.disabled = false;
        btnText.innerText = originalText;
        btn.classList.remove('opacity-60', 'cursor-not-allowed');
    }
}

// ─── Company Name Tooltip ──────────────────────────────────────────────────
// Note: showCompanyTooltip and openTvChart are defined in coreview_stock.js and shared globally.

