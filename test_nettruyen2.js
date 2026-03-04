const fs = require('fs');

async function testFetch() {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    // 1. Fetch List
    let r1 = await fetch('https://nettruyen.com.vn/xem-nhieu/', { headers: { "User-Agent": ua } });
    let t1 = await r1.text();
    fs.writeFileSync('nettruyen_list.html', t1);

    // Check regex for list items
    let listMatches = t1.match(/class="story-list".*?href="([^"]+)" title="([^"]+)"/g);
    console.log("List matches:", listMatches ? listMatches.length : 0);

    let bookUrl = t1.match(/class="story-list".*?href="([^"]+)"/)[1];

    // 2. Fetch Detail
    console.log("Book URL:", bookUrl);
    let r2 = await fetch(bookUrl, { headers: { "User-Agent": ua } });
    let t2 = await r2.text();
    fs.writeFileSync('nettruyen_detail.html', t2);

    // Check pagination logic in JS
    let chapUrlMatches = t2.match(/href="([^"]+)" title="[^"]+"><i class="fa1-angle-down/);
    if (!chapUrlMatches) chapUrlMatches = t2.match(/href="([^"]+)"[^>]*>Đọc/);
    if (chapUrlMatches) console.log("First chap URL:", chapUrlMatches[1]);

    // Note: dtruyen / webtruyen clones usually use ajax to load chapters or just have them in list
}
testFetch();
