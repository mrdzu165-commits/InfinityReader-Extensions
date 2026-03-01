var signFuncStr = 'function signFunc(r){function o(r,o){return r>>>o|r<<32-o}for(var f,n,t=Math.pow,c=t(2,32),i="length",a="",e=[],u=8*r[i],v=[],g=[],h=g[i],l={},s=2;64>h;s++)if(!l[s]){for(f=0;313>f;f+=s)l[f]=s;v[h]=t(s,.5)*c|0,g[h++]=t(s,1/3)*c|0}for(r+="\\x80";r[i]%64-56;)r+="\\0";for(f=0;f<r[i];f++){if((n=r.charCodeAt(f))>>8)return;e[f>>2]|=n<<(3-f)%4*8}for(e[e[i]]=u/c|0,e[e[i]]=u,n=0;n<e[i];){var d=e.slice(n,n+=16),p=v;for(v=v.slice(0,8),f=0;64>f;f++){var w=d[f-15],A=d[f-2],C=v[0],F=v[4],M=v[7]+(o(F,6)^o(F,11)^o(F,25))+(F&v[5]^~F&v[6])+g[f]+(d[f]=16>f?d[f]:d[f-16]+(o(w,7)^o(w,18)^w>>>3)+d[f-7]+(o(A,17)^o(A,19)^A>>>10)|0);(v=[M+((o(C,2)^o(C,13)^o(C,22))+(C&v[1]^C&v[2]^v[1]&v[2]))|0].concat(v))[4]=v[4]+M|0}for(f=0;8>f;f++)v[f]=v[f]+p[f]|0}for(f=0;8>f;f++)for(n=3;n+1;n--){var S=v[f]>>8*n&255;a+=(16>S?0:"")+S.toString(16)}return a}';
eval(signFuncStr);

