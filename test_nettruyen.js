const fs = require('fs');

async function checkNetTruyen() {
    try {
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
        let r = await fetch('https://nettruyen.com.vn/', { headers: { "User-Agent": ua } });
        let html = await r.text();
        fs.writeFileSync('nettruyen_home.html', html);
        console.log("Status:", r.status);

        // Find categories
        let catMatches = html.match(/href="([^"]+)">([^<]+)<\/a>/g);
        if (catMatches) {
            console.log("Total links:", catMatches.length);
        }

    } catch (e) {
        console.error(e);
    }
}
checkNetTruyen();
