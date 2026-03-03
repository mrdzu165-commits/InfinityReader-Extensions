function getBookList(page, query) {
    var url = "";
    if (query && query.startsWith("@filter:")) {
        // Handle category filters like @filter:danh-sach/truyen-moi/
        var filterPath = query.replace("@filter:", "");
        if (filterPath === "") {
            url = BASE_URL + "/danh-sach/truyen-hot/trang-" + page + "/";
        } else {
            url = BASE_URL + "/" + filterPath + "trang-" + page + "/";
        }
    } else if (query && query.length > 0) {
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

        // Extract latest chapter (e.g., "Chương 1234") from .text-info
        var chapterEl = el.selectFirst(".text-info a");
        if (!chapterEl) chapterEl = el.selectFirst(".text-info");
        var latestChapter = chapterEl ? chapterEl.text : "";

        if (titleEl) {
            books.push({
                id: titleEl.href.replace(BASE_URL, ""),
                title: titleEl.text,
                author: authorEl ? authorEl.text : "",
                coverUrl: coverEl ? coverEl.attr("data-image") : "",
                url: titleEl.href,
                latestChapter: latestChapter
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

    // Basic chapter list extraction (page 1)
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

function getChapters(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var chapterEls = doc.select("ul.list-chapter li a");
    var chapters = [];
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: chapterEls[i].href
        });
    }

    // Pagination fetching
    var maxPage = 1;
    var paginationAs = doc.select("ul.pagination li a");
    for (var i = 0; i < paginationAs.length; i++) {
        var href = paginationAs[i].href || "";
        var match = href.match(/trang-(\d+)/);
        if (match) {
            var pageNum = parseInt(match[1]);
            if (pageNum > maxPage) maxPage = pageNum;
        }
    }

    // Removed the 50-page maxPage safety limit since we now cache chapters in SQlite.
    // Fetch all chapters no matter how many pages!
    // if (maxPage > 50) maxPage = 50;

    for (var p = 2; p <= maxPage; p++) {
        var pUrl = url.replace(/\/$/, "") + "/trang-" + p + "/";
        var pResp = fetch(pUrl);
        if (pResp.ok) {
            var pDoc = Html.parse(pResp.text());
            var pChapEls = pDoc.select("ul.list-chapter li a");
            for (var c = 0; c < pChapEls.length; c++) {
                chapters.push({
                    title: pChapEls[c].text,
                    url: pChapEls[c].href
                });
            }
        }
    }

    return Response.success(chapters);
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
