const fs = require('fs');

async function testFetchChap() {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    let html = fs.readFileSync('detail.html', 'utf-8');

    // Extract book cover, author, description, genres etc.
    let titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    let title = titleMatch ? titleMatch[1].trim() : "";

    let coverMatch = html.match(/class="img-thumb"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/);
    let coverUrl = coverMatch ? coverMatch[1] : "";

    let authorMatch = html.match(/<strong>Tác giả<\/strong>\s*:\s*([^<]+)<\/div>/);
    let author = authorMatch ? authorMatch[1].trim() : "";

    let descMatch = html.match(/class="noidung[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    let desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '\n').trim() : "";

    let genresMatches = html.matchAll(/title="Thể loại [^"]+" href="[^"]+"><span[^>]*>([^<]+)<\/span>/g);
    let genres = [];
    for (let m of genresMatches) {
        genres.push(m[1].trim());
    }

    console.log("Title:", title);
    console.log("Cover:", coverUrl);
    console.log("Author:", author);
    console.log("Genres:", genres.join(", "));
    console.log("Desc:", desc.substring(0, 100) + "...");

    // Now extract chapters
    let chapsSection = html.match(/id="listchuong"[\s\S]*?<\/ul>/);
    if (!chapsSection) {
        // could be in javascript var chuongArray
        console.log("No listchuong html");
        return;
    }

    let chapMatches = chapsSection[0].matchAll(/href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
    let urls = [];
    for (let m of chapMatches) {
        urls.push({ url: m[1], name: m[2] });
    }
    console.log(`Found ${urls.length} chaps. Sample:`, urls[0]);

    if (urls.length > 0) {
        let slug = urls[0].url;
        let cUrl = slug.startsWith('http') ? slug : (slug.startsWith('/') ? 'https://nettruyen.com.vn' + slug : 'https://nettruyen.com.vn/' + slug);
        console.log("Fetching chapter:", cUrl);
        let cr = await fetch(cUrl, { headers: { "User-Agent": ua } });
        let ct = await cr.text();
        fs.writeFileSync('chap.html', ct);

        let pMatch = ct.match(/class="noidungchap"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<style>/);
        if (!pMatch) {
            pMatch = ct.match(/id="noidungchap"[^>]*>([\s\S]*?)<\/div>/);
        }
        console.log("Content size:", pMatch ? pMatch[1].length : 0);
    }
}
testFetchChap();
