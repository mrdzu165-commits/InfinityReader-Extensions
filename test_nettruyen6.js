const fs = require('fs');

async function run() {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    let url = 'https://nettruyen.com.vn/doc-truyen-yeu-xa-hai-ngan-cay-so-57775/';
    let r = await fetch(url, { headers: { "User-Agent": ua } });
    let html = await r.text();
    fs.writeFileSync('detail.html', html);

    // Get title
    let tMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    console.log("Title:", tMatch ? tMatch[1] : "none");

    // Check script var for ajax. chuongArray
    const arr = html.match(/var chuongArray = \[(.*?)\];/s);
    if (arr) {
        console.log("Found chuongArray, size bytes:", arr[1].length);
        let items = arr[1].split('","');
        console.log("Num chapters:", items.length);

        let firstChapMatch = arr[1].match(/href="([^"]+)"/);
        if (firstChapMatch) {
            let chapUrl = firstChapMatch[1];
            if (!chapUrl.startsWith('http')) chapUrl = "https://nettruyen.com.vn" + chapUrl;
            console.log("Fetching chap:", chapUrl);
            let r2 = await fetch(chapUrl, { headers: { "User-Agent": ua } });
            let t2 = await r2.text();
            fs.writeFileSync("chap.html", t2);
            let contentPos = t2.indexOf('noidungchap');
            console.log("noidungchap found at:", contentPos);
            // Search class="noidungchap" or id="noidungchap"?
            let cntMatch = t2.match(/(id|class)="noidungchap"/);
            console.log("Content attribute:", cntMatch ? cntMatch[0] : "none");
        }
    }
}
run();
