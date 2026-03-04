const fs = require('fs');

async function testApi() {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    // Fetch via api?
    let r1 = await fetch('https://nettruyen.com.vn/ajax.cate.php?trang=1&loai=truyendich&cate=new&theloai=', { headers: { "User-Agent": ua } });
    let t1 = await r1.text();
    fs.writeFileSync('nettruyen_ajax.html', t1);

    // Check if it's html or json
    let books = t1.match(/<li[^>]*>[\s\S]*?<\/li>/g);
    console.log("Books found via AJAX:", books ? books.length : 0);

    // Also try to find story list class in home page
    let home = fs.readFileSync('nettruyen_home.html', 'utf-8');
    let storyListMatches = home.match(/class="story-list".*?href="([^"]+)"/g);
    if (storyListMatches) {
        console.log("Books in home page:", storyListMatches.length);
        console.log("Sample URL:", storyListMatches[0].match(/href="([^"]+)"/)[1]);
    } else {
        console.log("No story-list found in home page.");
    }
}
testApi();
