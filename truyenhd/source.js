function getBookList(page, query) {
    if (page > 1) {
        // TruyenHD uses complex POST for pagination, keep simple for MVP
        return Response.success([]);
    }

    // No search logic in VBook TruyenHD, fallback to hot list
    var url = BASE_URL + "/danh-sach/truyen-hot";

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select(".theloai-thumlist tr");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst("h2");
        var coverEl = el.selectFirst(".thumbnail img") || el.selectFirst("img");
        var linkEl = el.selectFirst("a");
        var authorEl = el.selectFirst(".content p"); // Actually description, but author is often missing or mixed

        if (titleEl && linkEl) {
            books.push({
                id: linkEl.href.replace(BASE_URL, ""),
                title: titleEl.text,
                author: authorEl ? authorEl.text : "",
                coverUrl: coverEl ? (coverEl.attr("data-src") || coverEl.attr("src") || "") : "",
                url: linkEl.href
            });
        }
    }
    return Response.success(books);
}

function getBookDetails(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    var titleEl = doc.selectFirst("h1");
    var coverEl = doc.selectFirst(".book3d img");
    var authorEl = doc.selectFirst("a[href*=tac-gia]");
    var descEl = doc.selectFirst(".gioi_thieu");

    var chapters = [];
    var chapterEls = doc.select(".listchap li a");
    if (chapterEls.length === 0) {
        // Fallback: TruyenHD has some paginated format 
        chapterEls = doc.select("a[href*='/chuong-']");
    }

    for (var i = 0; i < chapterEls.length; i++) {
        var chUrl = chapterEls[i].attr("href") || chapterEls[i].href;
        if (chUrl) {
            chapters.push({
                title: chapterEls[i].text,
                url: chUrl
            });
        }
    }

    var coverUrl = "";
    if (coverEl) {
        coverUrl = coverEl.attr("data-src") || coverEl.attr("src") || "";
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverUrl,
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins, .title-chap");

    var contentEl = doc.selectFirst(".reading");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}
