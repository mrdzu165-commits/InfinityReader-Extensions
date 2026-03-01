var BASE_URL = "https://truyencom.com";

function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        url = BASE_URL + "/tim-kiem/?tukhoa=" + encodeURIComponent(query) + "&page=" + page;
    } else {
        url = BASE_URL + "/truyen-moi-cap-nhat/trang-" + page + "/"; 
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select(".list-truyen .row[itemscope]");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst(".col-title h3 a");
        if (!titleEl) continue;

        var id = titleEl.href;
        if (id.startsWith(BASE_URL)) {
            id = id.substring(BASE_URL.length);
        }

        books.push({
            id: id,
            title: titleEl.text,
            author: "",
            coverUrl: "",
            url: titleEl.href
        });
    }
    return Response.success(books);
}

function getBookDetails(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst("h1.title");
    var authorEl = doc.selectFirst("a[itemprop=author]");
    var descEl = doc.selectFirst("div.desc-text");
    var coverEl = doc.selectFirst("div.book img");

    var chapterEls = doc.select("ul.list-chapter li a");
    var chapters = [];
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: chapterEls[i].href
        });
    }

    var pageJump = doc.selectFirst("input[name=format]");
    var pagStr = pageJump ? pageJump.attr("value") : "";
    if (!pagStr) pagStr = url + "trang-%d/#chapter-list";

    var cover = coverEl ? coverEl.src : "";
    if (!cover && coverEl) cover = coverEl.attr("data-image");
    if (!cover && coverEl) cover = coverEl.attr("src");

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: cover || "",
        chapters: chapters,
        paginationUrl: pagStr,
        paginationFormat: 1
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], ins");

    var contentEl = doc.selectFirst("div.chapter-c");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

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
