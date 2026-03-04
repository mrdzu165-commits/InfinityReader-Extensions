const fs = require('fs');
let index = JSON.parse(fs.readFileSync('index.json', 'utf8'));

// Check if nettruyen already exists
let exists = false;
for (let ext of index.extensions) {
    if (ext.id === 'nettruyen_v1' || ext.id === 'nettruyen') {
        exists = true;
        break;
    }
}

if (!exists) {
    index.extensions.push({
        "id": "nettruyen_v1",
        "name": "NetTruyen",
        "version": 1,
        "path": "nettruyen/"
    });
    fs.writeFileSync('index.json', JSON.stringify(index, null, 4));
    console.log("Added nettruyen to index.json");
} else {
    console.log("nettruyen already exists in index.json");
}
