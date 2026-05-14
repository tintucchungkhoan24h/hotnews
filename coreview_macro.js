// ═══════════════════════════════════════════════════════════════════════════
// COREVIEW MACRO - Data Fetching & Table Logic
// Version: 2.2 - Added secondary sort by publish_time for consistent ordering
// ═══════════════════════════════════════════════════════════════════════════

// ─── Macro View Initialization ─────────────────────────────────────────────

function initMacroView() {
    // Force GMT+7 timezone for all date operations
    const today = getGMT7Date();
    
    // Default: 7 days ago to today
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    // Allow selection of last 30 days
    const twentyNineDaysAgo = new Date(today);
    twentyNineDaysAgo.setDate(today.getDate() - 29);
    
    // Use GMT+7 date formatting
    const minDate = dateToIso(twentyNineDaysAgo);
    const maxDate = dateToIso(today);

    // Init custom date pickers for macro view
    createPicker('fromDateMacro', (iso) => {
        state.fromDateMacro = iso;
        setPickerLimits('toDateMacro', iso, maxDate);
        if (state.toDateMacro < iso) {
            state.toDateMacro = iso;
            setPickerValue('toDateMacro', iso);
        }
        state.currentPageMacro = 0;
        fetchMacroData();
    });
    
    createPicker('toDateMacro', (iso) => {
        state.toDateMacro = iso;
        setPickerLimits('fromDateMacro', minDate, iso);
        if (state.fromDateMacro > iso) {
            state.fromDateMacro = iso;
            setPickerValue('fromDateMacro', iso);
        }
        state.currentPageMacro = 0;
        fetchMacroData();
    });

    setPickerLimits('fromDateMacro', minDate, maxDate);
    setPickerLimits('toDateMacro', minDate, maxDate);

    // Only set default dates on first load; preserve user selection on tab revisit
    if (!state.fromDateMacro) state.fromDateMacro = dateToIso(sevenDaysAgo);
    if (!state.toDateMacro) state.toDateMacro = maxDate;

    setPickerValue('fromDateMacro', state.fromDateMacro);
    setPickerValue('toDateMacro', state.toDateMacro);

    // Apply cross-constraints based on initial values
    setPickerLimits('fromDateMacro', minDate, state.toDateMacro);
    setPickerLimits('toDateMacro', state.fromDateMacro, maxDate);

    // Initialize macro state if not exists
    if (!state.dataMacro) {
        state.dataMacro = [];
        state.currentPageMacro = 0;
        state.pageSizeMacro = 50;
        state.totalCountMacro = 0;
        state.searchQueryMacro = '';
        state.sortColMacro = 'publish_time';
        state.sortDescMacro = true; // Default: newest first
    }

    // Update UI labels based on current language
    updateMacroViewLabels();

    // Setup event listeners
    setupMacroViewEventListeners();

    // Initial render
    renderMacroHeaders();
    fetchMacroData();
}

// Update all macro view labels based on current language
function updateMacroViewLabels() {
    const searchInput = document.getElementById('searchInputMacro');
    if (searchInput) searchInput.placeholder = i18n[state.lang].searchPlaceholderMacro;
    
    const lblFrom = document.getElementById('lblFromMacro');
    if (lblFrom) lblFrom.innerText = i18n[state.lang].lblFrom;
    
    const lblTo = document.getElementById('lblToMacro');
    if (lblTo) lblTo.innerText = i18n[state.lang].lblTo;
    
    const prevBtn = document.getElementById('prevBtnMacro');
    if (prevBtn) prevBtn.innerText = i18n[state.lang].prev;
    
    const nextBtn = document.getElementById('nextBtnMacro');
    if (nextBtn) nextBtn.innerText = i18n[state.lang].next;
    
    const loadingText = document.getElementById('loadingTextMacro');
    if (loadingText) loadingText.innerText = i18n[state.lang].loading;
    
    const exportBtnText = document.getElementById('exportBtnTextMacro');
    if (exportBtnText) exportBtnText.innerText = i18n[state.lang].exportBtn;
    
    const filterBtnText = document.getElementById('filterBtnTextMacro');
    if (filterBtnText) filterBtnText.innerText = i18n[state.lang].filterBtn;
    
    const refreshMacroBtn = document.getElementById('refreshMacroBtn');
    if (refreshMacroBtn) refreshMacroBtn.title = i18n[state.lang].refreshBtn;

    const macroVideoBtnText = document.getElementById('macroVideoBtnText');
    if (macroVideoBtnText) macroVideoBtnText.innerText = i18n[state.lang].watchNewsBtn;
}

