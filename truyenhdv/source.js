var BASE_URL = "https://truyenhdv.com";
var API_URL = "https://s1apihd.com";

function getBookList(page, query) {
    var url = "";
    var isApi = false;

    if (query && query.indexOf("@filter:") !== -1) {
        var category = query.split("@filter:")[1];
        url = BASE_URL + category;
        if (page > 1) {
            url += "page/" + page + "/";
        }
    } else if (query && query.length > 0) {
        url = BASE_URL + "/tim-kiem/";
        if (page > 1) {
            url += "page/" + page + "/";
        }
        url += "?title=" + encodeURIComponent(query);
    } else {
        // Use API for home/new list
        url = API_URL + "/wp-json/v1/app/cache/book?slug=all&filter=new-chap&time=month&type=ticket&post=9&page=" + page;
        isApi = true;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    if (isApi) {
        var json = JSON.parse(resp.text());
        var books = json.map(function (item) {
            return {
                id: "/truyen/" + item.slug + "/",
                title: item.title,
                author: "",
                coverUrl: item.thumbnail,
                url: BASE_URL + "/truyen/" + item.slug + "/",
                chapterCount: item.number || ""
            };
        });
        return Response.success(books);
    } else {
        var doc = Html.parse(resp.text());
        var items = doc.select(".theloai-thumlist li, .list-truyen .row");
        var books = [];
        for (var i = 0; i < items.length; i++) {
            var el = items[i];
            var titleEl = el.selectFirst("h2 a, h3 a, a.truyen-title");
            if (!titleEl) continue;

            var title = titleEl.text.trim();
            var bookUrl = titleEl.href;
            if (bookUrl && bookUrl.indexOf("http") !== 0) bookUrl = BASE_URL + bookUrl;

            var coverEl = el.selectFirst("img");
            var cover = "";
            if (coverEl) {
                cover = coverEl.attr("data-src") || coverEl.attr("src");
                if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
                if (cover && cover.indexOf("/") === 0) cover = BASE_URL + cover;
            }

            var id = bookUrl;
            if (id && id.indexOf(BASE_URL) === 0) id = id.substring(BASE_URL.length);

            books.push({
                id: id,
                title: title,
                author: "",
                coverUrl: cover,
                url: bookUrl,
                chapterCount: ""
            });
        }
        return Response.success(books);
    }
}

function getBookDetails(id) {
    if (id.indexOf("http") !== 0) id = BASE_URL + id;
    var resp = fetch(id);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var text = resp.text();
    var doc = Html.parse(text);

    var titleEl = doc.selectFirst("h1");
    var title = titleEl ? titleEl.text.trim() : "";
    var coverEl = doc.selectFirst(".book3d img");
    var cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("src");
        if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
        if (cover && cover.indexOf("/") === 0) cover = BASE_URL + cover;
    }

    var descEl = doc.selectFirst(".excerpt-full, .excerpt-collapse, .keywords");
    var description = descEl ? descEl.html() : "";

    var titleTag = doc.selectFirst("title");
    var fullTitle = titleTag ? titleTag.text : "";
    var author = "";
    var parts = fullTitle.split("-");
    if (parts.length >= 2) {
        author = parts[1].trim();
    }

    var bundleId = "";
    var viewsEl = doc.selectFirst("#views");
    if (viewsEl) {
        bundleId = viewsEl.attr("data-id");
    }

    if (!bundleId) {
        var scriptMatch = text.match(/data-id="(\d+)"/);
        if (scriptMatch) bundleId = scriptMatch[1];
    }

    var chapters = [];
    if (bundleId) {
        var chapResp = fetch(API_URL + "/wp-json/v1/app/cache/truyen/dsc?ID=" + bundleId + "&page=1&limit=2000");
        if (chapResp.ok) {
            var chapJson = JSON.parse(chapResp.text());
            if (Array.isArray(chapJson)) {
                var bookSlug = id.split("/").filter(Boolean).pop();
                chapters = chapJson.map(function (c) {
                    return {
                        name: c.post_title,
                        url: "/truyen/" + bookSlug + "/chap/" + c.post_name + "/"
                    };
                });
            }
        }
    }

    return Response.success({
        title: title,
        author: author,
        coverUrl: cover,
        description: description,
        chapters: chapters
    });
}

function getChapterContent(url) {
    if (url.indexOf("http") !== 0) url = BASE_URL + url;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var text = resp.text();
    var doc = Html.parse(text);

    var content = doc.selectFirst(".reading");
    if (!content) return Response.error("Content not found");

    var ads = content.select(".ads-content-1, .ads-content-2, .ads-content-3, script, style");
    for (var i = 0; i < ads.length; i++) {
        ads[i].remove();
    }

    return Response.success({
        content: content.html()
    });
}
