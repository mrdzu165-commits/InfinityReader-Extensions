var BASE_URL = "https://nettruyen.com.vn";

function getBookList(page, query) {
    var url = "";
    if (query && query.indexOf("@filter:") !== -1) {
        var category = query.split("@filter:")[1];
        if (category.indexOf("/") !== 0) category = "/" + category;
        url = BASE_URL + category;
        if (page > 1) {
            // Category urls are like /the-loai/tien-hiep.html -> /the-loai/tien-hiep/trang-2.html
            // Wait, we saw ajax calls for category pages: `ajax.cate.php?trang=2&loai=truyendich&cate=new&theloai=3`.
            // But directly appending '?trang=2' didn't work in my test.
            // Oh, look at line 1368: `/the-loai/tien-hiep/trang-{{number}}.html`
            if (url.endsWith(".html")) {
                url = url.substring(0, url.length - 5) + "/trang-" + page + ".html";
            } else {
                if (url.endsWith("/")) url = url.substring(0, url.length - 1);
                url += "/trang-" + page + ".html";
            }
        }
    } else if (query && query.length > 0) {
        url = BASE_URL + "/?s=" + encodeURIComponent(query) + "&trang=" + page;
    } else {
        url = BASE_URL + "/moi-nhat/trang-" + page + ".html";
    }

    var resp = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    });

    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var doc = Html.parse(resp.text());
    var items = doc.select(".story-list, .col-sm-6.col-md-2");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = items[i];

        var titleEl = el.selectFirst("h3.title a, h6");
        if (!titleEl) continue;
        var title = titleEl.text.trim();

        var linkEl = el.selectFirst("a");
        if (!linkEl) continue;
        var bookUrl = linkEl.attr("href");
        if (bookUrl && bookUrl.indexOf("http") !== 0) {
            if (bookUrl.indexOf("/") !== 0) bookUrl = "/" + bookUrl;
            bookUrl = BASE_URL + bookUrl;
        }

        var coverEl = el.selectFirst("img");
        var cover = "";
        if (coverEl) {
            cover = coverEl.attr("data-original") || coverEl.attr("data-layzr") || coverEl.attr("src");
            if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
            else if (cover && cover.indexOf("/") === 0 && cover.indexOf("http") !== 0) cover = BASE_URL + cover;
            else if (cover && cover.indexOf("http") !== 0) cover = BASE_URL + "/" + cover;
        }

        var authorEl = el.selectFirst(".info p[itemprop=author], .info p");
        var author = authorEl ? authorEl.text.replace("fa1-user", "").trim() : "";

        var id = bookUrl;
        if (id && id.indexOf(BASE_URL) === 0) id = id.substring(BASE_URL.length);

        books.push({
            id: id,
            title: title,
            coverUrl: cover,
            author: author,
            url: bookUrl
        });
    }
    return Response.success(books);
}

function getBookDetails(id) {
    var url = BASE_URL + id;
    if (url.indexOf("http") !== 0) url = BASE_URL + "/" + id;

    var resp = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    });
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var html = resp.text();
    var doc = Html.parse(html);
    var detail = doc.selectFirst(".story-detail");
    if (!detail) return Response.error("Not found details");

    var titleEl = detail.selectFirst("h1.title");
    var title = titleEl ? titleEl.text.trim() : "";

    var coverEl = detail.selectFirst(".thumb img");
    var cover = "";
    if (coverEl) {
        cover = coverEl.attr("src");
        if (cover && cover.indexOf("//") === 0) cover = "https:" + cover;
        else if (cover && cover.indexOf("/") === 0 && cover.indexOf("http") !== 0) cover = BASE_URL + cover;
        else if (cover && cover.indexOf("http") !== 0) cover = BASE_URL + "/" + cover;
    }

    var authorEl = detail.selectFirst(".info p[itemprop=author] a");
    var author = authorEl ? authorEl.text.trim() : "";

    var genres = [];
    var genreEls = detail.select(".info p a[itemprop=genre]");
    for (var i = 0; i < genreEls.length; i++) {
        genres.push(genreEls[i].text.trim());
    }

    var descEl = detail.selectFirst(".description");
    var desc = descEl ? descEl.text.trim() : "";

    return Response.success({
        id: id,
        title: title,
        coverUrl: cover,
        author: author,
        genres: genres.join(", "),
        description: desc
    });
}

function getChapters(id) {
    var url = BASE_URL + id;
    if (url.indexOf("http") !== 0) url = BASE_URL + "/" + id;

    var resp = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    });
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var html = resp.text();
    var doc = Html.parse(html);
    var chaps = [];
    var chapterEls = doc.select(".list-chapters li a");
    if (!chapterEls.length) {
        chapterEls = doc.select("#listchuong li a");
    }

    for (var i = 0; i < chapterEls.length; i++) {
        var el = chapterEls[i];
        var href = el.attr("href");
        var name = el.text.trim();

        if (href && href.indexOf("http") !== 0) {
            if (href.indexOf("/") !== 0) href = "/" + href;
            href = BASE_URL + href;
        }

        var chapId = href;
        if (chapId && chapId.indexOf(BASE_URL) === 0) chapId = chapId.substring(BASE_URL.length);

        chaps.push({
            id: chapId,
            name: name,
            url: href
        });
    }

    return Response.success(chaps);
}

function getChapterContent(bookId, chapterId) {
    var url = BASE_URL + chapterId;
    if (url.indexOf("http") !== 0) url = BASE_URL + "/" + chapterId;

    var resp = fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
    });
    if (!resp.ok) return Response.error("Fetch failed: " + resp.status);

    var html = resp.text();
    var doc = Html.parse(html);
    var contentEl = doc.selectFirst("#noidungchap, .chapter-c, .chapter-content");
    if (!contentEl) return Response.error("Not found chapter content");

    // Remove unwanted elements
    var removeSelects = ["style", "script", "iframe", ".ads", ".adsbox", "center", "h1"];
    for (var i = 0; i < removeSelects.length; i++) {
        var rems = contentEl.select(removeSelects[i]);
        for (var j = 0; j < rems.length; j++) {
            rems[j].remove();
        }
    }

    var content = contentEl.html;
    // Replace nettruyen mentions if needed
    content = content.replace(/nettruyen/gi, '');

    return Response.success({
        content: content
    });
}
