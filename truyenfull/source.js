function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        url = BASE_URL + "/tim-kiem/?tukhoa=" + encodeURIComponent(query) + "&page=" + page;
    } else {
        url = BASE_URL + "/danh-sach/truyen-hot/trang-" + page + "/";
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select(".list-truyen div[itemscope]");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst(".truyen-title > a");
        var authorEl = el.selectFirst(".author");
        var coverEl = el.selectFirst("[data-image]");

        if (titleEl) {
            books.push({
                id: titleEl.href.replace(BASE_URL, ""),
                title: titleEl.text,
                author: authorEl ? authorEl.text : "",
                coverUrl: coverEl ? coverEl.attr("data-image") : "",
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

    var titleEl = doc.selectFirst("h3.title");
    var authorEl = doc.selectFirst("a[itemprop=author]");
    var descEl = doc.selectFirst("div.desc-text");
    var coverEl = doc.selectFirst("div.book img");

    // Basic chapter list extraction (first page only for simple version)
    var chapterEls = doc.select("ul.list-chapter li a");
    var chapters = [];
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: chapterEls[i].href
        });
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverEl ? coverEl.src : (coverEl ? coverEl.attr("src") : ""),
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    // Clean-At-Source: Remove garbage elements
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");

    var contentEl = doc.selectFirst("div.chapter-c");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    // Check if base.js is injected
    if (typeof cleanVietnameseAds === "function") {
        cleaned = cleanVietnameseAds(cleaned);
    }
    if (typeof normalizeText === "function") {
        cleaned = normalizeText(cleaned);
    }

    var titleEl = doc.selectFirst("a.chapter-title");

    return Response.success({
        title: titleEl ? titleEl.text : "",
        content: cleaned
    });
}
