const fs = require('fs');
async function run() {
    let r = await fetch('https://nettruyen.com.vn/the-loai/tien-hiep.html');
    let h = await r.text();
    fs.writeFileSync('nettruyen_cate.html', h);
    console.log("Wrote", h.length);
}
run();
