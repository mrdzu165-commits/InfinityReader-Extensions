function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        url = BASE_URL + "/ket-qua-tim-kiem?term=" + encodeURIComponent(query) + "&page=" + page;
    } else {
        url = BASE_URL + "/tong-hop?rank=vw&page=" + page;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select("#rank-view-list ul li, .book-img-text ul li");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst("h4 > a");
        var authorEl = el.selectFirst(".author");
        var coverEl = el.selectFirst("img");

        if (titleEl) {
            books.push({
                id: titleEl.href.replace(BASE_URL, ""),
                title: titleEl.text,
                author: authorEl ? authorEl.text : "",
                coverUrl: coverEl ? (coverEl.src || coverEl.attr("src") || "") : "",
                url: titleEl.href
            });
        }
    }
    return Response.success(books);
}

function getBookDetails(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst("h1");
    var authorEl = doc.selectFirst("div.book-information div.book-info a");
    var descEl = doc.selectFirst("div.book-info-detail div.book-intro");
    var coverEl = doc.selectFirst("div.book-img img");

    var storyIdEl = doc.selectFirst("input[name=story_id]");
    var chapters = [];

    if (storyIdEl) {
        var storyId = storyIdEl.attr("value");
        var chapResp = fetch(BASE_URL + "/story/chapters?story_id=" + storyId);
        if (chapResp.ok) {
            var chapDoc = Html.parse(chapResp.text());
            var chapterEls = chapDoc.select("li a");
            for (var i = 0; i < chapterEls.length; i++) {
                chapters.push({
                    title: chapterEls[i].text,
                    url: chapterEls[i].href
                });
            }
        }
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverEl ? (coverEl.src || coverEl.attr("src") || "") : "",
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    // TTV requires replacing \n with <br> before parsing to keep paragraph breaks
    htmlStr = htmlStr.replace(/\r?\n/g, "<br />");
    var doc = Html.parse(htmlStr);

    // Clean-At-Source
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");

    var contentEl = doc.selectFirst("div.box-chap");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "", // Title is handled by app via chapter model
        content: cleaned
    });
}
