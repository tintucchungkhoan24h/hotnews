/**
 * generate-digest-macro.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the latest row from the Supabase `market_summary_macro` table,
 * reads header.html + footer.html, and generates 7 static SEO pages:
 *   diem-tin-vi-mo/{langCode}/index.html
 *
 * Usage:
 *   node scripts/generate-digest-macro.mjs
 *   node scripts/generate-digest-macro.mjs --sample
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Supabase config ──────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://ifjxishcrzndbszmvpef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmanhpc2hjcnpuZGJzem12cGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjEwOTcsImV4cCI6MjA5MjkzNzA5N30.0rHs4AWTmRmN34WWdxBM2RsTMu1VQwfKDjve0W2yHEg';

// Read i18n data
const i18nRaw = fs.readFileSync(path.join(ROOT, 'i18n.json'), 'utf8');
const i18nData = JSON.parse(i18nRaw);

// ── hreflang map ─────────────────────────────────────────────────────────────
const HREFLANG = i18nData.hreflang;
const DIGEST_LABEL = i18nData.digestLabel;
const BACK_LABEL = i18nData.backLabel;

const SITE_NAME = 'Tin Tức Chứng Khoán 24h';
const CANONICAL_BASE = '';

const I18N = i18nData.translations;
const I18N_FLAGS = i18nData.flags;
const I18N_LANG_SHORT = i18nData.lang;
const I18N_LANG_NAMES = i18nData.langNames;

// ── Helpers ──────────────────────────────────────────────────────────────────
function fetchJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('JSON parse error: ' + body.slice(0, 200))); }
      });
    });
    req.on('error', reject);
  });
}

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

// ── Fetch summaries ─────────────────────────────────────────────────────
async function fetchSummaries() {
  let url = `${SUPABASE_URL}/rest/v1/market_summary_macro?order=summary_date.desc&limit=7`;

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  const rows = await fetchJson(url, headers);
  if (!rows || rows.length === 0) throw new Error('No rows found in market_summary_macro');
  return rows;
}

// ── Generate one HTML page ───────────────────────────────────────────────────
function generatePage({ articlesList, lang, headerHtml, footerHtml, langs, clientCss, clientJs }) {
  const canonical  = `${CANONICAL_BASE}/diem-tin-vi-mo/${lang}/`;
  const dashboardUrl = `${CANONICAL_BASE}/`;
  const isRtl      = lang === 'ar';
  
  // Use the first article for meta tags (the most recent one)
  const firstArticle = articlesList[0].article;
  
  // Fix relative image paths in header and footer
  let procHeader = headerHtml.replace(/src="([^"]+)"/g, (match, src) => src.startsWith('http') || src.startsWith('/') ? match : `src="/${src}"`);
  let procFooter = footerHtml.replace(/src="([^"]+)"/g, (match, src) => src.startsWith('http') || src.startsWith('/') ? match : `src="/${src}"`);

  // Build Language Menu HTML
  const flagMarkup = I18N_FLAGS[lang] || '';
  const langShort = I18N_LANG_SHORT[lang] || lang.toUpperCase();
  const menuHtml = langs.map(l => {
      const f = I18N_FLAGS[l] || '';
      const n = I18N_LANG_NAMES[l] || l.toUpperCase();
      const s = I18N_LANG_SHORT[l] || l.toUpperCase();
      return `<button type="button" class="lang-option" data-lang="${l}" onclick="window.location.href='/diem-tin-vi-mo/${l}/'">
          <span style="display: inline-block; width: 22px; height: 15px; overflow: hidden; border-radius: 2px;">${f}</span>
          <span>${n} (${s})</span>
      </button>`;
  }).join('');

  // Inject into header
  procHeader = procHeader.replace('<span id="langFlag"></span>', `<span id="langFlag">${flagMarkup}</span>`);
  procHeader = procHeader.replace(/<span id="langText"([^>]*)><\/span>/, `<span id="langText"$1>${langShort}</span>`);
  procHeader = procHeader.replace('<div id="langMenu" class="lang-menu" aria-hidden="true"></div>', `<div id="langMenu" class="lang-menu" aria-hidden="true">${menuHtml}</div>`);

  // Get current language translation dictionary
  const currentI18n = I18N[lang] || I18N['en'] || {};

  return `<!DOCTYPE html>
<html lang="${HREFLANG[lang] || lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${firstArticle.title} | ${SITE_NAME}</title>
  <meta name="description" content="${firstArticle.lead.replace(/"/g, '&quot;').slice(0, 160)}">
  <link rel="canonical" href="${canonical}">
${langs.map(l => `  <link rel="alternate" hreflang="${HREFLANG[l] || l}" href="${CANONICAL_BASE}/diem-tin-vi-mo/${l}/">`).join('\n')}
  <link rel="alternate" hreflang="x-default" href="${CANONICAL_BASE}/diem-tin-vi-mo/vi/">

  <meta property="og:title" content="${firstArticle.title}">
  <meta property="og:description" content="${firstArticle.lead.slice(0, 200)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${CANONICAL_BASE}/ava_icon.png">

  <link rel="icon" type="image/png" sizes="48x48" href="/ava_icon.png">
  <link rel="stylesheet" href="/index.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: { extend: { colors: { 'fin-blue': '#0a192f', 'fin-blue-light': '#112240', 'fin-gold': '#ffd700' } } }
    }
  </script>

  <style>
    * { box-sizing: border-box; }
    html { overflow-y: scroll; }
    body { margin: 0; padding: 0; background: #0a192f; color: #f3f4f6; font-family: 'Inter', system-ui, sans-serif; }
    .avatar-glow { box-shadow: 0 0 15px rgba(255,215,0,0.3); border: 2px solid rgba(255,215,0,0.5); }
    
    /* Tab bar (mirrors main app) */
    .tab-bar-wrap { overflow-x: auto; scrollbar-width: none; }
    .tab-bar-wrap::-webkit-scrollbar { display: none; }
    .tab-button { color: #9ca3af; background: transparent; border: none; cursor: pointer; user-select: none; position: relative; border-radius: 10px; margin: 0 1px; }
    .tab-btn-responsive { padding: 6px 10px; font-size: 11px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 4px; text-decoration: none; transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1); font-weight: 700; }
    @media (min-width: 480px) { .tab-btn-responsive { padding: 8px 14px; font-size: 12px; } }
    @media (min-width: 640px) { .tab-btn-responsive { padding: 10px 20px; font-size: 14px; } }
    .tab-button:hover { color: #fef9c3; background: rgba(255, 255, 255, 0.06); }
    .tab-button.active { color: #0a192f; background: #ffd700; box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3); }
    .tab-button:active { transform: scale(0.98); }

    /* Article content styling - Professional Design */
    .digest-lead { 
      background: linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(17,34,64,0.8) 100%); 
      border-left: 4px solid #ffd700; 
      padding: 20px 24px; 
      border-radius: 0 16px 16px 0; 
      font-size: 16px; 
      line-height: 1.8; 
      color: #e2e8f0; 
      font-style: italic; 
      margin-bottom: 32px; 
      position: relative;
      box-shadow: 0 4px 20px rgba(255,215,0,0.08);
    }
    .digest-body h2 { 
      font-size: 1.35rem; 
      font-weight: 800; 
      color: #ffd700; 
      margin: 36px 0 16px; 
      padding-bottom: 12px; 
      border-bottom: 2px solid rgba(255,215,0,0.25);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .digest-body h2::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #ffd700;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(255,215,0,0.5);
    }
    .digest-body p { 
      margin: 0 0 18px; 
      line-height: 1.85; 
      color: #d1d5db; 
      font-size: 15px;
      text-align: justify;
    }
    .digest-body strong { 
      color: #fbbf24; 
      font-weight: 700;
      background: rgba(251,191,36,0.1);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .digest-body a {
      color: #60a5fa;
      text-decoration: none;
      border-bottom: 1px solid rgba(96,165,250,0.3);
      transition: all 0.2s ease;
      display: inline-block;
      margin-bottom: 4px;
    }
    .digest-body a:hover {
      color: #ffd700;
      border-bottom-color: #ffd700;
    }
    
    /* Enhanced article card styling */
    article {
      background: linear-gradient(180deg, rgba(17,34,64,0.5) 0%, rgba(10,25,47,0.3) 100%);
      border: 1px solid rgba(255,215,0,0.1);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 32px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    }
    article:hover {
      border-color: rgba(255,215,0,0.2);
      box-shadow: 0 12px 40px rgba(255,215,0,0.1);
      transform: translateY(-2px);
    }
    
    /* Enhanced title styling */
    article h1 {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 50%, #ffd700 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 0 30px rgba(255,215,0,0.3);
      letter-spacing: -0.02em;
    }
    
    /* Enhanced metadata styling */
    .article-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      background: rgba(255,215,0,0.05);
      border: 1px solid rgba(255,215,0,0.15);
      padding: 10px 16px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .article-meta span {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .article-meta span.highlight {
      color: #ffd700;
    }
    
    .back-link { display: inline-flex; align-items: center; gap: 6px; color: #60a5fa; font-size: 13px; font-weight: 600; text-decoration: none; padding: 8px 14px; background: rgba(96,165,250,0.08); border: 1px solid rgba(96,165,250,0.25); border-radius: 8px; margin-bottom: 24px; }
    .back-link:hover { color: #ffd700; border-color: rgba(255,215,0,0.3); }

    /* Lang Menu CSS (copied from index.css for standalone functionality) */
    .lang-menu {
        position: absolute;
        top: calc(100% + 8px);
        right: 0;
        min-width: 220px;
        max-width: min(320px, calc(100vw - 24px));
        max-height: min(70vh, 360px);
        overflow-x: hidden;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        background: rgba(10, 18, 47, 0.98);
        border: 1px solid #334155;
        border-radius: 18px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.55);
        backdrop-filter: blur(16px);
        padding: 8px 0;
        z-index: 10050;
        display: none;
    }
    .lang-menu.open {
        display: block;
    }
    .lang-option {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
        background: transparent;
        border: none;
        color: #f8fafc;
        padding: 10px 14px;
        cursor: pointer;
        font-size: 12px;
        text-align: left;
        transition: background 0.15s ease;
    }
    .lang-option:hover {
        background: rgba(255,255,255,0.06);
    }
    .lang-option svg {
        width: 22px;
        height: 15px;
        border-radius: 2px;
        flex-shrink: 0;
    }
    .lang-option span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    #langToggle {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(17,34,64,0.95);
        border: 1px solid #4b5563;
        color: white;
        padding: 8px 12px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
        transition: all 0.2s ease;
        white-space: nowrap;
    }
    @media (min-width: 640px) {
        #langToggle {
            padding: 10px 18px;
            font-size: 13px;
            gap: 8px;
        }
    }
    #langToggle:hover {
        border-color: #ffd700;
        box-shadow: 0 10px 40px rgba(255, 215, 0, 0.2);
    }
    #langToggle:active {
        transform: scale(0.96);
    }
    #langToggle svg {
        width: 22px;
        height: 15px;
        display: block;
        border-radius: 2px;
    }

    /* Inject dynamic client CSS */
    ${clientCss}
  </style>
