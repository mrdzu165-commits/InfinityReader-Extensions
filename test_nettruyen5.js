const fs = require('fs');

async function testNetTruyen() {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

    // 1. Search endpoint
    console.log("Testing search...");
    let sr = await fetch('https://nettruyen.com.vn/ajax.timkiem.php?s=tieu+dinh&trang=1', { headers: { "User-Agent": ua } });
    let st = await sr.text();
    let numMatches = st.match(/class="story-list".*?href="([^"]+)"/g);
    console.log("Search matches:", numMatches ? numMatches.length : 0);

    // 2. Fetch the Book Detail Page directly
    let bUrl = 'https://nettruyen.com.vn/doc-tieu-thu-phong-luu--ta-than-nhat-kiem-17215/';
    console.log("Fetching book:", bUrl);
    let br = await fetch(bUrl, { headers: { "User-Agent": ua } });
    let bt = await br.text();
    fs.writeFileSync('nettruyen_book.html', bt);

    // Check chapter API call from the HTML page
    // The AJAX call uses: ajax.chuong.php?id=&page=1&url=doc-tieu-thu-phong-luu--ta-than-nhat-kiem-17215&loai=truyendich  or truyencv
    // I need to see what `url` is in ajax.chuong.php. It's the slug of the book.
    let loai = bt.includes('loai=truyencv') ? 'truyencv' : 'truyendich';
    let chuongUrl = `https://nettruyen.com.vn/ajax.chuong.php?id=&page=1&url=doc-tieu-thu-phong-luu--ta-than-nhat-kiem-17215&loai=${loai}`;
    console.log("Fetching chapters:", chuongUrl);
    let cr = await fetch(chuongUrl, { headers: { "User-Agent": ua } });
    let ct = await cr.text();

    let chaps = ct.match(/href="([^"]+)"[^>]*title="[^"]+"[^>]*class="mt-action-btn"/g);
    // If not found, use a simpler match
    if (!chaps) chaps = ct.match(/href="([^"]+)"[^>]*>Đọc/g);
    console.log("Chapters returned:", chaps ? chaps.length : 0);

    if (chaps && chaps.length > 0) {
        let chapSlug = chaps[0].match(/href="([^"]+)"/)[1];
        let cFull = 'https://nettruyen.com.vn/' + chapSlug;
        console.log("Fetching chapter content:", cFull);
        let chr = await fetch(cFull, { headers: { "User-Agent": ua } });
        let cht = await chr.text();
        fs.writeFileSync('nettruyen_chapter.html', cht);

        // Find content selector
        let pMatch = cht.match(/<div class="content[^>]*>[\s\S]*?<\/div>/);
        console.log("Has content class?:", !!pMatch);
    }
}
testNetTruyen();
