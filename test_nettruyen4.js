const fs = require('fs');

async function checkNetTruyen() {
    try {
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
        let urlsToTest = [
            'https://nettruyen.com.vn/ajax.cate.php?trang=1&loai=truyencv&cate=new&theloai=',
            'https://nettruyen.com.vn/ajax.timkiem.php?s=linh&trang=1',
        ];

        for (let url of urlsToTest) {
            console.log("Fetching:", url);
            let r = await fetch(url, { headers: { "User-Agent": ua } });
            let t = await r.text();
            let matches = t.match(/class="story-list".*?title="([^"]+)".*?href="([^"]+)"/g);
            console.log("Matches:", matches ? matches.length : 0);
            if (matches && matches.length > 0) {
                fs.writeFileSync('nettruyen_books.html', t);
                let firstBookUrl = t.match(/class="story-list".*?title="([^"]+)".*?href="([^"]+)"/)[2];
                console.log("Book URL:", firstBookUrl);

                let bRes = await fetch(firstBookUrl, { headers: { "User-Agent": ua } });
                let bText = await bRes.text();
                fs.writeFileSync('book_detail.html', bText);
                return; // Stop after first success
            }
        }
    } catch (e) {
        console.error(e);
    }
}
checkNetTruyen();
