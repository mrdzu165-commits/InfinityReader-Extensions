// Test: fetch a TTV chapter page and dump all class names that contain "chap" or "content"
async function main() {
    // First get a real chapter URL from a book page
    const bookResp = await fetch('https://truyen.tangthuvien.vn/doc-truyen/mang-hoang-ky');
    const bookHtml = await bookResp.text();

    // Find story_id
    let storyIdMatch = bookHtml.match(/story_id[^>]*value="(\d+)"/);
    if (!storyIdMatch) storyIdMatch = bookHtml.match(/story_id\s*[:=]\s*["']?(\d+)["']?/);
    console.log("story_id:", storyIdMatch ? storyIdMatch[1] : "NOT FOUND");

    // Get chapter list
    if (storyIdMatch) {
        const chapResp = await fetch('https://truyen.tangthuvien.vn/story/chapters?story_id=' + storyIdMatch[1]);
        const chapHtml = await chapResp.text();

        // Find first chapter link
        const chapterMatch = chapHtml.match(/href="([^"]+)"/);
        if (chapterMatch) {
            let chapterUrl = chapterMatch[1];
            if (!chapterUrl.startsWith('http')) chapterUrl = 'https://truyen.tangthuvien.vn' + chapterUrl;
            console.log("\nFetching chapter:", chapterUrl);

            const contentResp = await fetch(chapterUrl);
            const contentHtml = await contentResp.text();
            console.log("Page length:", contentHtml.length);

            // Find all class names containing 'chap' or 'content' or 'chapter'
            const classMatches = contentHtml.match(/class="[^"]*(?:chap|chapter|content)[^"]*"/gi);
            if (classMatches) {
                console.log("\n=== Classes containing chap/chapter/content ===");
                const unique = [...new Set(classMatches)];
                unique.forEach(m => console.log(m));
            }

            // Check for box-chap specifically
            const boxChapIdx = contentHtml.indexOf('box-chap');
            if (boxChapIdx !== -1) {
                console.log("\n=== box-chap context ===");
                console.log(contentHtml.substring(boxChapIdx - 100, boxChapIdx + 200));
            }

            // Check for chapter-c specifically  
            const chapterCIdx = contentHtml.indexOf('chapter-c');
            if (chapterCIdx !== -1) {
                console.log("\n=== chapter-c context ===");
                console.log(contentHtml.substring(chapterCIdx - 100, chapterCIdx + 200));
            }

            // Check what's right after the chapter title
            const chapterTitleIdx = contentHtml.indexOf('chap-title');
            if (chapterTitleIdx !== -1) {
                console.log("\n=== chap-title context ===");
                console.log(contentHtml.substring(chapterTitleIdx - 50, chapterTitleIdx + 500));
            }
        }
    }
}

main().catch(console.error);