</head>
<body class="bg-fin-blue min-h-screen">
  <div class="p-4 md:p-6" style="padding-top: 12px;">

    <!-- HEADER -->
    ${procHeader}

    <!-- TAB BAR -->
    <div class="tab-bar-wrap max-w-[1440px] mx-auto mb-6 overflow-x-auto mt-4" style="scrollbar-width:none;-ms-overflow-style:none;">
        <div class="flex items-center gap-0 bg-fin-blue-light/30 p-1 rounded-xl border border-gray-800/50 w-fit min-w-full sm:min-w-0">
            <a href="${dashboardUrl}#stock/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.stock || 'Mã CK'}</span>
            </a>
            <a href="${dashboardUrl}#macro/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.macro || 'Vĩ Mô'}</span>
            </a>
            <a href="${dashboardUrl}#stable/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.stable || 'Biến động ổn định'}</span>
            </a>
            <a href="${dashboardUrl}#high/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.high || 'Biến động mạnh'}</span>
            </a>
            <a href="${dashboardUrl}#watchlist/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.watchlist || '⭐ Danh sách theo dõi'}</span>
            </a>
            <a href="${dashboardUrl}#spotlight/${lang}" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span class="tab-text">${currentI18n.tabs?.spotlight || '🚀 Mã Nổi Bật'}</span>
            </a>
            <a href="${CANONICAL_BASE}/diem-tin-chung-khoan/${lang}/" class="tab-button tab-btn-responsive font-bold transition-all flex-shrink-0" style="text-decoration:none;">
                <span style="font-size:0.9em;">📰</span>
                <span class="tab-text">${currentI18n.tabs?.digest || 'Điểm tin'}</span>
            </a>
            <a href="${canonical}" aria-current="page" class="tab-button active tab-btn-responsive font-bold transition-all flex-shrink-0 inline-flex items-center gap-1 no-underline" style="text-decoration:none;" title="${currentI18n.tabs?.macroFocus || 'Tập trung Vĩ Mô'}">
                <span style="font-size:0.9em;">📊</span>
                <span class="tab-text">${currentI18n.tabs?.macroFocus || 'Tập trung Vĩ Mô'}</span>
            </a>
        </div>
    </div>

    <!-- FILTER CONTROLS BAR -->
    <div class="bg-fin-blue-light/30 p-3 sm:p-4 md:p-5 rounded-2xl border border-gray-800/50 max-w-[1440px] mx-auto mb-6">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="flex items-center gap-2 w-full sm:w-auto">
                <!-- Date Range Filter -->
                <div class="flex items-center bg-fin-blue border border-gray-700/50 rounded-xl px-3 py-2 shadow-inner flex-1 sm:flex-none">
                    <div class="flex flex-col flex-1">
                        <label id="lblFrom" class="text-[9px] uppercase text-gray-500 font-bold mb-0.5" data-text-key="lblFrom">${currentI18n.lblFrom || 'Từ ngày'}</label>
                        <div class="datepicker-wrapper">
                            <input type="text" id="seoFromDate" class="datepicker-input" data-placeholder-key="datepicker.inputPlaceholder" readonly placeholder="dd/mm/yyyy">
                            <div id="seoFromDatePopup" class="datepicker-popup"></div>
                        </div>
                    </div>
                    <div class="w-[1px] h-7 bg-gray-700 mx-3"></div>
                    <div class="flex flex-col flex-1">
                        <label id="lblTo" class="text-[9px] uppercase text-gray-500 font-bold mb-0.5" data-text-key="lblTo">${currentI18n.lblTo || 'Đến ngày'}</label>
                        <div class="datepicker-wrapper">
                            <input type="text" id="seoToDate" class="datepicker-input" data-placeholder-key="datepicker.inputPlaceholder" readonly placeholder="dd/mm/yyyy">
                            <div id="seoToDatePopup" class="datepicker-popup"></div>
                        </div>
                    </div>
                </div>

                <button id="fetchFeedBtn" class="flex-shrink-0 w-9 h-9 flex items-center justify-center bg-fin-blue border border-gray-700/50 rounded-xl text-gray-400 hover:text-fin-gold hover:border-fin-gold transition-all hover:scale-110 active:scale-95" title="${currentI18n.refreshBtn || 'Làm mới dữ liệu'}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                </button>
            </div>
        </div>
    </div>

    <!-- MAIN ARTICLE FEED -->
    <main id="digest-feed" class="max-w-[1440px] mx-auto">
      ${articlesList.map(item => {
        // Format reference links to appear on separate lines with label
        let formattedContent = item.article.content || '';
        // Convert h3 to h2 to match stock digest format
        formattedContent = formattedContent.replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>');
        formattedContent = formattedContent.replace(/<p>([^<]*?(?:Nguồn dữ liệu tham khảo|Data references|데이터 참고|참고 자료|数据参考|參考資料|ข้อมูลอ้างอิง|แหล่งข้อมูลอ้างอิง|مصادر البيانات|المراجع|データ参照|データ出典|参考文献)[^<]*[:：]\s*)([^<]*(?:<a[^>]*>.*?<\/a>[^<]*)*)<\/p>/gi, (match, label, links) => {
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
        
        return `
        <article${isRtl ? ' dir="rtl"' : ''}>
          <h1 class="text-2xl md:text-3xl font-black leading-tight mb-4">
            ${item.article.title}
          </h1>
          <div class="article-meta">
            <span class="highlight">📅 ${item.date}</span>
            <span>•</span>
            <span>${item.article.langEmoji || ''} ${item.article.langName || lang.toUpperCase()}</span>
            <span>•</span>
            <span>${SITE_NAME}</span>
          </div>

          <div class="digest-lead" ${isRtl ? 'style="border-left: none; border-right: 4px solid #ffd700; border-radius: 12px 0 0 12px;"' : ''}>${item.article.lead}</div>
          <div class="digest-body">${formattedContent}</div>
        </article>
        <hr class="border-gray-800 my-8">
      `;
      }).join('')}
    </main>

  </div>

  <!-- FOOTER -->
  <div id="footer-container">
    ${procFooter}
  </div>

  <!-- Translation injection & Lang Menu JS -->
  <script>
    window.SUPABASE_URL = '${SUPABASE_URL}';
    window.SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
    window.SITE_NAME = '${SITE_NAME}';
    const langDict = ${JSON.stringify(currentI18n)};

    function applyDict() {
        document.querySelectorAll('[data-text-key]').forEach(el => {
            const keys = el.getAttribute('data-text-key').split('.');
            let val = langDict;
            for (const k of keys) val = val?.[k];
            if (val) el.textContent = val;
        });
        document.querySelectorAll('[data-title-key]').forEach(el => {
            const keys = el.getAttribute('data-title-key').split('.');
            let val = langDict;
            for (const k of keys) val = val?.[k];
            if (val) el.setAttribute('title', val);
        });
        document.querySelectorAll('[data-alt-key]').forEach(el => {
            const keys = el.getAttribute('data-alt-key').split('.');
            let val = langDict;
            for (const k of keys) val = val?.[k];
            if (val) el.setAttribute('alt', val);
        });
    }
    applyDict();

    // Language dropdown toggle
    const langToggle = document.getElementById('langToggle');
    const langMenu = document.getElementById('langMenu');
    if (langToggle && langMenu) {
        langToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            langMenu.classList.toggle('open');
            langMenu.setAttribute('aria-hidden', langMenu.classList.contains('open') ? 'false' : 'true');
        });
        document.addEventListener('click', (e) => {
            if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
                langMenu.classList.remove('open');
                langMenu.setAttribute('aria-hidden', 'true');
            }
        });
    }

    // Inject dynamic client JS
    ${clientJs}
  </script>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args     = process.argv.slice(2);
  const isSample = args.includes('--sample');
  let allRows = [];
  let articles;

  if (isSample) {
    console.log('📡 Using SAMPLE_ARTICLES for macro...');
    // Hardcoded sample data for macro
    articles = [
      {
        langCode: 'vi', langName: 'VIETNAMESE', langEmoji: '🇻🇳',
        title: 'Cập nhật kinh tế vĩ mô tuần 22/06/2026: Giá dầu hồi phục, lạm phát ổn định',
        lead: 'Tuần qua, thị trường kinh tế vĩ mô ghi nhận nhiều diễn biến tích cực với giá dầu thế giới phục hồi nhẹ sau chuỗi giảm sâu. Lạm phát tại các nền kinh tế lớn tiếp tục ổn định, tạo động lực cho các quyết định chính sách tiền tệ trong thời gian tới.',
        content: '<h2>Giá dầu thế giới</h2><p>Giá dầu Brent tăng 2.3% lên mức 78.5 USD/thùng trong tuần qua, phản ánh kỳ vọng về nhu cầu năng lượng phục hồi mùa hè. Tổ chức các nước xuất khẩu dầu mỏ (OPEC+) duy trì chính sách sản xuất hiện tại, hỗ trợ giá dầu ở mức cân bằng.</p><h2>Lạm phát và Chính sách tiền tệ</h2><p>Chỉ số giá tiêu dùng (CPI) của Mỹ tăng 0.2% trong tháng 5, thấp hơn dự kiến 0.3%, cho thấy lạm phát đang được kiểm soát hiệu quả. Cục Dự trữ Liên bang Mỹ (Fed) có thể duy trì lãi suất cao trong thời gian dài hơn để đảm bảo lạm phát quay về mục tiêu 2%.</p><h2>Kinh tế Châu Á</h2><p>Kinh tế Trung Quốc tiếp tục phục hồi với PMI sản xuất đạt 51.2 điểm, vượt mức 50 điểm ngưỡng tăng trưởng. Ngân hàng Nhân dân Trung Quốc (PBOC) duy trì chính sách tiền tệ nới lỏng để hỗ trợ tăng trưởng kinh tế.</p>'
      },
      {
        langCode: 'en', langName: 'ENGLISH', langEmoji: '🇺🇸',
        title: 'Macro Economic Update Week 22/06/2026: Oil Recovery, Stable Inflation',
        lead: 'The past week saw positive macroeconomic developments with global oil prices recovering slightly after a deep decline. Inflation in major economies continues to stabilize, setting the stage for monetary policy decisions ahead.',
        content: '<h2>Global Oil Prices</h2><p>Brent crude rose 2.3% to $78.5 per barrel this week, reflecting expectations for energy demand recovery this summer. OPEC+ maintained current production policies, supporting oil prices at balanced levels.</p><h2>Inflation and Monetary Policy</h2><p>The US Consumer Price Index (CPI) increased 0.2% in May, below the expected 0.3%, indicating effective inflation control. The Federal Reserve may maintain higher interest rates longer to ensure inflation returns to the 2% target.</p><h2>Asian Economy</h2><p>China\'s economy continues to recover with manufacturing PMI reaching 51.2 points, above the 50-point growth threshold. The People\'s Bank of China (PBOC) maintains accommodative monetary policy to support economic growth.</p>'
      },
      {
        langCode: 'ko', langName: 'KOREAN', langEmoji: '🇰🇷',
        title: '2026년 6월 22일 주 거시경제 업데이트: 유가 회복, 물가 안정',
        lead: '지난 주에는 유가가 급락 후 약간 회복되는 등 긍정적인 거시경제 지표가 관찰되었습니다. 주요 경제의 인플레이션은 계속 안정되어 향후 통화 정책 결정의 기반을 마련했습니다.',
        content: '<h2>국제 유가</h2><p>브렌트 유가는 주간 2.3% 상승하여 배럴당 78.5달러를 기록했으며, 이는 여름철 에너지 수요 회복에 대한 기대를 반영합니다. OPEC+는 현재 생산 정책을 유지하여 유가를 균형 수준으로 지원하고 있습니다.</p><h2>인플레이션 및 통화 정책</h2><p>미국 소비자물가지수(CPI)는 5월에 0.2% 상승하여 예상치 0.3%를 하회했으며, 이는 효과적인 인플레이션 통제를 나타냅니다. 연방준비제도이사회(Fed)는 인플레이션이 2% 목표로 복귀하는 것을 보장하기 위해 더 오랫동안 높은 금리를 유지할 수 있습니다.</p><h2>아시아 경제</h2><p>중국 경제는 제조업 PMI가 51.2포인트에 도달하여 성장 임계값인 50포인트를 초과하며 회복을 지속하고 있습니다. 중국 인민은행(PBOC)은 경제 성장을 지원하기 위해 완화적인 통화 정책을 유지하고 있습니다.</p>'
      },
      {
        langCode: 'zh', langName: 'CHINESE', langEmoji: '🇹🇼',
        title: '2026年6月22日宏觀經濟更新：油價回升，通脹穩定',
        lead: '過去一周，宏觀經濟出現積極發展，全球油價在深度下跌後略有回升。主要經濟體的通脹繼續穩定，為未來貨幣政策決定奠定基礎。',
        content: '<h2>全球油價</h2><p>布倫特原油本周上漲2.3%至每桶78.5美元，反映了對夏季能源需求恢復的預期。OPEC+維持當前生產政策，支持油價處於平衡水平。</p><h2>通脹與貨幣政策</h2><p>美國消費者物價指數(CPI)5月上漲0.2%，低於預期的0.3%，表明通脹得到有效控制。美聯儲可能維持較高利率更長時間，以確保通脹回到2%目標。</p><h2>亞洲經濟</h2><p>中國經濟繼續復甦，製造業PMI達到51.2點，高於50點增長閾值。中國人民銀行(PBOC)維持寬鬆貨幣政策以支持經濟增長。</p>'
      },
      {
        langCode: 'th', langName: 'THAI', langEmoji: '🇹🇭',
        title: 'อัปเดตเศรษฐกิจมหภาคสัปดาห์ 22/06/2569: ราคาน้ำมันฟื้นตัว เงินเฟ้อเสถียร',
        lead: 'สัปดาห์ที่แล้วมีการพัฒนาเศรษฐกิจมหภาคในเชิงบวก โดยราคาน้ำมันโลกฟื้นตัวเล็กน้อยหลังจากการลดลงอย่างมาก เงินเฟ้อในเศรษฐกิจหลักยังคงเสถียร',
        content: '<h2>ราคาน้ำมันโลก</h2><p>น้ำมันดิบเบรนต์เพิ่มขึ้น 2.3% เป็น 78.5 ดอลลาร์ต่อบาร์เรลในสัปดาห์นี้ สะท้อนความคาดหวังว่าความต้องการพลังงานจะฟื้นตัวในช่วงฤดูร้อน OPEC+ รักษานโยบายการผลิตปัจจุบัน</p><h2>เงินเฟ้อและนโยบายการเงิน</h2><p>ดัชนีราคาผู้บริโภคของสหรัฐ (CPI) เพิ่มขึ้น 0.2% ในเดือนพฤษภาคม ต่ำกว่าที่คาดไว้ 0.3% แสดงให้เห็นว่าเงินเฟ้อได้รับการควบคุมอย่างมีประสิทธิภาพ</p><h2>เศรษฐกิจเอเชีย</h2><p>เศรษฐกิจจีนฟื้นตัวต่อเนื่องโดย PMI ภาคการผลิตถึง 51.2 จุด เหนือระดับ 50 จุด</p>'
      },
      {
        langCode: 'ar', langName: 'ARABIC', langEmoji: '🇸🇦',
        title: 'تحديث الاقتصاد الكلي الأسبوع 22/06/2026: تعافي أسعار النفط، استقرار التضخم',
        lead: 'شهد الأسبوع الماضي تطورات اقتصادية كلية إيجابية مع تعافي أسعار النفط العالمية قليلاً بعد انخفاض حاد. يستمر التضخم في الاقتصادات الكبرى في الاستقرار',
        content: '<h2>أسعار النفط العالمية</h2><p>ارتفع خام برنت 2.3% إلى 78.5 دولار للبرميل هذا الأسبوع، مما يعكس توقعات تعافي الطلب على الطاقة هذا الصيف. حافظت أوبك+ على سياسات الإنتاج الحالية</p><h2>التضخم والسياسة النقدية</h2><p>ارتفع مؤشر أسعار المستهلكين الأمريكي (CPI) بنسبة 0.2% في مايو، أقل من المتوقع 0.3%، مما يشير إلى السيطرة الفعالة على التضخم</p><h2>اقتصاد آسيا</h2><p>يستمر اقتصاد الصين في التعافي مع وصول مؤشر مديري المشتريات في التصنيع إلى 51.2 نقطة</p>'
      },
      {
        langCode: 'ja', langName: 'JAPANESE', langEmoji: '🇯🇵',
        title: '2026年6月22日マクロ経済更新：原油価格回復、インフレ安定',
        lead: '先週はマクロ経済の好展開が見られ、原油価格が急落後に小幅回復しました。主要国のインフレは引き続き安定しています',
        content: '<h2>世界の原油価格</h2><p>ブレント原油は今週2.3%上昇し、バレル当たり78.5ドルとなりました。これは夏季のエネルギー需要回復への期待を反映しています。OPEC+は現在の生産政策を維持しています</p><h2>インフレと金融政策</h2><p>米国の消費者物価指数（CPI）は5月に0.2%上昇し、予想の0.3%を下回りました。これはインフレが効果的に管理されていることを示しています</p><h2>アジア経済</h2><p>中国経済は引き続き回復しており、製造業PMIは51.2ポイントに達しました</p>'
      }
    ];
  } else {
    console.log('📡 Fetching latest market_summary_macro…');
    allRows = await fetchSummaries();
  }

  // Handle sample data format
  if (isSample) {
    const todayStr = new Date().toISOString().slice(0, 10);
    allRows = [ { summary_date: todayStr, articles: articles } ];
  }

  console.log(`✅ Got ${allRows.length} days of summaries`);

  const headerHtml = readFile('header.html');
  const footerHtml = readFile('footer.html');
  const clientCss = readFile('scripts/seo-client.css');
  const clientJs = readFile('scripts/seo-client-macro.js');

  let dataByLang = {};
  let langsSet = new Set();

  for (const row of allRows) {
    const rDate = row.summary_date;
    const rArticles = typeof row.articles === 'string' ? JSON.parse(row.articles) : row.articles;
    for (const a of rArticles) {
      if (isSample) {
        a.langName = I18N_LANG_NAMES[a.langCode];
        a.langEmoji = ''; 
      }
      // Map zh-TW to zh for directory consistency
      const langCode = a.langCode === 'zh-TW' ? 'zh' : a.langCode;
      langsSet.add(langCode);
      if (!dataByLang[langCode]) dataByLang[langCode] = [];
      dataByLang[langCode].push({ date: rDate, article: a });
    }
  }

  const langs = Array.from(langsSet);

  for (const lang of langs) {
    const articlesList = dataByLang[lang];
    const outDir  = path.join(ROOT, 'diem-tin-vi-mo', lang);
    const outFile = path.join(outDir, 'index.html');
    fs.mkdirSync(outDir, { recursive: true });

    const html = generatePage({ articlesList, lang, headerHtml, footerHtml, langs, clientCss, clientJs });
    fs.writeFileSync(outFile, html, 'utf8');
    console.log(`  📝 Written: diem-tin-vi-mo/${lang}/index.html`);
  }

  // Write root redirect page
  const rootRedirect = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/diem-tin-vi-mo/vi/"><title>Redirecting…</title></head><body><p>Redirecting to <a href="/diem-tin-vi-mo/vi/">Vietnamese</a>…</p></body></html>`;
  const rootDir = path.join(ROOT, 'diem-tin-vi-mo');
  fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'index.html'), rootRedirect, 'utf8');
  
  console.log('\n✨ Done! All macro SEO pages generated.');
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
