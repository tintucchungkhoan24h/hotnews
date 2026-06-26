/**
 * Shared inline script for copy-link buttons.
 * Works on non-secure origins (e.g. http://192.168.x.x) where navigator.clipboard is unavailable.
 */
export const COPY_LINK_SCRIPT = `
    // ── Copy Article Link Logic ─────────────────────────────────────────────────────
    (function() {
      const toast = document.createElement('div');
      toast.className = 'copy-toast';
      toast.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Đã sao chép liên kết!</span>';
      document.body.appendChild(toast);
      let toastTimer = null;

      function showCopySuccess(btn) {
        btn.classList.add('copied');
        const label = btn.querySelector('.btn-label');
        if (label) label.textContent = 'Đã sao chép!';
        setTimeout(() => {
          btn.classList.remove('copied');
          if (label) label.textContent = 'Sao chép link';
        }, 2000);
        clearTimeout(toastTimer);
        toast.offsetHeight;
        toast.classList.add('visible');
        toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
      }

      function fallbackCopyText(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, text.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (!ok) throw new Error('execCommand copy failed');
      }

      function copyText(text, btn) {
        const onSuccess = () => showCopySuccess(btn);
        const onFallback = () => {
          try {
            fallbackCopyText(text);
            onSuccess();
          } catch (e) {
            console.warn('Copy failed', e);
          }
        };
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(text).then(onSuccess).catch(onFallback);
          return;
        }
        onFallback();
      }

      window.copyArticleLink = function(btn) {
        const rawSpokeUrl = btn.getAttribute('data-spoke-url') || window.location.href;
        const spokeUrl = (() => {
          try {
            const u = new URL(rawSpokeUrl);
            return window.location.origin + u.pathname;
          } catch (e) {
            return rawSpokeUrl;
          }
        })();
        copyText(spokeUrl, btn);
      };
    })();
`;

/** Regex matching the old copy-link IIFE block in generated HTML files. */
export const COPY_LINK_BLOCK_RE = /    \/\/ (?:── Copy Article Link Logic ─+|Copy Article Link Logic)[^\n]*\n    \(function\(\) \{[\s\S]*?      \};\n    \}\)\(\);\n/;

/** Leftover tail from a partial regex replace (safe to delete). */
export const COPY_LINK_ORPHAN_RE = /\n        navigator\.clipboard\.writeText\(spokeUrl\)\.then\(\(\) => \{[\s\S]*?    \}\)\(\);\n(?=  <\/script>)/g;
