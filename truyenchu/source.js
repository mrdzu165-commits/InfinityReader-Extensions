var r = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    en: function (t) {
        var e, n, a, o, u, c, i, s = "", f = 0;
        for (t = r._utf8_encode(t); f < t.length;)
            o = (e = t.charCodeAt(f++)) >> 2,
                u = (3 & e) << 4 | (n = t.charCodeAt(f++)) >> 4,
                c = (15 & n) << 2 | (a = t.charCodeAt(f++)) >> 6,
                i = 63 & a,
                isNaN(n) ? c = i = 64 : isNaN(a) && (i = 64),
                s = s + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(c) + this._keyStr.charAt(i);
        return s
    },
    de: function (t) {
        var e, n, a, o, u, c, i = "", s = 0;
        for (t = t.replace(/[^A-Za-z0-9\+\/\=]/g, ""); s < t.length;)
            e = this._keyStr.indexOf(t.charAt(s++)) << 2 | (o = this._keyStr.indexOf(t.charAt(s++))) >> 4,
                n = (15 & o) << 4 | (u = this._keyStr.indexOf(t.charAt(s++))) >> 2,
                a = (3 & u) << 6 | (c = this._keyStr.indexOf(t.charAt(s++))),
                i += String.fromCharCode(e),
                64 != u && (i += String.fromCharCode(n)),
                64 != c && (i += String.fromCharCode(a));
        return i = r._utf8_decode(i)
    },
    _utf8_encode: function (t) {
        t = t.replace(/\r\n/g, "\n");
        for (var e = "", n = 0; n < t.length; n++) {
            var r = t.charCodeAt(n);
            r < 128 ? e += String.fromCharCode(r) : r > 127 && r < 2048 ? (e += String.fromCharCode(r >> 6 | 192),
                e += String.fromCharCode(63 & r | 128)) : (e += String.fromCharCode(r >> 12 | 224),
                    e += String.fromCharCode(r >> 6 & 63 | 128),
                    e += String.fromCharCode(63 & r | 128))
        }
        return e
    },
    _utf8_decode: function (t) {
        for (var e = "", n = 0, r = 0, a = 0, o = 0; n < t.length;)
            (r = t.charCodeAt(n)) < 128 ? (e += String.fromCharCode(r),
                n++) : r > 191 && r < 224 ? (o = t.charCodeAt(n + 1),
                    e += String.fromCharCode((31 & r) << 6 | 63 & o),
                    n += 2) : (o = t.charCodeAt(n + 1),
                        a = t.charCodeAt(n + 2),
                        e += String.fromCharCode((15 & r) << 12 | (63 & o) << 6 | 63 & a),
                        n += 3);
        return e
    }
}

function getBookList(page, query) {
    if (query && query.length > 0) {
        var resp = fetch(BASE_URL + "/api/book-search", {
            method: 'POST',
            body: { keyword: query }
        });
        if (resp.ok) {
            var json = resp.json();
            if (json && json.data) {
                var books = [];
                json.data.forEach(function (e) {
                    books.push({
                        id: e.slug,
                        title: e.name,
                        author: e.author,
                        coverUrl: e.coverUrl,
                        url: BASE_URL + "/" + e.slug
                    });
                });
                return Response.success(books);
            }
        }
        return Response.error("Search failed");
    } else {
        var url = BASE_URL + "/danh-sach/truyen-hot" + ("?page=" + page);
        var resp = fetch(url);
        if (!resp.ok) return Response.error("Fetch list failed");

        var doc = Html.parse(resp.text());
        var items = doc.select("dt[itemscope]");
        var books = [];

        for (var i = 0; i < items.length; i++) {
            var el = Html.parse(items[i].html);
            var titleEl = el.selectFirst("a[itemProp=url]");
            var coverEl = el.selectFirst("img[loading]");
            var authorStr = el.selectFirst(".items-center"); // author text

            if (titleEl) {
                books.push({
                    id: titleEl.href.replace(BASE_URL + "/", ""),
                    title: titleEl.text,
                    author: authorStr ? authorStr.text : "",
                    coverUrl: coverEl ? coverEl.attr("src") : "",
                    url: titleEl.href
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

    var doc = Html.parse(resp.text());

    var titleEl = doc.selectFirst("h1");
    var coverEl = doc.selectFirst("[itemProp=thumbnailUrl]");
    var authorEl = doc.selectFirst("[itemProp=author]");
    var descEl = doc.selectFirst("[itemProp=description]");

    // API TOC fetching
    var slug = url.substring(url.lastIndexOf("/") + 1);
    var apiUrl = BASE_URL.replace("https://", "https://api.") + "/api/book/get-chapter-list-version-2/" + slug + "/13";
    var chapResp = fetch(apiUrl);
    var chapters = [];

    if (chapResp.ok) {
        var json = chapResp.json();
        if (json && json.data) {
            var decompressed = r.de(json.data);
            var data = JSON.parse(decompressed);
            for (var i = 0; i < data.length; i++) {
                chapters.push({
                    title: data[i].name,
                    url: slug + "/" + data[i].slug
                });
            }
        }
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverEl ? coverEl.attr("content") : "",
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + "/" + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());

    // Clean-At-Source
    doc.remove("noscript, script, iframe, div.ads-responsive, [style*=font-size], a, ins");

    var contentEl = doc.selectFirst("article");
    if (!contentEl) return Response.error("Content not found");

    var cleaned = Html.clean(contentEl.html);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}