// Setup all event listeners for macro view
function setupMacroViewEventListeners() {
    // Search input with Vietnamese text normalization
    const searchInput = document.getElementById('searchInputMacro');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQueryMacro = normalizeVietnamese(e.target.value);
            state.currentPageMacro = 0;
            fetchMacroData();
        });
    }

    // Pagination buttons
    const firstBtn = document.getElementById('firstBtnMacro');
    if (firstBtn) {
        firstBtn.onclick = () => { 
            state.currentPageMacro = 0; 
            fetchMacroData(); 
        };
    }

    const prevBtn = document.getElementById('prevBtnMacro');
    if (prevBtn) {
        prevBtn.onclick = () => { 
            state.currentPageMacro--; 
            fetchMacroData(); 
        };
    }

    const nextBtn = document.getElementById('nextBtnMacro');
    if (nextBtn) {
        nextBtn.onclick = () => { 
            state.currentPageMacro++; 
            fetchMacroData(); 
        };
    }

    const lastBtn = document.getElementById('lastBtnMacro');
    if (lastBtn) {
        lastBtn.onclick = () => { 
            state.currentPageMacro = Math.ceil(state.totalCountMacro / state.pageSizeMacro) - 1; 
            fetchMacroData(); 
        };
    }
}

// ─── Vietnamese Text Normalization ─────────────────────────────────────────

function normalizeVietnamese(text) {
    if (!text) return '';
    
    // Convert to lowercase
    let normalized = text.toLowerCase();
    
    // Remove Vietnamese diacritics
    const diacriticsMap = {
        'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'đ': 'd',
        'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y'
    };
    
    for (const [accented, plain] of Object.entries(diacriticsMap)) {
        normalized = normalized.replace(new RegExp(accented, 'g'), plain);
    }
    
    return normalized;
}

// ─── Data Fetching ─────────────────────────────────────────────────────────

// Helper function to build filter query parameters for macro
function buildMacroFilterQuery() {
    const filters = [];
    
    // Get filter state from global scope
    if (typeof filterState !== 'undefined' && filterState.macro) {
        // Source name filter
        if (filterState.macro.source_name.has('__NONE__')) {
            // Special case: nothing selected, return impossible condition
            filters.push('source_name=eq.__IMPOSSIBLE__');
        } else if (filterState.macro.source_name.size > 0) {
            // Specific sources selected
            const sources = Array.from(filterState.macro.source_name);
            if (sources.length === 1) {
                filters.push(`source_name=eq.${encodeURIComponent(sources[0])}`);
            } else {
                const orConditions = sources.map(src => `source_name.eq.${encodeURIComponent(src)}`).join(',');
                filters.push(`or=(${orConditions})`);
            }
        }
        // If size is 0 and no __NONE__, it means "all selected" - don't add any filter
    }
    
    return filters.length > 0 ? '&' + filters.join('&') : '';
}

