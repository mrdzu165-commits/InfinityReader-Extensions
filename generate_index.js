const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const indexFile = path.join(rootDir, 'index.json');
const extensions = [];

// Get all directories
const dirs = fs.readdirSync(rootDir).filter(f => fs.statSync(path.join(rootDir, f)).isDirectory() && !f.startsWith('.'));

for (const dir of dirs) {
    const manifestPath = path.join(rootDir, dir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            // Build index item
            extensions.push({
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                path: `${dir}/`
            });
            console.log(`Added ${manifest.name} v${manifest.version}`);
        } catch (e) {
            console.error(`Error parsing ${manifestPath}:`, e.message);
        }
    }
}

const indexContent = JSON.stringify({ extensions }, null, 4);
fs.writeFileSync(indexFile, indexContent, 'utf8');
console.log(`Successfully generated ${indexFile} with ${extensions.length} extensions.`);
