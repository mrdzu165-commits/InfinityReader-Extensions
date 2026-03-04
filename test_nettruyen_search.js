const fs = require('fs');

async function testSearch() {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    let url = 'https://nettruyen.com.vn/?s=tien+hiep&trang=1';
    console.log("Fetching search:", url);
    let r = await fetch(url, { headers: { "User-Agent": ua } });
    let html = await r.text();
    fs.writeFileSync('nettruyen_search.html', html);
    console.log("Wrote search html, size:", html.length);

    // Check titles:
    let matches = html.matchAll(/class="story-list"[\s\S]*?class="title"[^>]*><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
    let c = 0;
    for (let m of matches) {
        console.log("Found:", m[2], m[1]);
        c++;
    }
    console.log("Total matches:", c);
}
testSearch();