async function fetchMacroData() {
    const loadingState = document.getElementById('loadingStateMacro');
    if (loadingState) loadingState.classList.remove('hidden');
    
    try {
        let allData = [];
        
        // Determine the actual database column to sort by
        const sortColumn = state.sortColMacro === 'headline' ? 'news_impact_score' : state.sortColMacro;
        const sortOrder = state.sortDescMacro ? 'desc' : 'asc';
        
        console.log('Macro sort:', sortColumn, sortOrder, 'Column:', state.sortColMacro, 'Desc:', state.sortDescMacro);
        
        // If there's a search query, fetch enough data for client-side filtering
        if (state.searchQueryMacro) {
            // Calculate how many records we need to fetch
            const recordsNeeded = (state.currentPageMacro + 1) * state.pageSizeMacro;
            const fetchLimit = Math.min(recordsNeeded * 2, 1000); // Fetch 2x needed for filtering, cap at 1000
            
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.INDUSTRY&publish_time=gte.${state.fromDateMacro}T00:00:00Z&publish_time=lte.${state.toDateMacro}T23:59:59Z`;
            
            // Apply filters
            url += buildMacroFilterQuery();
            
            // Add primary sort
            url += `&order=${sortColumn}.${sortOrder}`;
            // Add secondary sort by publish_time for consistent ordering when primary values are equal
            if (sortColumn !== 'publish_time') {
                url += `,publish_time.desc`;
            }
            url += `&limit=${fetchLimit}`;
            
            console.log('Macro fetch URL (with search):', url);
            
            const res = await fetch(url, {
                headers: { 
                    'apikey': SUPABASE_ANON_KEY, 
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'count=exact'
                }
            });

            const json = await res.json();
            
            if (!Array.isArray(json)) {
                console.error('Supabase error:', json);
                allData = [];
            } else {
                // Client-side filtering with Vietnamese normalization
                const normalizedQuery = normalizeVietnamese(state.searchQueryMacro);
                allData = json.filter(row => {
                    const normalizedHeadline = normalizeVietnamese(row.headline || '');
                    return normalizedHeadline.includes(normalizedQuery);
                });
                
                // After filtering, re-sort client-side to maintain correct order
                console.log('Table: Re-sorting after filter by', sortColumn, sortOrder);
                if (sortColumn === 'publish_time') {
                    allData.sort((a, b) => {
                        const av = new Date(a.publish_time).getTime();
                        const bv = new Date(b.publish_time).getTime();
                        return sortOrder === 'desc' ? (bv - av) : (av - bv);
                    });
                } else if (sortColumn === 'source_name') {
                    allData.sort((a, b) => {
                        const av = (a.source_name || '').toLowerCase();
                        const bv = (b.source_name || '').toLowerCase();
                        return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
                    });
                } else if (sortColumn === 'news_impact_score') {
                    allData.sort((a, b) => {
                        const av = a.news_impact_score ?? 0;
                        const bv = b.news_impact_score ?? 0;
                        return sortOrder === 'desc' ? (bv - av) : (av - bv);
                    });
                }
                console.log('Table: First 3 after re-sort:', allData.slice(0, 3).map(r => ({
                    time: r.publish_time,
                    score: r.news_impact_score,
                    headline: r.headline?.substring(0, 40)
                })));
            }
            
            // Apply pagination to filtered results
            state.totalCountMacro = allData.length;
            
            const start = state.currentPageMacro * state.pageSizeMacro;
            const end = start + state.pageSizeMacro;
            state.dataMacro = allData.slice(start, end);
            
        } else {
            // No search query - use server-side pagination
            const start = state.currentPageMacro * state.pageSizeMacro;
            const end = start + state.pageSizeMacro - 1;
            
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.INDUSTRY&publish_time=gte.${state.fromDateMacro}T00:00:00Z&publish_time=lte.${state.toDateMacro}T23:59:59Z`;
            
            // Apply filters
            url += buildMacroFilterQuery();
            
            // Add primary sort
            url += `&order=${sortColumn}.${sortOrder}`;
            // Add secondary sort by publish_time for consistent ordering when primary values are equal
            if (sortColumn !== 'publish_time') {
                url += `,publish_time.desc`;
            }
            
            console.log('Macro fetch URL (no search):', url);
            
            const res = await fetch(url, {
                headers: { 
                    'apikey': SUPABASE_ANON_KEY, 
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 
                    'Range': `${start}-${end}`, 
                    'Prefer': 'count=exact' 
                }
            });

            const json = await res.json();

            if (!Array.isArray(json)) {
                console.error('Supabase error:', json);
                state.dataMacro = [];
                state.totalCountMacro = 0;
            } else {
                state.dataMacro = json;
                
                // Debug: Log first 3 records to verify sort order
                console.log('Macro data received (first 3):', state.dataMacro.slice(0, 3).map(r => ({
                    time: r.publish_time,
                    headline: r.headline?.substring(0, 30)
                })));
                
                const contentRange = res.headers.get('content-range');
                if (contentRange) {
                    const match = contentRange.match(/\/(\d+)$/);
                    if (match) state.totalCountMacro = parseInt(match[1]);
                } else {
                    state.totalCountMacro = state.dataMacro.length;
                }
            }
        }
        
        // Preload headline translations in background
        if (state.dataMacro.length > 0 && typeof translateHeadlines === 'function') {
            translateHeadlines(state.dataMacro.map(d => d.headline));
        }
    } catch (e) { 
        console.error('fetchMacroData error:', e);
        state.dataMacro = [];
        state.totalCountMacro = 0;
    } finally {
        if (loadingState) loadingState.classList.add('hidden');
        renderMacroBody();
        renderMacroPaginationUI();
    }
}

