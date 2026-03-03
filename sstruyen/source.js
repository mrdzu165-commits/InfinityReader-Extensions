var BASE_URL = "https://sstruyen.com.vn";

function getBookList(page, query) {
    var url = "";
    if (query && query.length > 0) {
        if (query.startsWith("@filter:")) {
            var filterPath = query.substring(8);
            url = BASE_URL + "/" + filterPath + (page > 1 ? "?page=" + page : "");
        } else {
            url = BASE_URL + "/tim-kiem?s=" + encodeURIComponent(query) + "&page=" + page;
        }
    } else {
        url = BASE_URL + "/danh-sach/truyen-hot" + (page > 1 ? "?page=" + page : "");
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.success([]);

    var doc = Html.parse(resp.text());
    var items = doc.select(".item");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var itemHtml = typeof items[i].html === 'function' ? items[i].html() : (items[i].html || items[i].htmlStr || "");
        var el = Html.parse(itemHtml);
        var titleEl = el.selectFirst("h3");
        var aEl = el.selectFirst("a");
        var coverEl = el.selectFirst("img");

        var author = "";
        var authorEl = el.selectFirst("p.line a");
        if (authorEl) author = authorEl.text;

        var chapterCount = "";
        var pLines = el.select("p.line");
        if (pLines) {
            for (var j = 0; j < pLines.length; j++) {
                var pText = pLines[j].text;
                if (pText.indexOf("Số chương") > -1) {
                    chapterCount = pText.replace("Số chương:", "").trim();
                    break;
                }
            }
        }

        if (titleEl && aEl) {
            var coverUrl = "";
            if (coverEl) {
                coverUrl = coverEl.attr("data-pagespeed-high-res-src") || coverEl.attr("data-src") || coverEl.attr("src") || coverEl.src || "";
            }
            if (coverUrl && !coverUrl.startsWith("http")) {
                coverUrl = BASE_URL + (coverUrl.startsWith("/") ? "" : "/") + coverUrl;
            }

            books.push({
                id: aEl.attr("href").replace(BASE_URL, "").replace("sstruyen.com.vn", "").replace("sstruyen.com", ""),
                title: titleEl.text || "",
                author: author,
                coverUrl: coverUrl,
                url: aEl.attr("href").replace("sstruyen.com", "sstruyen.com.vn"),
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

    var titleEl = doc.selectFirst("h1[itemprop=name]") || doc.selectFirst("h1.title") || doc.selectFirst("h1");
    var coverEl = doc.selectFirst("img[itemprop=image]") || doc.selectFirst(".book-info-pic img") || doc.selectFirst(".wrap-detail.pc img");
    var descEl = doc.selectFirst("#gioithieu .scrolltext") || doc.selectFirst(".scrolltext") || doc.selectFirst(".wrap-detail.pc .content1");

    // Clean up description
    var descHtml = descEl ? (typeof descEl.html === 'function' ? descEl.html() : (descEl.html || descEl.htmlStr || "")) : "";
    descHtml = descHtml.replace(/<div[^>]*class="[^"]*info[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
    var descParsed = Html.parse(descHtml);

    var coverUrl = "";
    if (coverEl) {
        coverUrl = coverEl.attr("data-pagespeed-high-res-src") || coverEl.attr("data-src") || coverEl.attr("src") || coverEl.src || "";
    }
    if (coverUrl && !coverUrl.startsWith("http")) {
        coverUrl = BASE_URL + (coverUrl.startsWith("/") ? "" : "/") + coverUrl;
    }

    var chapters = [];
    var bookId = "";
    var maxPage = 1;

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
            url: chapterEls[i].attr("href").replace("sstruyen.com", "sstruyen.com.vn")
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
                            url: pEls[j].attr("href").replace("sstruyen.com", "sstruyen.com.vn")
                        });
                    }
                } catch (e) { }
            }
        }
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: "",
        description: descParsed.clean ? descParsed.clean() : descParsed.htmlStr,
        coverUrl: coverUrl,
        chapters: chapters
    });
}

function getChapters(bookUrl) {
    return getBookDetails(bookUrl);
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + (chapterUrl.startsWith("/") ? "" : "/") + chapterUrl;
    var resp = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
    });

    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst("h2.current-chapter") || doc.selectFirst("h1");

    var contentEl = doc.selectFirst("div.truyen") || doc.selectFirst("#vungdoc") || doc.selectFirst("div.vung-doc") || doc.selectFirst("div.content.container1") || doc.selectFirst("div.content");

    var contentHtml = "";
    if (contentEl) {
        contentHtml = typeof contentEl.html === 'function' ? contentEl.html() : (contentEl.html || contentEl.htmlStr || "");
    } else {
        // Last resort fallback
        var wrap = doc.selectFirst(".vung-doc") || doc.selectFirst("body");
        if (wrap) contentHtml = typeof wrap.html === 'function' ? wrap.html() : (wrap.html || wrap.htmlStr || "");
    }

    if (!contentHtml || contentHtml.length < 50) {
        return Response.error("Content not found or empty (Length: " + (contentHtml ? contentHtml.length : 0) + ")");
    }

    // Attempt to manually clean
    contentHtml = contentHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
    contentHtml = contentHtml.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");
    contentHtml = contentHtml.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");
    contentHtml = contentHtml.replace(/<div[^>]*class="[^"]*ads[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
    contentHtml = contentHtml.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "");
    contentHtml = contentHtml.replace(/<ins[^>]*>[\s\S]*?<\/ins>/gi, "");

    var cleaned = Html.clean ? Html.clean(contentHtml) : contentHtml;

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: titleEl ? titleEl.text : "",
        content: cleaned
    });
}
