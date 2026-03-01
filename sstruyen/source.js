var BASE_URL = "https://sstruyen.vn";

function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        url = BASE_URL + "/tim-truyen/" + encodeURIComponent(query) + "/trang-" + page;
    } else {
        url = BASE_URL + "/danh-sach/truyen-hot/trang-" + page + "/";
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select(".table-list tr"); // In search and home, this selector is used
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst(".info h3 a");
        if (!titleEl) titleEl = el.selectFirst("h3 a"); // Fallback for some pages

        var authorEl = el.selectFirst(".author");
        var coverEl = el.selectFirst("img");

        if (titleEl) {
            books.push({
                id: titleEl.href.replace(BASE_URL, "").replace("sstruyen.com", "sstruyen.vn"),
                title: titleEl.text,
                author: authorEl ? authorEl.text : "",
                coverUrl: coverEl ? (coverEl.src || coverEl.attr("src") || "") : "",
                url: titleEl.href.replace("sstruyen.com", "sstruyen.vn")
            });
        }
    }
    return Response.success(books);
}

function getBookDetails(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    url = url.replace("sstruyen.com", "sstruyen.vn");
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst("h1.title");
    var coverEl = doc.selectFirst(".wrap-detail.pc img");

    // SSTruyen puts author and desc together in .content1
    var content1Doc = Html.parse(doc.selectFirst(".wrap-detail.pc .content1").html);
    var authorEl = content1Doc.selectFirst("div.info a");

    // Remove the info block to get just the description
    content1Doc.remove("div.info");

    // Chapter list processing (SSTruyen usually lists all chapters or paginates loosely)
    var chapters = [];
    var chapterEls = doc.select("div.list-chap ul li a");
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: chapterEls[i].href.replace("sstruyen.com", "sstruyen.vn")
        });
    }

    var coverUrl = "";
    if (coverEl) {
        coverUrl = coverEl.attr("data-pagespeed-high-res-src") || coverEl.src || coverEl.attr("src") || "";
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: Html.clean(content1Doc.htmlStr),
        coverUrl: coverUrl,
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    url = url.replace("sstruyen.com", "sstruyen.vn");
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    // Clean-At-Source
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");

    var contentEl = doc.selectFirst("div.content.container1");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}
