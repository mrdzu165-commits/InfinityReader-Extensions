// Shared library injected into all InfinityReader extensions

/**
 * Removes common Vietnamese ad phrases and self-promotion text from chapter content.
 */
function cleanVietnameseAds(text) {
    if (!text) return "";
    var cleaned = text;
    var adPatterns = [
        /(Bạn đang đọc truyện được copy tại|Nguồn truyện|Truyện được lấy tại)[^<>\n]+/ig,
        /truyenfull\.com/ig,
        /truyenfull\.vn/ig,
        /sstruyen\.com/ig,
        /dtruyen\.com/ig,
        /metruyenchu\.com/ig,
        /truyenchu\.vn/ig,
        /wattpad\.com/ig,
        /sangtacviet\.com/ig
    ];

    for (var i = 0; i < adPatterns.length; i++) {
        cleaned = cleaned.replace(adPatterns[i], "");
    }
    return cleaned;
}

/**
 * Normalizes text formatting: unifies newlines, removes excessive whitespace.
 */
function normalizeText(text) {
    if (!text) return "";
    var cleaned = text;
    // Replace multiple newlines with double newline
    cleaned = cleaned.replace(/\n\s*\n/g, '\n\n');
    // Replace multiple spaces with single space
    cleaned = cleaned.replace(/ {2,}/g, ' ');
    // Trim edges
    return cleaned.trim();
}
