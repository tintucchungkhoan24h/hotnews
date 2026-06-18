// util.js

/**
 * Translates text using the unofficial Google Translate endpoint.
 * No API key required. Handles longer texts natively.
 *
 * @param {string} text       - The text to translate.
 * @param {string} targetLang - Target language code (e.g. 'en', 'kr', 'cn').
 * @param {string} sourceLang - Source language code (default 'vi').
 * @returns {Promise<string>} - The translated text, or the original if translation fails.
 */
window.translateText = async function(text, targetLang, sourceLang = 'vi') {
    if (!text || !targetLang || targetLang === sourceLang) return text;

    // Map internal language codes to standard ISO 639-1 codes
    let apiLang = targetLang;
    if (apiLang === 'cn') apiLang = 'zh-CN';
    if (apiLang === 'kr') apiLang = 'ko';

    if (apiLang === sourceLang) return text;

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${apiLang}&dt=t&q=${encodeURIComponent(text)}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.error('Translation API error:', response.status, response.statusText);
            return text;
        }

        const data = await response.json();

        // Google unofficial API returns: [ [ ["translated", "original", ...], ... ], ... ]
        // Concatenate all translated segments
        if (Array.isArray(data) && Array.isArray(data[0])) {
            const translated = data[0]
                .filter(seg => Array.isArray(seg) && seg[0])
                .map(seg => seg[0])
                .join('');
            return translated || text;
        }

        return text;
    } catch (error) {
        console.error('Translation fetch error:', error);
        return text;
    }
};
