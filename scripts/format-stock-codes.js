const SKIP_TAGS = new Set(['a', 'strong', 'script', 'style']);

// Vietnamese tickers: 3 uppercase letters, or 3-4 chars with at least 2 letters.
const STOCK_CODE_RE = /\b([A-Z][A-Z0-9]{2}|[A-Z][A-Z0-9]{3})\b/g;

function isLikelyStockCode(code, text, index) {
  if (code === 'MBS') {
    const after = text.slice(index + code.length, index + code.length + 24);
    if (/^\s+(Research|analysts|đánh giá|리서치|分析|تقييم|ประเมิน|評估|評価)/i.test(after)) {
      return false;
    }
  }
  return true;
}

function highlightStockCodesInText(text) {
  return text.replace(STOCK_CODE_RE, (match, code, offset) => {
    if (!isLikelyStockCode(code, text, offset)) return match;
    return `<strong>${code}</strong>`;
  });
}

export function highlightStockCodes(html) {
  if (!html) return html;

  const parts = html.split(/(<[^>]+>)/g);
  let skipDepth = 0;

  return parts.map(part => {
    if (part.startsWith('<')) {
      const tagMatch = part.match(/^<\/?([a-z0-9]+)/i);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (SKIP_TAGS.has(tag)) {
          if (part.startsWith('</')) skipDepth = Math.max(0, skipDepth - 1);
          else if (!part.endsWith('/>')) skipDepth++;
        }
      }
      return part;
    }

    if (skipDepth > 0) return part;
    return highlightStockCodesInText(part);
  }).join('');
}
