const fs = require('fs');
let html = fs.readFileSync('nettruyen_home.html', 'utf-8');

let matches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/g);
for (let m of matches) {
    if (m[1].includes('the-loai')) {
        console.log(`"${m[2]}": "@filter:${m[1].replace(/^\//, '')}",`);
    } else if (['moi-nhat/', 'xem-nhieu/', 'truyen-full/', 'truyen-dich/', 'truyen-convert/'].includes(m[1])) {
        console.log(`"${m[2]}": "@filter:${m[1]}",`);
    }
}
