var BACKEND_URL = "https://backend.metruyencv.com";

function getBookList(page, query) {
    if (query && query.length > 0) {
        var resp = fetch(BACKEND_URL + "/api/books/search", {
            headers: { "X-App": "MeTruyenChu" },
            queries: {
                "keyword": query,
                "page": page
            }
        });

        if (resp.ok) {
            var json = resp.json();
            if (json && json.data) {
                var books = [];
                json.data.forEach(function (book) {
                    var coverUrl = typeof book.poster === 'object' && book.poster ? book.poster['default'] : book.poster;
                    books.push({
                        id: "truyen/" + book.link,
                        title: book.name,
                        author: book.author ? book.author.name : "",
                        coverUrl: coverUrl || "",
                        url: BASE_URL + "/truyen/" + book.link
                    });
                });
                return Response.success(books);
            }
        }
        return Response.error("Search failed");
    } else {
        // Hot books
        var url = BASE_URL + "/truyen-hot" + ("?page=" + page);
        var resp = fetch(url);
        if (!resp.ok) return Response.error("Fetch failed");

        var doc = Html.parse(resp.text());
        var items = doc.select(".flex.gap-4"); // Note: metruyencv uses Tailwind. Typical list item has flex gap-4
        var books = [];
        for (var i = 0; i < items.length; i++) {
            var el = Html.parse(items[i].html);
            var aEl = el.selectFirst("a[href*='/truyen/']");
            var titleEl = el.selectFirst("h3") || el.selectFirst("h2");
            var imgEl = el.selectFirst("img");
            var authorEl = el.selectFirst(".text-gray-500");

            if (aEl && titleEl) {
                books.push({
                    id: aEl.href.replace(BASE_URL + "/", ""),
                    title: titleEl.text,
                    author: authorEl ? authorEl.text : "",
                    coverUrl: imgEl ? (imgEl.src || imgEl.attr("src") || imgEl.attr("data-src")) : "",
                    url: aEl.href
                });
            }
        }
        return Response.success(books);
    }
}

function getBookDetails(bookUrl) {
    var url = bookUrl.startsWith("http") ? bookUrl : BASE_URL + "/" + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst("h1");
    var coverEl = doc.selectFirst("img.shadow-lg") || doc.selectFirst(".book-cover img");
    var authorEl = doc.selectFirst("a[href*='tac-gia']");
    var descEl = doc.selectFirst("#synopsis .text-base") || doc.selectFirst("#synopsis");

    var coverUrl = "";
    if (coverEl) {
        coverUrl = coverEl.src || coverEl.attr("src") || "";
    }

    var chapters = [];
    var bookIdMatch = htmlStr.match(/"id":\s*(\d+)/);
    if (bookIdMatch) {
        var bookId = bookIdMatch[1];
        var tocUrl = BACKEND_URL + "/api/chapters?filter[book_id]=" + bookId + "&filter[type]=published";
        var tocResp = fetch(tocUrl, {
            headers: { "X-App": "MeTruyenChu" }
        });

        if (tocResp.ok) {
            var json = tocResp.json();
            if (json && json.data) {
                // Determine base book URL for chapters (if not already /truyen/...)
                var bookPath = url.replace(BASE_URL + "/", "").split("?")[0];
                for (var i = 0; i < json.data.length; i++) {
                    var chapter = json.data[i];
                    chapters.push({
                        title: chapter.name,
                        url: bookPath + "/chuong-" + chapter.index
                    });
                }
            }
        }
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
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + "/" + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    // Clean-At-Source
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins, .title-chap");

    var contentEl = doc.selectFirst("[data-x-bind='ChapterContent']") || doc.selectFirst("[data-x-bind=ChapterContent]");
    if (!contentEl) contentEl = doc.selectFirst("#chapter-content");

    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}
