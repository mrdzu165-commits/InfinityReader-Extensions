const fs = require('fs');

async function testMobile() {
    const ua = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36";
    // Get chapter list
    let r = await fetch('https://truyen.tangthuvien.vn/doc-truyen/mang-hoang-ky', { headers: { "User-Agent": ua } });
    let t = await r.text();
    let match = t.match(/story_id[^>]*value="(\d+)"/) || t.match(/story_id\s*[:=]\s*["']?(\d+)["']?/);
    let storyId = match ? match[1] : null;

    let r2 = await fetch('https://truyen.tangthuvien.vn/story/chapters?story_id=' + storyId, { headers: { "User-Agent": ua } });
    let t2 = await r2.text();

    let chapMatch = t2.match(/href="([^"]+)"/);
    let chapterUrl = chapMatch[1].trim();
    if (!chapterUrl.startsWith('http')) {
        chapterUrl = 'https://truyen.tangthuvien.vn' + (chapterUrl.startsWith('/') ? '' : '/') + chapterUrl;
    }

    console.log("Fetching chapter:", chapterUrl);
    let r3 = await fetch(chapterUrl, { headers: { "User-Agent": ua } });
    let t3 = await r3.text();

    fs.writeFileSync('mobile_chap.html', t3);

    let boxChap = t3.indexOf('box-chap');
    let chapterC = t3.indexOf('chapter-c');
    let chapterCContent = t3.indexOf('chapter-c-content');

    console.log("box-chap:", boxChap, "chapter-c:", chapterC, "chapter-c-content:", chapterCContent);

    // Check mobile div
    let mobileClass = t3.match(/class="[^"]*(content)[^"]*"/gi);
    if (mobileClass) {
        let unique = [...new Set(mobileClass)];
        console.log("Classes:", unique.join(", "));
    }
}
testMobile();