function getBookList(page, query) {
    var url = "";
    if (page == 1) page = 0; // wikidich uses 0 instead of 1 for first page

    if (query && query.length > 0) {
        url = BASE_URL + "/tim-kiem?q=" + encodeURIComponent(query) + "&qs=1&start=" + page + "&vo=1";
    } else {
        url = BASE_URL + "/bang-xep-hang?so=4&start=" + page;
    }

    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var doc = Html.parse(resp.text());
    var items = doc.select(".book-list > .book-item");
    var books = [];

    for (var i = 0; i < items.length; i++) {
        var el = Html.parse(items[i].html);
        var titleEl = el.selectFirst(".book-title");
        var linkEl = el.selectFirst(".info-col > a");
        var coverEl = el.selectFirst(".cover-col img");
        var authorEl = el.selectFirst(".book-author");

        if (titleEl && linkEl) {
            books.push({
                id: linkEl.href.replace(BASE_URL, ""),
                title: titleEl.text,
                author: authorEl ? authorEl.text : "",
                coverUrl: coverEl ? coverEl.attr("src") : "",
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

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var titleEl = doc.selectFirst(".cover-info h2");
    var authorEl = doc.selectFirst(".cover-info a[href*='tac-gia']");
    var descEl = doc.selectFirst("div.book-desc-detail");
    var coverEl = doc.selectFirst("div.book-info img");

    var chapters = [];
    var bookId = "";
    var bkIdEl = doc.selectFirst("input#bookId") || doc.selectFirst("input[name=bookId]");
    if (bkIdEl) bookId = bkIdEl.attr("value");

    var sizeMatch = htmlStr.match(/.*?loadBookIndex.*?\d+,\s*(\d+)\s*/);
    var size = sizeMatch ? sizeMatch[1] : 50;
    var signKeyMatch = htmlStr.match(/signKey\s*=\s*"(.*?)";/);
    var signKey = signKeyMatch ? signKeyMatch[1] : "";
    var fuzzySignMatch = htmlStr.match(/function fuzzySign[\s\S]*?}/);
    if (fuzzySignMatch) {
        eval(fuzzySignMatch[0]); // defines fuzzySign
    }

    // Fallback if fuzzySign isn't successfully eval'ed
    if (typeof fuzzySign !== "function") {
        function fuzzySign(x) { return x; }
    }

    // Load first page of chapters
    var chapResp = fetch(BASE_URL + "/book/index", {
        method: "POST",
        body: {
            bookId: bookId,
            signKey: signKey,
            sign: signFunc(fuzzySign(signKey + "0" + size)),
            size: size,
            start: 0
        }
    });

    if (chapResp.ok) {
        var chapDoc = Html.parse(chapResp.text());
        var chapEls = chapDoc.select("li.chapter-name a");
        for (var i = 0; i < chapEls.length; i++) {
            var href = chapEls[i].href || chapEls[i].attr("href") || chapEls[i].attr("data-href");
            chapters.push({
                title: chapEls[i].text,
                url: href
            });
        }
    }

    return Response.success({
        title: titleEl ? titleEl.text : "",
        author: authorEl ? authorEl.text : "",
        description: descEl ? Html.clean(descEl.html) : "",
        coverUrl: coverEl ? coverEl.attr("src") : "",
        chapters: chapters
    });
}

function getChapterContent(chapterUrl) {
    var url = chapterUrl.startsWith("http") ? chapterUrl : BASE_URL + chapterUrl;
    var resp = fetch(url);
    if (!resp.ok) return Response.error("Fetch failed");

    var htmlStr = resp.text();
    var doc = Html.parse(htmlStr);

    var parts = doc.select(".chapter-part");
    var content = "";

    if (parts.length === 0) {
        var bodyEl = doc.selectFirst("div#bookContentBody");
        if (bodyEl) {
            content = bodyEl.html;
        } else {
            return Response.error("Content not found");
        }
    } else {
        var signKeyMatch = htmlStr.match(/signKey\s*=\s*"(.*?)";/);
        var signKey = signKeyMatch ? signKeyMatch[1] : "";
        var fuzzySignMatch = htmlStr.match(/function fuzzySign[\s\S]*?}/);
        if (fuzzySignMatch) eval(fuzzySignMatch[0]);

        for (var i = 0; i < parts.length / 2; i++) { // Wikidich usually duplicates parts by printing it twice
            var elHtml = Html.parse(parts[i].html);
            // Wait, we need the attributes from the raw element or parseHtml output
            // parseHtml(...) returns {attr:...}. Let's assume we mapped it. 
            // VBook bridge provides `attr()` function, which I replaced with direct map mapping `href` and `src`.
            // BUT my new ExtensionBridge `__parseHtml` didn't map `data-id` or custom attrs!
            // Wait! My `__parseHtml` returned: `mapOf("text", "html", "href", "src")`.
            // Ah! I cannot get `data-id`!!! I must use Regex directly on `parts[i].html`.
            var phtml = parts[i].html;
            var dataIdMatch = phtml.match(/data-id="(.*?)"/);
            var dataTypeMatch = phtml.match(/data-type="(.*?)"/);
            var dataPnMatch = phtml.match(/data-pn="(.*?)"/);

            if (dataIdMatch && dataTypeMatch && dataPnMatch) {
                var cId = dataIdMatch[1];
                var cType = dataTypeMatch[1];
                var cPn = dataPnMatch[1];

                var partResp = fetch(BASE_URL + "/chapters/part", {
                    method: "POST",
                    body: {
                        id: cId,
                        type: cType,
                        pn: cPn,
                        en: false,
                        signKey: signKey,
                        sign: signFunc(fuzzySign(signKey + cType + cPn + "false"))
                    }
                });

                if (partResp.ok) {
                    var json = partResp.json();
                    if (json && json.data) {
                        content += json.data.content + "<br/><br/>";
                    }
                }
            }
        }
    }

    var cleaned = Html.clean(content);

    if (typeof cleanVietnameseAds === "function") cleaned = cleanVietnameseAds(cleaned);
    if (typeof normalizeText === "function") cleaned = normalizeText(cleaned);

    return Response.success({
        title: "",
        content: cleaned
    });
}
