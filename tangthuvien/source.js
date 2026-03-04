var BASE_URL = "https://truyen.tangthuvien.vn";

function getBookList(page, query) {
    var url = "";
    if (query && query.indexOf("@filter:") !== -1) {
        var category = query.split("@filter:")[1];
        if (category.indexOf("/") !== 0) category = "/" + category;
        url = BASE_URL + category;
        if (page > 1) {
            url += (url.indexOf("?") === -1 ? "?" : "&") + "page=" + page;
        }
    } else if (query && query.length > 0) {
        url = BASE_URL + "/ket-qua-tim-kiem?term=" + encodeURIComponent(query) + "&page=" + page;
    } else {
        url = BASE_URL + "/tong-hop?rank=vw&page=" + page;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var doc = Html.parse(resp.text());
    var items = doc.select(".book-img-text li");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = items[i];
        var titleEl = el.selectFirst("h4 a");
        if (!titleEl) continue;

        var title = titleEl.text.trim();
        var bookUrl = titleEl.attr("href");
        if (bookUrl && bookUrl.indexOf("http") !== 0) {
            if (bookUrl.indexOf("/") !== 0) bookUrl = "/" + bookUrl;
            bookUrl = BASE_URL + bookUrl;
        }

        var authorEl = el.selectFirst(".author a.name");
        var author = authorEl ? authorEl.text.trim() : "";

        var authorParentEl = el.selectFirst(".author");
        var latestChapter = "";
        if (authorParentEl) {
            var fullText = authorParentEl.text;
            var match = fullText.match(/(\d+)\s+chương/i) || fullText.match(/(\d+)\s*chương/i);
            if (match) {
                latestChapter = "Chương " + match[1];
            }
        }

        var coverEl = el.selectFirst(".book-img-box img");
        var cover = "";
        if (coverEl) {
            cover = coverEl.attr("data-src") || coverEl.attr("src");
            if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
            if (cover && cover.indexOf("/") === 0 && cover.indexOf("//") !== 0) cover = BASE_URL + cover;
        }

        var id = bookUrl;
        if (id && id.indexOf(BASE_URL) === 0) id = id.substring(BASE_URL.length);

        books.push({
            id: id,
            title: title,
            author: author,
            coverUrl: cover,
            url: bookUrl,
            latestChapter: latestChapter
        });
    }
    return Response.success(books);
}

function getBookDetails(id) {
    var url = id;
    if (url.indexOf("http") !== 0) {
        if (url.indexOf("/") !== 0) url = "/" + url;
        url = BASE_URL + url;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst(".book-info h1");
    var title = titleEl ? titleEl.text.trim() : "";

    var authorEl = doc.selectFirst(".book-info p.tag a.blue");
    var author = authorEl ? authorEl.text.trim() : "";

    var descEl = doc.selectFirst(".book-intro");
    var description = descEl ? Html.clean(descEl.html) : "";

    var coverEl = doc.selectFirst("#bookImg img");
    var cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("src");
        if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
        if (cover && cover.indexOf("/") === 0 && cover.indexOf("//") !== 0) cover = BASE_URL + cover;
    }

    var storyId = "";
    var storyIdInput = doc.selectFirst("input[name=story_id]");
    if (storyIdInput) {
        storyId = storyIdInput.attr("value");
    } else {
        // Fallback search in script
        var match = htmlStr.match(/story_id\s*[:=]\s*["']?(\d+)["']?/);
        if (match) storyId = match[1];
    }

    var chapters = [];
    if (storyId) {
        var chapResp = fetch(BASE_URL + "/story/chapters?story_id=" + storyId);
        if (chapResp.ok) {
            var chapDoc = Html.parse(chapResp.text());
            var chapterEls = chapDoc.select("li a");
            for (var i = 0; i < chapterEls.length; i++) {
                var cUrl = chapterEls[i].attr("href");
                if (cUrl && cUrl.indexOf("http") !== 0) {
                    if (cUrl.indexOf("/") !== 0) cUrl = "/" + cUrl;
                    cUrl = BASE_URL + cUrl;
                }

                chapters.push({
                    title: chapterEls[i].text.trim(),
                    url: cUrl
                });
            }
        }
    }

    return Response.success({
        title: title,
        author: author,
        description: description,
        coverUrl: cover,
        chapters: chapters
    });
}

function getChapterContent(url) {
    if (url.indexOf("http") !== 0) {
        if (url.indexOf("/") !== 0) url = "/" + url;
        url = BASE_URL + url;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var htmlStr = resp.text();
    // Keep paragraph breaks
    htmlStr = htmlStr.replace(/\r?\n/g, "<br />");
    var doc = Html.parse(htmlStr);

    var contentEl = doc.selectFirst(".box-chap") || doc.selectFirst(".chapter-c-content") || doc.selectFirst(".chapter-c");
    if (!contentEl) return Response.error("Content not found");

    // Clean internal elements before cleaning HTML string
    var itemsToRemove = contentEl.select("h2, .chap-name, script, style, .ads-responsive, .premium-note");
    if (itemsToRemove) {
        for (var i = 0; i < itemsToRemove.length; i++) {
            itemsToRemove[i].remove();
        }
    }

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        content: cleaned
    });
}
