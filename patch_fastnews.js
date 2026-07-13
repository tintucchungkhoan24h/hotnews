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
        // Only show the first part before any '-' separator (e.g. "Investing-HangHoa" → "Investing")
        const shortSource = source ? source.split('-')[0].trim() : '';

        const quoteRow = document.createElement('tr');
        quoteRow.className = 'fast-news-quote-row';
        if (stock) quoteRow.dataset.fastNewsRowFor = stock;
        quoteRow.innerHTML = `
            <td colspan="${colCount}" style="padding: 0; border-top: none; vertical-align: top;">
                <div class="fast-news-inline-box" id="${uniqueId}" style="position: sticky; left: 0;">
                    <div class="fast-news-header">
                        <span class="fast-news-source">${shortSource ? window._fnqEsc(shortSource) + (time ? ' · ' + window._fnqEsc(time) : '') : (time ? window._fnqEsc(time) : '')}</span>
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