// ─── Table Rendering ───────────────────────────────────────────────────────

function renderMacroHeaders() {
    const cols = [
        { id: 'index', label: i18n[state.lang].cols.index, w: 'w-12 text-center', sortable: false },
        { id: 'publish_time', label: i18n[state.lang].cols.publish_time, w: 'w-32', sortable: true },
        { id: 'source_name', label: i18n[state.lang].cols.source, w: 'w-40', sortable: true },
        { id: 'headline', label: i18n[state.lang].cols.headline, w: 'w-auto', sortable: true }
    ];
    
    const tableHeader = document.getElementById('tableHeaderMacro');
    if (tableHeader) {
        tableHeader.innerHTML = cols.map(c => `
            <th class="px-4 py-4 ${c.sortable ? 'cursor-pointer hover:bg-gray-700/50' : ''} ${c.w} ${c.sortable ? getSortClassMacro(c.id) : ''}" 
                ${c.sortable ? `onclick="handleSortMacro('${c.id}')"` : ''}>
                <div class="flex items-center">
                    <span>${c.label}</span>
                    ${c.sortable ? '<span class="sort-icon"></span>' : ''}
                </div>
            </th>
        `).join('');
    }
}

function getSortClassMacro(id) { 
    if (state.sortColMacro === id) {
        return state.sortDescMacro ? 'sorted-desc' : 'sorted-asc';
    }
    return 'unsorted';
}

function handleSortMacro(id) {
    if (state.sortColMacro === id) {
        // Same column clicked - toggle direction
        state.sortDescMacro = !state.sortDescMacro;
    } else {
        // Different column clicked
        state.sortColMacro = id;
        // Default sort direction based on column
        if (id === 'publish_time') {
            state.sortDescMacro = true; // Newest first for time
        } else if (id === 'headline') {
            state.sortDescMacro = true; // Highest impact score first
        } else {
            state.sortDescMacro = false; // A-Z for source name
        }
    }
    state.currentPageMacro = 0; 
    renderMacroHeaders(); 
    fetchMacroData();
}

// Make handleSortMacro globally accessible for onclick handlers
window.handleSortMacro = handleSortMacro;

// Refresh macro data with current filters (keeps page at 0)
function refreshMacroData() {
    const icon = document.getElementById('refreshMacroIcon');
    
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
    state.currentPageMacro = 0;
    fetchMacroData();
}

// Clear macro search input
function clearMacroSearch() {
    const input = document.getElementById('searchInputMacro');
    if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input'));
        input.focus();
    }
    const btn = document.getElementById('clearMacroBtn');
    if (btn) btn.classList.add('hidden');
}

// Format date as dd/mm hh:mm
function formatMacroDateTime(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
}

// Format source name (remove 'Investing-' prefix)
function formatSourceName(sourceName) {
    if (!sourceName) return '-';
    if (sourceName.startsWith('Investing-')) {
        return 'Investing';
    }
    return sourceName;
}

