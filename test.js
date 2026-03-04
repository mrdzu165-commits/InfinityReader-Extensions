fetch('https://truyen.tangthuvien.vn/doc-truyen/mang-hoang-ky/chuong-1').then(r => r.text()).then(t => {
    let bodyMatch = t.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let body = bodyMatch ? bodyMatch[1] : t;
    console.log("Length of body:", body.length);
    let idxx = body.indexOf('box-chap');
    if (idxx !== -1) {
        console.log("-- box-chap:");
        console.log(body.substring(idxx - 50, idxx + 1500));
    } else {
        console.log("-- no box-chap");
        let idx2 = body.indexOf('chapter-c');
        if (idx2 !== -1) {
            console.log("-- chapter-c:");
            console.log(body.substring(idx2 - 150, idx2 + 1500));
        } else {
            console.log("-- no chapter-c, searching for content div");
            let idx3 = body.indexOf('content');
            if (idx3 !== -1) console.log(body.substring(idx3, idx3 + 500));
        }
    }
});
