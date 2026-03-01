function toCapitalize(sentence) {
    if (!sentence) return "";
    var words = sentence.split(" ");
    return words.map(function (word) {
        if (!word) return "";
        return word[0].toUpperCase() + word.substring(1);
    }).join(" ");
}

function getBookList(page, query) {
    var url = "";
    if (page == 0) page = 1;

    if (query && query.length > 0) {
        url = BASE_URL + "/?find=&findinname=" + encodeURIComponent(query) + "&minc=0&tag=&p=" + page;
    } else {
        url = BASE_URL + "/?find=&minc=0&sort=star&tag=&p=" + page;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select("#searchviewdiv a.booksearch");
    if (!items || items.length === 0) {
        items = doc.select(".searchbookview a.booksearch");
    }

    var books = [];
    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst(".searchbooktitle");
        var coverEl = el.selectFirst("img");

        var tags = el.select("span.searchtag");
        var authorText = "";
        if (tags && tags.length > 0) {
            authorText = tags[tags.length - 1].text;
        }

        var href = items[i].href || items[i].attr("href");
        if (titleEl && href) {
            books.push({
                id: href.replace(BASE_URL, ""),
                title: toCapitalize(titleEl.text),
                author: authorText,
                coverUrl: coverEl ? coverEl.attr("src") : "",
                url: href.startsWith("http") ? href : BASE_URL + href
            });
        }
    }
    return Response.success(books);
}

function getBookDetails(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    if (url.slice(-1) !== "/") url = url + "/";

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var authorMatch = htmlStr.match(/Tác giả:.*?\s+(.*?)\s*</);
    var author = authorMatch ? authorMatch[1] : "Unknown";

    var titleEl = doc.selectFirst("#book_name2");
    var coverEl = doc.selectFirst(".container img");
    var descEl = doc.selectFirst(".blk .blk-body"); // first one usually has the desc

    var chapters = [];
    var chapterEls = doc.select("a.listchapitem"); // Attempt to fetch server-rendered TOC if available
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: url + "----/----" + i
        });
    }

    return Response.success({
        title: titleEl ? toCapitalize(titleEl.text) : "",
        author: author,
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverEl ? coverEl.attr("src") : "",
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    // SangTacViet requires complex browser automation for content. 
    // Fallback: we fetch the generic URL if not a split syntax.
    var url = chapterUrl;
    if (url.indexOf("----/----") !== -1) {
        var parts = url.split("----/----");
        url = parts[0];
    }

    if (url.startsWith("http") === false) url = BASE_URL + url;

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    // Attempt to extract from `#content-container > .contentbox`
    var contentEl = doc.selectFirst("#content-container > .contentbox");
    if (!contentEl) return Response.error("Content requires JS rendering (Not supported by lightweight Engine)");

    var content = contentEl.html;
    if (content.indexOf('Đang tải nội dung chương') !== -1) {
        return Response.error("Content requires full browser engine to load chunks.");
    }

    var charMap = {
        'Ҋ': 'U', 'ҋ': 'p', 'Ҍ': 'N', 'ҍ': 'e', 'Ҏ': 'd', 'ҏ': 'u',
        'Ґ': 'P', 'ґ': 'z', 'Ғ': 'j', 'ғ': 'C', 'Ҕ': 'H', 'ҕ': 'g',
        'Җ': 'D', 'җ': 'y', 'Ҙ': 'n', 'ҙ': 'm', 'Қ': 'M', 'қ': 'c',
        'Ҝ': 'O', 'ҝ': 'W', 'Ҟ': 'T', 'ҟ': 'w', 'Ҡ': 'B', 'ҡ': 'A',
        'Ң': 'G', 'ң': 'Z', 'Ҥ': 'Q', 'ҥ': 'v', 'Ҧ': 'q', 'ҧ': 'V',
        'Ҩ': 'o', 'ҩ': 'f', 'Ҫ': 'F', 'ҫ': 'Y', 'Ҭ': 'J', 'ҭ': 'l',
        'Ү': 'k', 'ү': 'X', 'Ұ': 's', 'ұ': 'L', 'Ҳ': 'x', 'ҳ': 'h',
        'Ҵ': 'E', 'ҵ': 'K', 'Ҷ': 'a', 'ҷ': 'R', 'Ҹ': 'S', 'ҹ': 'b'
    };

    var newContent = '';
    for (var i = 0; i < content.length; i++) {
        var char = content.charAt(i);
        newContent += charMap[char] ? charMap[char] : char;
    }

    var cleaned = newContent.replace(/<p>/g, "")
        .replace(/&lt;p&gt;/g, "")
        .replace(/<i.*?>(.*?)<\/i>/g, '$1')
        .replace(/<span.*?>(.*?)<\/span>(<br>)?/g, "")
        .replace(/<a href=.*?<\/a>/g, "")
        .replace(/ +/g, " ")
        .replace(/<br>/g, "\n")
        .replace(/\n+/g, "<br>")
        .replace(/\u201c/g, "")
        .replace(/\u201d/g, "")
        .replace(/&(nbsp|amp|quot|lt|gt|bp|emsp);/g, "");

    // Clean-At-Source standard
    var finalDoc = Html.parse(cleaned);
    finalDoc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");
    cleaned = Html.clean(finalDoc.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}