function renderMacroBody() {
    const tbody = document.getElementById('tableBodyMacro');
    const emptyState = document.getElementById('emptyStateMacro');
    
    if (!tbody) return;
    
    if (state.dataMacro.length === 0) {
        tbody.innerHTML = '';
        if (emptyState) {
            emptyState.classList.remove('hidden');
            emptyState.innerText = i18n[state.lang].empty;
        }
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Debug: Log what we're about to render
    console.log('Rendering macro body, first 3 times:', state.dataMacro.slice(0, 3).map(r => r.publish_time));
    
    tbody.innerHTML = state.dataMacro.map((row, idx) => {
        // Use translated headline if in English mode
        const headline = state.lang === DEFAULT_LANG ? row.headline : (state.translatedHeadlines[row.headline] || row.headline);
        
        // Highlight headline in yellow if news_impact_score >= 30
        const impactScore = row.news_impact_score || 0;
        const headlineColor = impactScore >= 30 ? 'text-fin-gold font-semibold' : 'text-gray-300';
        
        return `
            <tr class="hover:bg-fin-gold/5 transition-colors">
                <td class="px-4 py-4 text-center text-gray-500 text-xs">${(state.currentPageMacro * state.pageSizeMacro) + idx + 1}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatMacroDateTime(row.publish_time)}</td>
                <td class="px-4 py-4 text-gray-400 text-xs">${formatSourceName(row.source_name)}</td>
                <td class="px-4 py-4">
                    <a href="${row.news_link || '#'}" target="_blank" class="${headlineColor} hover:text-fin-gold hover:underline transition-all text-xs">
                        ${headline || '-'}
                    </a>
                </td>
            </tr>
        `;
    }).join('');
}

// ─── Pagination ────────────────────────────────────────────────────────────

function renderMacroPaginationUI() {
    const paginationInfo = document.getElementById('paginationInfoMacro');
    const pageNumbers = document.getElementById('pageNumbersMacro');
    const firstBtn = document.getElementById('firstBtnMacro');
    const prevBtn = document.getElementById('prevBtnMacro');
    const nextBtn = document.getElementById('nextBtnMacro');
    const lastBtn = document.getElementById('lastBtnMacro');
    
    if (!paginationInfo || !pageNumbers) return;
    
    if (state.totalCountMacro === 0) {
        paginationInfo.innerText = '';
        pageNumbers.innerHTML = '';
        if (firstBtn) firstBtn.disabled = true;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (lastBtn) lastBtn.disabled = true;
        return;
    }
    
    const start = (state.currentPageMacro * state.pageSizeMacro) + 1;
    const end = Math.min(start + state.pageSizeMacro - 1, state.totalCountMacro);
    paginationInfo.innerText = i18n[state.lang].paging(start, end, state.totalCountMacro);
    
    // Calculate total pages
    const totalPages = Math.ceil(state.totalCountMacro / state.pageSizeMacro);
    
    // Show 3 page numbers on mobile, 5 on wider screens
    const maxPages = window.innerWidth < 480 ? 3 : 5;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    
    // Show max page numbers at a time
    let startPage = Math.max(0, state.currentPageMacro - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    
    // Adjust if we're near the end
    if (endPage - startPage < maxPages - 1) {
        startPage = Math.max(0, endPage - (maxPages - 1));
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
            i === state.currentPageMacro 
                ? 'bg-fin-gold text-fin-blue border border-fin-gold' 
                : 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
        }`;
        pageBtn.innerText = i + 1;
        pageBtn.onclick = () => {
            state.currentPageMacro = i;
            fetchMacroData();
        };
        pageNumbers.appendChild(pageBtn);
    }
    
    if (firstBtn) firstBtn.disabled = state.currentPageMacro === 0;
    if (prevBtn) prevBtn.disabled = state.currentPageMacro === 0;
    if (nextBtn) nextBtn.disabled = end >= state.totalCountMacro;
    if (lastBtn) lastBtn.disabled = end >= state.totalCountMacro;
}

// ─── Excel Export ──────────────────────────────────────────────────────────

async function exportMacroToExcel() {
    const btn = document.getElementById('exportBtnMacro');
    const btnText = document.getElementById('exportBtnTextMacro');
    const originalText = btnText.innerText;
    
    // Disable button and show loading state
    btn.disabled = true;
    btnText.innerText = i18n[state.lang].exporting;
    btn.classList.add('opacity-60', 'cursor-not-allowed');

    try {
        // Use current sort order from the table (same as fetchMacroData)
        const sortColumn = state.sortColMacro === 'headline' ? 'news_impact_score' : state.sortColMacro;
        const sortOrder = state.sortDescMacro ? 'desc' : 'asc';
        
        console.log('Export Macro: Sorting by', sortColumn, sortOrder);

        // Fetch ALL records in batches (Supabase max: 1000 per request)
        const batchSize = 1000;
        let allData = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            let url = `${SUPABASE_URL}/rest/v1/hotnews?select=*&match_method=eq.INDUSTRY&publish_time=gte.${state.fromDateMacro}T00:00:00Z&publish_time=lte.${state.toDateMacro}T23:59:59Z`;
            
            // Apply filter popup filters
            const filterQuery = buildMacroFilterQuery();
            if (filterQuery) {
                url += filterQuery;
            }
            
            // Add primary sort
            url += `&order=${sortColumn}.${sortOrder}`;
            // Add secondary sort by publish_time for consistent ordering when primary values are equal
            if (sortColumn !== 'publish_time') {
                url += `,publish_time.desc`;
            }
            url += `&limit=${batchSize}&offset=${offset}`;
            
            console.log(`Export Macro: Fetching batch ${Math.floor(offset / batchSize) + 1}, offset: ${offset}`);

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
            console.log(`Export Macro: Fetched ${batch.length} records, total so far: ${allData.length}`);
            
            // Update button text with progress
            btnText.innerText = `${i18n[state.lang].exporting} (${allData.length})`;
            
            // If we got fewer records than batchSize, we've reached the end
            if (batch.length < batchSize) {
                hasMore = false;
            } else {
                offset += batchSize;
            }
        }
        
        console.log('Export Macro: Total fetched records:', allData.length);
        
        // Apply client-side Vietnamese search filter if exists (same as table)
        if (state.searchQueryMacro) {
            const normalizedQuery = normalizeVietnamese(state.searchQueryMacro);
            allData = allData.filter(row => {
                const normalizedHeadline = normalizeVietnamese(row.headline || '');
                return normalizedHeadline.includes(normalizedQuery);
            });
            
            // After filtering, re-sort client-side to maintain correct order
            console.log('Export Macro: Re-sorting after filter by', sortColumn, sortOrder);
            if (sortColumn === 'publish_time') {
                allData.sort((a, b) => {
                    const av = new Date(a.publish_time).getTime();
                    const bv = new Date(b.publish_time).getTime();
                    return sortOrder === 'desc' ? (bv - av) : (av - bv);
                });
            } else if (sortColumn === 'source_name') {
                allData.sort((a, b) => {
                    const av = (a.source_name || '').toLowerCase();
                    const bv = (b.source_name || '').toLowerCase();
                    return sortOrder === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
                });
            } else if (sortColumn === 'news_impact_score') {
                allData.sort((a, b) => {
                    const av = a.news_impact_score ?? 0;
                    const bv = b.news_impact_score ?? 0;
                    return sortOrder === 'desc' ? (bv - av) : (av - bv);
                });
            }
        }
        
        console.log('Export Macro: First 3 after filter:', allData.slice(0, 3).map(r => ({
            time: r.publish_time,
            source: r.source_name,
            score: r.news_impact_score,
            headline: r.headline?.substring(0, 40)
        })));

        // Build Excel data
        const headers = [
            i18n[state.lang].cols.index,
            i18n[state.lang].cols.publish_time,
            i18n[state.lang].cols.source,
            i18n[state.lang].cols.headline,
            i18n[state.lang].cols.link
        ];

        const rows = allData.map((row, idx) => {
            // Use translated headline if in English mode
            const headline = state.lang === DEFAULT_LANG ? row.headline : (state.translatedHeadlines[row.headline] || row.headline);
            
            return [
                idx + 1,
                formatMacroDateTime(row.publish_time),
                formatSourceName(row.source_name),
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
                ...rows.slice(0, 100).map(r => String(r[i] || '').length) // Sample first 100 rows for performance
            );
            return { wch: Math.min(maxLen + 2, 80) }; // Max width 80 for headline column
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, i18n[state.lang].macro.sheetName);

        // Generate filename with date range
        const filename = `${i18n[state.lang].exportFilePrefix.macro}_${state.fromDateMacro}_${state.toDateMacro}.xlsx`;
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

// Make exportMacroToExcel globally accessible for onclick handlers
window.exportMacroToExcel = exportMacroToExcel;
