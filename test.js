const fs = require('fs');
fetch('https://truyen.tangthuvien.vn/doc-truyen/ngu-y-chu-nhan-cua-nang-ta').then(r => r.text()).then(t => {
    const match = t.match(/href="([^"]+)" title="Đọc truyện"/);
    if (match) {
        let chapterUrl = match[1];
        if (!chapterUrl.startsWith('http')) chapterUrl = 'https://truyen.tangthuvien.vn' + chapterUrl;
        console.log('Fetching', chapterUrl);
        fetch(chapterUrl).then(r2 => r2.text()).then(t2 => {
            let numNewlines = (t2.match(/\n/g) || []).length;
            console.log("Total newlines:", numNewlines);
            let idx = t2.indexOf('box-chap');
            if (idx !== -1) {
                console.log(t2.substring(idx - 60, idx + 100));
            }
        });
    }
});
