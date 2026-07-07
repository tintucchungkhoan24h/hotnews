// SEO Client Logic for Macro Digest
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

function isoToDisplayWithTime(iso, isoDatetime) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const datePart = `${d}/${m}/${y}`;
  if (isoDatetime) {
    // Parse HH:mm directly from the string — no Date() to avoid timezone conversion
    // Handles: "2026-07-04 18:32:42.775201" or "2026-07-04T18:32:42.775201+00"
    const timeMatch = String(isoDatetime).match(/[T\s](\d{2}):(\d{2})/);
    if (timeMatch) {
      return `${datePart} ${timeMatch[1]}:${timeMatch[2]}`;
    }
  }
  return `${datePart} 00:00`;
}

function isoToPathSegment(iso) {
  if (!iso) return '00-00-0000';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

function normalizePathLang(lang) {
  if (!lang) return 'vi';
  if (lang === 'zh-TW') return 'zh';
  return String(lang).split('-')[0] || 'vi';
}

function getCurrentPathLang() {
  const sectionMatch = window.location.pathname.match(/\/diem-tin-vi-mo\/([^/]+)/);
  if (sectionMatch && sectionMatch[1]) return normalizePathLang(sectionMatch[1]);
  return normalizePathLang(document.documentElement.lang || 'vi');
}

function getArticleForLang(articles, pathLang) {
  const lookupLang = pathLang === 'zh' ? 'zh-TW' : pathLang;
  return articles.find(a => a.langCode === lookupLang)
    || articles.find(a => (a.langCode === 'zh-TW' ? 'zh' : a.langCode) === pathLang)
    || articles[0];
}

function isUsableArticleUrl(url) {
  return typeof url === 'string'
    && url.trim() !== ''
    && !['undefined', 'null'].includes(url.trim().toLowerCase());
}

function buildArticleSpokeUrl(articleUrl, lang, dateIso) {
  const normalizedLang = normalizePathLang(lang);
  const trimmedUrl = isUsableArticleUrl(articleUrl) ? articleUrl.trim() : '';
  if (trimmedUrl) {
    return trimmedUrl.startsWith('http')
      ? trimmedUrl
      : `${window.location.origin}${trimmedUrl.startsWith('/') ? '' : '/'}${trimmedUrl}`;
  }
  return `${window.location.origin}/diem-tin-vi-mo/${normalizedLang}/${isoToPathSegment(dateIso)}`;
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

// Toggle article expansion
function toggleArticle(articleEl) {
  const isCollapsed = articleEl.classList.contains('collapsed');
  
  if (isCollapsed) {
    articleEl.classList.remove('collapsed');
    articleEl.classList.add('expanded');
  } else {
    articleEl.classList.remove('expanded');
    articleEl.classList.add('collapsed');
    // Scroll smoothly to the article position after a short delay to let the layout update
    setTimeout(() => {
      articleEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
  updateToggleAllButton();
}

// Toggle all articles
function toggleAllArticles() {
  const articles = document.querySelectorAll('#digest-feed article');
  if (!articles.length) return;

  const allCollapsed = Array.from(articles).every(article => article.classList.contains('collapsed'));
  articles.forEach(article => {
    article.classList.remove('collapsed', 'expanded');
    if (allCollapsed) {
      article.classList.add('expanded');
    } else {
      article.classList.add('collapsed');
    }
  });
  updateToggleAllButton();
}

// Update toggle all button text based on current state
function updateToggleAllButton() {
  const toggleBtn = document.getElementById('toggleAllBtn');
  if (!toggleBtn) return;

  const articles = document.querySelectorAll('#digest-feed article');
  if (!articles.length) {
    toggleBtn.textContent = (langDict.expandAll || 'Expand All') + ' ▼';
    return;
  }

  const allCollapsed = Array.from(articles).every(article => article.classList.contains('collapsed'));
  if (allCollapsed) {
    toggleBtn.textContent = (langDict.expandAll || 'Expand All') + ' ▼';
  } else {
    toggleBtn.textContent = (langDict.collapseAll || 'Collapse All') + ' ▲';
  }
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
  fetchBtn.style.opacity = '0.5';
  mainEl.innerHTML = `<div class="text-center py-10 text-gray-400">${langDict.loadingSummaries || 'Loading summaries...'}</div>`;

  try {
    const url = `${window.SUPABASE_URL}/rest/v1/market_summary_macro?select=summary_date,created_at,articles&summary_date=gte.${stateFromDate}&summary_date=lte.${stateToDate}&order=summary_date.desc,created_at.desc`;
    const res = await fetch(url, {
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
      }
    });
    
    if (!res.ok) throw new Error('Failed to fetch data');
    const rows = await res.json();
    
    if (!rows || rows.length === 0) {
      mainEl.innerHTML = `<div class="text-center py-10 text-gray-400 font-bold text-lg">${langDict.noSummaries || 'No summaries found for this date range.'}</div>`;
      return;
    }

    let html = '';
    let currentLang = getCurrentPathLang();
    const isRtl = currentLang === 'ar';

    // Add summary toolbar
    html += `
    <div class="summary-toolbar">
      <div class="summary-toolbar-left">
        <span class="articles-count">📰 <span id="articlesCount">${rows.length}</span> ${langDict.articles || 'Articles'}</span>
      </div>
      <button id="toggleAllBtn" class="toggle-all-btn" onclick="toggleAllArticles()">
        ${langDict.expandAll || 'Expand All'} ▼
      </button>
    </div>`;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const articles = typeof row.articles === 'string' ? JSON.parse(row.articles) : row.articles;
      const article = getArticleForLang(articles, currentLang);
      
      if (!article) continue;

      const rDate = row.summary_date;
      const rCreatedAt = row.created_at || null;
      const articleNumber = i + 1;
      
      // Format reference links to appear on separate lines with label
      let formattedContent = article.content || '';
      // Convert h3 to h2 to match stock digest format
      formattedContent = formattedContent.replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>');
      // First, fix all instances of double single quotes in rel attribute globally
      formattedContent = formattedContent.replace(/rel=''nofollow''/g, 'rel="nofollow"');
      // Fix <a> tags where attribute values are wrapped in double-double-quotes (""value"")
      // and anchor text is wrapped in ""text"" — e.g. href=""https://..."" rel=""nofollow"">""Text""</a>
      formattedContent = formattedContent.replace(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, text) => {
        // Fix each attribute: attr=""value"" → attr="value"
        const fixedAttrs = attrs.replace(/(\w[\w-]*)=""([^"]*)""/g, '$1="$2"');
        // Strip leading/trailing " or "" from anchor text
        const fixedText = text.replace(/^"+([^]*?)"+$/g, '$1').trim();
        return `<a ${fixedAttrs}>${fixedText}</a>`;
      });
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+((?:https?:=""\s+)?[^=]+=""\s+[^=]+=""\s+[^=]+=""(?:\s+[^=]+=""*)*)([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, urlParts, afterHref, text) => {
        // Extract all the URL parts from the ="" attributes
        const parts = urlParts.match(/([^=]+)=""/g) || [];
        const url = parts.map(p => p.replace(/=""$/, '').replace(/''$/, '').replace(/""$/, '').trim()).join('');
        const allAttrs = (beforeHref + ' ' + afterHref).trim();
        return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
      });
      // Fix <a> tags with href="" and URL split into multiple ="" attributes (4 parts)
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+https:=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, domain, path1, path2, path3, afterHref, text) => {
        const url = `https://${domain}${path1}${path2}${path3}`.replace(/''$/g, '').replace(/""$/g, '').trim();
        const allAttrs = (beforeHref + ' ' + afterHref).trim();
        return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
      });
      // Fix <a> tags with href="" and URL split into multiple ="" attributes (5 parts)
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""\s+https:=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^=]+)=""\s+([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, domain, path1, path2, path3, path4, afterHref, text) => {
        const url = `https://${domain}${path1}${path2}${path3}${path4}`.replace(/''$/g, '').replace(/""$/g, '').trim();
        const allAttrs = (beforeHref + ' ' + afterHref).trim();
        return `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
      });
      // Fix <a> tags with href wrapped in double single quotes (''url'')
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=''([^'']+)''([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
        const allAttrs = (beforeHref + ' ' + afterHref).trim();
        return `<a href="${hrefValue}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`;
      });
      // First, fix <a> tags with comma-separated URLs in href attribute
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=['"]([^'"]*?)['"]([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
        if (hrefValue.includes(',')) {
          const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
        }
        return match;
      });
      // Handle the specific case with double single quotes (''href='')
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=''([^'']*?)''([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
        if (hrefValue.includes(',')) {
          const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
        }
        return match;
      });
      // Handle the case with double double quotes (""href="")
      formattedContent = formattedContent.replace(/<a\s+([^>]*?)href=""([^"]*?)""([^>]*?)>([^<]*?)<\/a>/gi, (match, beforeHref, hrefValue, afterHref, text) => {
        if (hrefValue.includes(',')) {
          const urls = hrefValue.split(',').map(u => u.trim()).filter(u => u);
          const allAttrs = (beforeHref + ' ' + afterHref).trim();
          return urls.map(url => `<a href="${url}"${allAttrs ? ' ' + allAttrs : ''}>${text}</a>`).join('<br>');
        }
        return match;
      });
      // Handle reference links in <p> tags format
      formattedContent = formattedContent.replace(/<p>([^<]*?(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|数据参考|參考資料|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|データ参照|データ出典|参考文献|Reference data sources|Reference data source)[^<]*[:：]\s*)([^<]*(?:<a[^>]*>.*?<\/a>[^<]*)*)<\/p>/gi, (match, label, links) => {
        // Extract all links and put each on a new line
        const linkMatches = links.match(/<a[^>]*>.*?<\/a>/g) || [];
        const formattedLinks = linkMatches.map(link => {
          // Add target="_blank" if not already present
          if (!link.includes('target=')) {
            return link.replace('<a', '<a target="_blank"');
          }
          return link;
        }).join('<br>');
        return `<p><strong>${label}</strong><br>${formattedLinks}</p>`;
      });
      // Handle inline reference links format (comma-separated)
      formattedContent = formattedContent.replace(/(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|참고 자료 출처|数据参考|參考資料|參考資料來源|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|مصدر البيانات المرجعية|データ参照|データ出典|参考文献|参考データソース|Reference data sources|Reference data source)[:：]\s*((?:<a[^>]*>.*?<\/a>(?:\s*,\s*)?)+)/gi, (match, links) => {
        // Extract the label from the match
        const labelMatch = match.match(/(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|참고 자료 출처|数据参考|參考資料|參考資料來源|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|مصدر البيانات المرجعية|データ参照|データ出典|参考文献|参考データソース|Reference data sources|Reference data source)[:：]/i);
        const label = labelMatch ? labelMatch[0] : 'Nguồn dữ liệu tham khảo:';
        // Extract all links and put each on a new line
        const linkMatches = links.match(/<a[^>]*>.*?<\/a>/g) || [];
        const formattedLinks = linkMatches.map(link => {
          // Add target="_blank" if not already present
          if (!link.includes('target=')) {
            return link.replace('<a', '<a target="_blank"');
          }
          return link;
        }).join('<br>');
        return `<p><strong>${label} </strong><br>${formattedLinks}</p>`;
      });
      formattedContent = normalizeReferenceLinks(formattedContent);

      let absoluteSpokeUrl = buildArticleSpokeUrl(article.article_url, currentLang, rDate);

      html += `
      <article class="collapsed" ${isRtl ? 'dir="rtl"' : ''} data-spoke-url="${absoluteSpokeUrl}">
        <div class="article-number">${articleNumber}</div>
        <div class="article-header">
          <div class="article-header-left">
            <h1 class="text-2xl md:text-3xl font-black leading-tight mb-4">
              ${article.title}
            </h1>
            <div class="article-meta">
              <span class="highlight">📅 ${isoToDisplayWithTime(rDate, rCreatedAt)}</span>
              <span>•</span>
              <span>${article.langEmoji || ''} ${article.langName || currentLang.toUpperCase()}</span>
              <span>•</span>
              <span>${window.SITE_NAME}</span>
            </div>
            <div class="article-actions">
              <button class="copy-link-btn" data-spoke-url="${absoluteSpokeUrl}" onclick="copyArticleLink(this)" title="${langDict.copyLink || 'Copy link'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 0 2 2v1"/>
                </svg>
                <span class="btn-label">${langDict.copyLink || 'Copy link'}</span>
              </button>
            </div>
            <div class="digest-lead" ${isRtl ? 'style="border-left: none; border-right: 4px solid #ffd700; border-radius: 12px 0 0 12px;"' : ''}>${article.lead}</div>
          </div>
        </div>
        ${article.article_photo_url ? `
        <div class="article-photo" style="margin-bottom: 24px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3); max-width: 800px; margin-left: auto; margin-right: auto;">
          <img src="${article.article_photo_url}" alt="${article.title.replace(/"/g, '&quot;')}" style="width: 100%; height: auto; display: block; object-fit: cover; max-height: 500px;">
        </div>` : ''}
        <div class="digest-body">${formattedContent}</div>
        <span class="article-chevron">▼</span>
      </article>
      <hr class="border-gray-800 my-8">
      `;
    }

    mainEl.innerHTML = html;

    // Attach click event listeners to article headers and chevrons
    document.querySelectorAll('#digest-feed article').forEach(article => {
      const header = article.querySelector('.article-header');
      const chevron = article.querySelector('.article-chevron');
      
      const handleToggle = (e) => {
        // Don't toggle if clicking copy button
        if (e.target.closest('.copy-link-btn')) return;
        toggleArticle(article);
      };
      
      if (header) header.addEventListener('click', handleToggle);
      if (chevron) chevron.addEventListener('click', handleToggle);
    });

  } catch (e) {
    console.error(e);
    mainEl.innerHTML = `<div class="text-center py-10 text-red-400 font-bold text-lg">Error loading summaries.</div>`;
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.style.opacity = '1';
  }
}

