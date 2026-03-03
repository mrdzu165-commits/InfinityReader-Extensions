var BASE_URL = "https://sstruyen.com.vn";

function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        if (query.startsWith("@filter:")) {
            var filterPath = query.substring(8);
            url = BASE_URL + "/" + filterPath + (page > 1 ? "?page=" + page : "");
        } else {
            url = BASE_URL + "/tim-kiem?keyword=" + encodeURIComponent(query) + "&page=" + page;
        }
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
            var author = "";
            var authorEl = el.selectFirst("p.line a");
            if (authorEl) author = authorEl.text;

            var chapterCount = "";
            var pLines = el.select("p.line");
            for (var j = 0; j < pLines.length; j++) {
                var pText = pLines[j].text;
                if (pText.indexOf("Số chương") > -1) {
                    chapterCount = pText.replace("Số chương:", "").trim();
                    break;
                }
            }

            var coverUrl = coverEl ? (coverEl.src || coverEl.attr("src") || "") : "";
            if (coverUrl && !coverUrl.startsWith("http")) {
                coverUrl = BASE_URL + (coverUrl.startsWith("/") ? "" : "/") + coverUrl;
            }

            books.push({
                id: aEl.href.replace(BASE_URL, "").replace("sstruyen.com.vn", ""),
                title: titleEl.text,
                author: author,
                coverUrl: coverUrl,
                url: aEl.href.replace("sstruyen.com", "sstruyen.com.vn"),
                latestChapter: chapterCount ? (chapterCount + " chương") : ""
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
    if (coverUrl && !coverUrl.startsWith("http")) {
        coverUrl = BASE_URL + (coverUrl.startsWith("/") ? "" : "/") + coverUrl;
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: author,
        description: Html.clean(descParsed.htmlStr),
        coverUrl: coverUrl,
        chapters: chapters
    });
}

function getChapters(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var chapters = [];
    var maxPage = 1;
    var bookId = "";

    var match = htmlStr.match(/var rid\s*=\s*'(\d+)'/);
    if (match) bookId = match[1];

    if (bookId) {
        var pagingEls = doc.select(".paging a");
        if (pagingEls.length > 0) {
            var lastPageEl = pagingEls[pagingEls.length - 1];
            var onclick = lastPageEl.attr("onclick");
            if (onclick) {
                var m = onclick.match(/page\(\d+,(\d+)\)/);
                if (m) maxPage = parseInt(m[1]);
            }
        }
    }

    var chapterEls = doc.select("#chapter-list ul li a");
    if (chapterEls.length === 0) chapterEls = doc.select("div.list-chap ul li a");
    for (var i = 0; i < chapterEls.length; i++) {
        chapters.push({
            title: chapterEls[i].text,
            url: chapterEls[i].href.replace("sstruyen.com", "sstruyen.com.vn")
        });
    }

    if (bookId && maxPage > 1) {
        for (var p = 2; p <= maxPage; p++) {
            var pUrl = BASE_URL + "/get/listchap/" + bookId + "?page=" + p;
            var pResp = fetch(pUrl, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest"
                }
            });
            if (pResp.ok) {
                try {
                    var json = JSON.parse(pResp.text());
                    var pDoc = Html.parse(json.data || json.html || "");
                    var pEls = pDoc.select("ul li a");
                    for (var j = 0; j < pEls.length; j++) {
                        chapters.push({
                            title: pEls[j].text,
                            url: pEls[j].href.replace("sstruyen.com", "sstruyen.com.vn")
                        });
                    }
                } catch (e) { }
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

    // Clean-At-Source
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");

    var contentEl = doc.selectFirst("div.truyen") || doc.selectFirst("div.content.container1") || doc.selectFirst("div.content");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}

