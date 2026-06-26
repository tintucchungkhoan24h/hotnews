/**
 * Shared language menu HTML + JS for digest hub/spoke pages.
 */

/** Full lang menu CSS (hub + spoke). Keeps flag SVG visible in #langToggle. */
export const LANG_MENU_CSS = `    /* Lang Menu CSS */
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
        flex-shrink: 0;
    }`;

/** Condensed one-line lang CSS used on older spoke pages (missing #langToggle svg). */
export const LANG_MENU_CSS_SPOKE_OLD = `    .lang-menu { position: absolute; top: calc(100% + 8px); right: 0; min-width: 220px; max-width: min(320px, calc(100vw - 24px)); max-height: min(70vh, 360px); overflow-x: hidden; overflow-y: auto; background: rgba(10, 18, 47, 0.98); border: 1px solid #334155; border-radius: 18px; box-shadow: 0 20px 60px rgba(0,0,0,0.55); backdrop-filter: blur(16px); padding: 8px 0; z-index: 10050; display: none; }
    .lang-menu.open { display: block; }
    .lang-option { width: 100%; display: flex; align-items: center; gap: 10px; background: transparent; border: none; color: #f8fafc; padding: 10px 14px; cursor: pointer; font-size: 12px; text-align: left; transition: background 0.15s ease; }
    .lang-option:hover { background: rgba(255,255,255,0.06); }
    #langToggle { display: flex; align-items: center; gap: 6px; background: rgba(17,34,64,0.95); border: 1px solid #4b5563; color: white; padding: 8px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 10px 40px rgba(0,0,0,0.3); backdrop-filter: blur(10px); transition: all 0.2s ease; white-space: nowrap; }
    #langToggle:hover { border-color: #ffd700; box-shadow: 0 10px 40px rgba(255, 215, 0, 0.2); }`;

export function buildLangMenuHtml(langs, hrefForLang) {
  return langs.map((l) => {
    const f = hrefForLang.flags?.[l] ?? '';
    const n = hrefForLang.names?.[l] ?? l.toUpperCase();
    const s = hrefForLang.shorts?.[l] ?? l.toUpperCase();
    const href = typeof hrefForLang === 'function' ? hrefForLang(l) : hrefForLang.href(l);
    return `<button type="button" class="lang-option" data-lang="${l}" data-href="${href}">
        <span style="display: inline-block; width: 22px; height: 15px; overflow: hidden; border-radius: 2px;">${f}</span>
        <span>${n} (${s})</span>
    </button>`;
  }).join('');
}

export function buildLangMenuHtmlFromMeta(langs, { flags, names, shorts, hrefForLang }) {
  return langs.map((l) => {
    const href = hrefForLang(l);
    return `<button type="button" class="lang-option" data-lang="${l}" data-href="${href}">
        <span style="display: inline-block; width: 22px; height: 15px; overflow: hidden; border-radius: 2px;">${flags[l] || ''}</span>
        <span>${names[l] || l.toUpperCase()} (${shorts[l] || l.toUpperCase()})</span>
    </button>`;
  }).join('');
}

export const LANG_MENU_SCRIPT = `
    (function() {
      const langToggle = document.getElementById('langToggle');
      const langMenu = document.getElementById('langMenu');
      if (!langToggle || !langMenu) return;

      langToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        langMenu.classList.toggle('open');
        langMenu.setAttribute('aria-hidden', langMenu.classList.contains('open') ? 'false' : 'true');
      });

      langMenu.addEventListener('click', (e) => {
        const btn = e.target.closest('.lang-option');
        if (!btn) return;
        const lang = btn.getAttribute('data-lang');
        let href = btn.getAttribute('data-href');
        if (!href && window.SPOKE_LANG_URLS && lang) href = window.SPOKE_LANG_URLS[lang];
        if (!href) {
          const section = (window.location.pathname.match(/^\\/diem-tin-[^/]+/) || [])[0] || '/diem-tin-chung-khoan';
          href = lang ? section + '/' + lang + '/' : null;
        }
        if (href) window.location.href = href;
      });

      document.addEventListener('click', (e) => {
        if (!langToggle.contains(e.target) && !langMenu.contains(e.target)) {
          langMenu.classList.remove('open');
          langMenu.setAttribute('aria-hidden', 'true');
        }
      });
    })();
`;

/** Old inline lang-toggle block in generated HTML. */
export const LANG_TOGGLE_BLOCK_RE = /    const langToggle = document\.getElementById\('langToggle'\);[\s\S]*?    \}\n(?=\n    \/\/|$)/;