// ─── Initialization ──────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const today = getGMT7Date();
  const past7 = new Date(today);
  past7.setDate(today.getDate() - 7);
  
  // Remove 30-day limit - allow unlimited past date selection
  const minDateObj = new Date('2020-01-01');
  const maxDateObj = today;
  
  stateFromDate = dateToIso(past7);
  stateToDate = dateToIso(today);

  // Init pickers
  const pFrom = createPicker('seoFromDate', (iso) => {
    stateFromDate = iso;
    if (pickers['seoToDate']) {
      pickers['seoToDate'].min = parseISOtoGMT7(iso);
      if (stateToDate < iso) {
        stateToDate = iso;
        pickers['seoToDate'].value = parseISOtoGMT7(iso);
        pickers['seoToDate'].inputEl.value = isoToDisplay(iso);
      }
    }
  });
  
  const pTo = createPicker('seoToDate', (iso) => {
    stateToDate = iso;
    if (pickers['seoFromDate']) {
      pickers['seoFromDate'].max = parseISOtoGMT7(iso);
      if (stateFromDate > iso) {
        stateFromDate = iso;
        pickers['seoFromDate'].value = parseISOtoGMT7(iso);
        pickers['seoFromDate'].inputEl.value = isoToDisplay(iso);
      }
    }
  });

  if (pFrom) {
    if (window.IS_SPOKE_PAGE && window.SPOKE_ARTICLE_DATE) {
      const spokeDate = new Date(window.SPOKE_ARTICLE_DATE);
      pFrom.value = spokeDate;
      pFrom.viewYear  = spokeDate.getFullYear();
      pFrom.viewMonth = spokeDate.getMonth();
      stateFromDate = dateToIso(spokeDate);
      pFrom.inputEl.value = isoToDisplay(stateFromDate);
    } else {
      pFrom.value = past7;
      pFrom.viewYear  = past7.getFullYear();
      pFrom.viewMonth = past7.getMonth();
      pFrom.inputEl.value = isoToDisplay(stateFromDate);
    }
    pFrom.min = minDateObj;
    pFrom.max = today;
  }
  if (pTo) {
    if (window.IS_SPOKE_PAGE && window.SPOKE_ARTICLE_DATE) {
      const spokeDate = new Date(window.SPOKE_ARTICLE_DATE);
      pTo.value = spokeDate;
      pTo.viewYear  = spokeDate.getFullYear();
      pTo.viewMonth = spokeDate.getMonth();
      stateToDate = dateToIso(spokeDate);
      pTo.inputEl.value = isoToDisplay(stateToDate);
    } else {
      pTo.value = today;
      pTo.viewYear  = today.getFullYear();
      pTo.viewMonth = today.getMonth();
      pTo.inputEl.value = isoToDisplay(stateToDate);
    }
    pTo.min = past7;
    pTo.max = maxDateObj;
  }
  
  if (pFrom && pTo) {
    pFrom.max = pTo.value;
  }

  const fetchBtn = document.getElementById('fetchFeedBtn');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', fetchDynamicFeed);
    // Auto-fetch on page load after everything is initialized
    if (!window.IS_SPOKE_PAGE) {
      setTimeout(() => {
        console.log('Auto-fetching dynamic feed...');
        fetchDynamicFeed().catch(err => console.error('Auto-fetch error:', err));
      }, 10);
    }
  }
});

