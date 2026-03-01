var BASE_URL = "https://sstruyen.com.vn";

function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        url = BASE_URL + "/tim-kiem?keyword=" + encodeURIComponent(query) + "&page=" + page;
    } else {
        url = BASE_URL + "/danh-sach/truyen-hot" + (page > 1 ? "?page=" + page : "");
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select(".item");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst("h3");
        var aEl = el.selectFirst("a");
        var coverEl = el.selectFirst("img");

        if (titleEl && aEl) {
            books.push({
                id: aEl.href.replace(BASE_URL, "").replace("sstruyen.com.vn", ""),
                title: titleEl.text,
                author: "",
                coverUrl: coverEl ? (coverEl.src || coverEl.attr("src") || "") : "",
                url: aEl.href.replace("sstruyen.com", "sstruyen.com.vn")
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

    var titleEl = doc.selectFirst("h1[itemprop=name]") || doc.selectFirst("h1.title");
    var coverEl = doc.selectFirst(".wrap-detail.pc img") || doc.selectFirst(".content img");
    var descEl = doc.selectFirst("#gioithieu .scrolltext") || doc.selectFirst(".wrap-detail.pc .content1");

    // Clean up description if info is embedded
    var descParsed = Html.parse(descEl ? descEl.htmlStr : "");
    descParsed.remove("div.info");

    var chapters = [];
    var chapterEls = doc.select("#chapter-list ul li a");
    if (chapterEls.length === 0) chapterEls = doc.select("div.list-chap ul li a");
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: chapterEls[i].href.replace("sstruyen.com", "sstruyen.com.vn")
        });
    }

    var author = "";
    var infoEls = doc.select(".info ul li");
    for (var i = 0; i < infoEls.length; i++) {
        var text = infoEls[i].text;
        if (text.indexOf("Tác giả") > -1) {
            var aEl = Html.parse(infoEls[i].html).selectFirst("a");
            if (aEl) author = aEl.text;
        }
    }

    var coverUrl = "";
    if (coverEl) {
        coverUrl = coverEl.attr("data-pagespeed-high-res-src") || coverEl.src || coverEl.attr("src") || "";
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: author,
        description: Html.clean(descParsed.htmlStr),
        coverUrl: coverUrl,
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    // Clean-At-Source
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");

    var contentEl = doc.selectFirst("div.content.container1") || doc.selectFirst("div.content");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}

