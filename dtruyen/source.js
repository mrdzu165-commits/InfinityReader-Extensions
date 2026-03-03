var BASE_URL = "https://truyencom.com";

function getBookList(page, query) {
    var url = "";
    if (query && query.indexOf("@filter:") !== -1) {
        var category = query.split("@filter:")[1];
        if (category) {
            if (page === 1) {
                url = BASE_URL + category;
            } else {
                url = BASE_URL + category + "trang-" + page + "/";
            }
        }
    }

    if (!url) {
        if (query && query.length > 0) {
            // Updated to use 'paged' which seen in fetched HTML
            url = BASE_URL + "/tim-kiem/?tukhoa=" + encodeURIComponent(query) + "&paged=" + page;
        } else {
            if (page === 1) {
                url = BASE_URL + "/truyen-hot/";
            } else {
                url = BASE_URL + "/truyen-hot/trang-" + page + "/";
            }
        }
    }

    // Trying without explicitly setting headers to avoid CF detection if App fetch is limited
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var text = resp.text();
    if (!text || text.length < 100) return Response.error("Response too short or empty");

    var doc = Html.parse(text);
    // Be as broad as possible
    var items = doc.select("div[itemtype*='Book'], .list-truyen .row, .row[itemscope], .item[itemscope], .index-intro .item, .list-new .row");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = items[i];

        var titleEl = el.selectFirst("h3 a, a[itemprop='url'], a.truyen-title, h1 a, a[title] h3");
        if (!titleEl && el.tagName === "a") titleEl = el;
        if (!titleEl) titleEl = el.selectFirst("a");
        if (!titleEl) continue;

        var title = titleEl.text.trim();
        var bookUrl = titleEl.href;
        if (!bookUrl || bookUrl.indexOf("javascript") !== -1 || bookUrl === "#") continue;

        var author = "";
        var authorEl = el.selectFirst(".author, span[itemprop='author'], a[itemprop='author']");
        if (authorEl) author = authorEl.text.trim().replace(/^By\s+/i, "");

        var cover = "";
        var coverEl = el.selectFirst(".lazyimg, img, [data-image], [data-desk-image]");
        if (coverEl) {
            cover = coverEl.attr("data-desk-image") || coverEl.attr("data-image") || coverEl.attr("lazysrc") || coverEl.src || coverEl.attr("src");
        }

        var chapterCount = "";
        var allAuthors = el.select(".author");
        if (allAuthors && allAuthors.length > 0) {
            for (var k = 0; k < allAuthors.length; k++) {
                var aText = allAuthors[k].text.trim();
                // Match "X chương"
                if (aText.toLowerCase().indexOf("chương") !== -1) {
                    chapterCount = aText;
                    break;
                }
            }
        }

        var id = bookUrl;
        if (id.indexOf(BASE_URL) === 0) {
            id = id.substring(BASE_URL.length);
        }

        books.push({
            id: id,
            title: title,
            author: author,
            coverUrl: cover,
            url: bookUrl,
            chapterCount: chapterCount
        });
    }

    var seen = {};
    var result = [];
    for (var j = 0; j < books.length; j++) {
        var b = books[j];
        if (b.title && !seen[b.id]) {
            seen[b.id] = true;
            result.push(b);
        }
    }

    return Response.success(result);
}

function getBookDetails(bookUrl) {
    var url = bookUrl.indexOf("http") === 0 ? bookUrl : BASE_URL + bookUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var doc = Html.parse(resp.text());

    var titleEl = doc.selectFirst("h1.title, h3.title, .truyen-title, h1");
    var authorEl = doc.selectFirst("a[itemprop='author'], .info a[title], .author a, .info-holder .info div:contains(Tác giả) a");
    var descEl = doc.selectFirst("div.desc-text, div[itemprop='description'], .truyen-desc, .desc");
    var coverEl = doc.selectFirst(".book img, img[itemprop='image'], .info-holder img, .info img");

    var chapters = [];
    var chapterEls = doc.select("ul.list-chapter li a, .list-chapter a, #list-chapter a");
    for (var i = 0; i < chapterEls.length; i++) {
        var cUrl = chapterEls[i].href;
        if (cUrl && cUrl.indexOf("javascript") === -1) {
            chapters.push({
                title: chapterEls[i].text.trim(),
                url: cUrl
            });
        }
    }

    var pagination = doc.select("ul.pagination li a");
    var lastPage = 1;
    for (var j = 0; j < pagination.length; j++) {
        var pText = pagination[j].text.trim();
        if (pText.indexOf("Last") !== -1 || pText.indexOf("Cuối") !== -1 || pText.indexOf("»") !== -1) {
            var pHref = pagination[j].href;
            var match = pHref.match(/trang-(\d+)/) || pHref.match(/paged=(\d+)/);
            if (match) lastPage = parseInt(match[1]);
        } else {
            var pNum = parseInt(pText);
            if (!isNaN(pNum) && pNum > lastPage) lastPage = pNum;
        }
    }

    var pagStr = url.replace(/\/$/, "") + "/trang-%d/#chapter-list";
    if (url.indexOf(".html") !== -1) {
        pagStr = url.replace(".html", "") + "/trang-%d/#chapter-list";
    }

    return Response.success({
        title: titleEl ? titleEl.text.trim() : "",
        author: authorEl ? authorEl.text.trim() : "Đang cập nhật",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverEl ? (coverEl.src || coverEl.attr("src") || coverEl.attr("data-image") || coverEl.attr("data-desk-image")) : "",
        chapters: chapters,
        paginationUrl: pagStr,
        paginationFormat: 1,
        lastPage: lastPage
    });
}

function getChapters(bookUrl) {
    return getBookDetails(bookUrl);
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.indexOf("http") === 0 ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var doc = Html.parse(resp.text());
    doc.remove("noscript, script, iframe, div.ads, div.ads-responsive, ins, .adsbygoogle, .footer, .header");

    var contentEl = doc.selectFirst("div#chapter-c, div.chapter-c, div.vung_doc, #vung_doc, .chapter-content, .content");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    var titleEl = doc.selectFirst("h1 a.chapter-title, .chapter-title, h1.chapter-title, .title-chapter, h2.chapter-title");

    return Response.success({
        title: titleEl ? titleEl.text.trim() : "",
        content: cleaned
    });
}