// ─── Scroll To Top/Bottom Functions ───────────────────────────────────────────

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToBottom() {
  const footer = document.querySelector('footer, #footer-container');
  if (footer) {
    const footerRect = footer.getBoundingClientRect();
    const scrollTarget = window.scrollY + footerRect.top - window.innerHeight + 100; // 100px above footer
    window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
  } else {
    // Fallback if no footer found
    window.scrollTo({ top: document.body.scrollHeight - window.innerHeight, behavior: 'smooth' });
  }
}

// Add scroll buttons to DOM
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Check if buttons already exist to avoid duplicates
    if (document.querySelector('.scroll-buttons-container')) return;
    
    const scrollButtonsContainer = document.createElement('div');
    scrollButtonsContainer.className = 'scroll-buttons-container';
    
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.className = 'scroll-btn';
    scrollTopBtn.innerHTML = '↑';
    scrollTopBtn.addEventListener('click', scrollToTop);
    scrollTopBtn.setAttribute('title', 'Scroll to top');
    
    const scrollBottomBtn = document.createElement('button');
    scrollBottomBtn.className = 'scroll-btn';
    scrollBottomBtn.innerHTML = '↓';
    scrollBottomBtn.addEventListener('click', scrollToBottom);
    scrollBottomBtn.setAttribute('title', 'Scroll to bottom');
    
    scrollButtonsContainer.appendChild(scrollTopBtn);
    scrollButtonsContainer.appendChild(scrollBottomBtn);
    document.body.appendChild(scrollButtonsContainer);
  });
})();
