// util.js

/**
 * Translates text from a source language to a target language using the MyMemory API.
 * @param {string} text - The text to translate.
 * @param {string} targetLang - The target language code (e.g., 'en', 'kr', 'cn').
 * @param {string} sourceLang - The source language code (default 'vi').
 * @returns {Promise<string>} - The translated text, or the original text if translation fails.
 */
window.translateText = async function(text, targetLang, sourceLang = 'vi') {
    if (!text || !targetLang || targetLang === sourceLang) return text;
    
    // Map internal language codes to standard ones if necessary
    // MyMemory uses standard ISO 639-1 language codes.
    // 'cn' is usually 'zh' (Chinese), 'kr' is 'ko' (Korean).
    let apiLang = targetLang;
    if (apiLang === 'cn') apiLang = 'zh-CN';
    if (apiLang === 'kr') apiLang = 'ko';
    
    if (apiLang === sourceLang) return text;

    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${apiLang}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Translation API error:', response.statusText);
            return text;
        }
        const data = await response.json();
        
        if (data && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        return text;
    } catch (error) {
        console.error('Translation fetch error:', error);
        return text;
    }
};
