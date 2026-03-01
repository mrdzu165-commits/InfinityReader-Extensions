function getBookList(page, query) {
    if (!page) page = 1;

    if (query && query.length > 0) {
        var resp = fetch("https://www.wattpad.com/v4/search/stories", {
            queries: {
                query: query,
                fields: "stories(id,title,url,cover,user(name))",
                offset: (page - 1) * 10,
                limit: "10"
            }
        });

        if (resp.ok) {
            var json = resp.json();
            if (json && json.stories) {
                var books = [];
                json.stories.forEach(function (v) {
                    var match = v.url.match(/story\/(\d+)-/);
                    var bId = match ? match[1] : v.id;
                    books.push({
                        id: bId.toString(),
                        title: v.title,
                        author: v.user ? v.user.name : "",
                        coverUrl: v.cover,
                        url: v.url
                    });
                });
                return Response.success(books);
            }
        }
        return Response.error("Search failed");
    } else {
        // Hot / New list
        var offset = (page > 1 ? page - 1 : 0) * 10;
        var resp = fetch("https://www.wattpad.com/api/v3/stories", {
            queries: {
                filter: "new",
                offset: offset,
                limit: "10"
            }
        });

        if (resp.ok) {
            var json = resp.json();
            if (json && json.stories) {
                var books = [];
                json.stories.forEach(function (v) {
                    var match = v.url.match(/story\/(\d+)-/);
                    var bId = match ? match[1] : v.id;
                    books.push({
                        id: bId.toString(),
                        title: v.title,
                        author: v.user ? v.user.name : "",
                        coverUrl: v.cover,
                        url: v.url
                    });
                });
                return Response.success(books);
            }
        }
        return Response.error("Fetch list failed");
    }
}

function getBookDetails(bookUrl) {
    // bookUrl could be full URL or just ID
    var storyId = bookUrl;
    var match = bookUrl.match(/\/story\/(\d+)-/);
    if (!match) match = bookUrl.match(/\/(\d+)-/);
    if (match) storyId = match[1];

    var resp = fetch("https://www.wattpad.com/api/v3/stories/" + storyId);
    if (!resp.ok) return Response.error("Fetch details failed");

    var data = resp.json();
    if (!data || !data.title) return Response.error("Invalid JSON response");

    var chapters = [];
    if (data.parts) {
        data.parts.forEach(function (p) {
            chapters.push({
                title: p.title,
                url: p.url
            });
        });
    }

    return Response.success({
        title: data.title,
        author: data.user ? data.user.name : "",
        description: data.description,
        coverUrl: data.cover,
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var chapId = chapterUrl;
    var match = chapterUrl.match(/wattpad.com\/(\d+)-/);
    if (match) chapId = match[1];

    var resp = fetch("https://www.wattpad.com/apiv2/storytext?id=" + chapId);
    if (!resp.ok) return Response.error("Fetch chapter failed");

    var rawHtml = resp.text();
    if (rawHtml) {
        var doc = Html.parse(rawHtml);
        doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins, .title-chap");
        rawHtml = Html.clean(doc.html);
    }

    if (typeof cleanVietnameseAds === "function") rawHtml = cleanVietnameseAds(rawHtml);
    if (typeof normalizeText === "function") rawHtml = normalizeText(rawHtml);

    return Response.success({
        title: "",
        content: rawHtml
    });
}
