/*
This script generates Firefox version of the extension and packs Chrome and Firefox versions to zip files.
Node.js v16.6.1 recommended.
*/

const fsp = require('fs').promises;
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

async function copyDir(src, dest) {
    const entries = await fsp.readdir(src, { withFileTypes: true });
    await fsp.mkdir(dest);
    for (let entry of entries) {
        if(entry.name === '.git' || entry.name === '.github' || entry.name === '_metadata' || entry.name === 'build') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fsp.copyFile(srcPath, destPath);
        }
    }
}

if(!fs.existsSync('./build')) {
    fs.mkdirSync('./build');
}

if(fs.existsSync('./build/chrome')) {
    fs.rmSync('./build/chrome', { recursive: true });
}
if(fs.existsSync('./build/firefox')) {
    fs.rmSync('./build/firefox', { recursive: true });
}

console.log("Copying...");
copyDir('./', './build/firefox').then(async () => {
    await copyDir('./', './build/chrome');
    console.log("Copied!");
    console.log("Patching...");

    let manifest = JSON.parse(await fsp.readFile('./build/chrome/manifest.json', 'utf8'));
    manifest.manifest_version = 2;
    manifest.permissions.push("webRequest", "webRequestBlocking", ...manifest.host_permissions);
    delete manifest.host_permissions;
    manifest.web_accessible_resources = manifest.web_accessible_resources[0].resources;
    manifest.browser_specific_settings = {
        gecko: {
            id: "yeah@dimden.dev",
            strict_min_version: "101.0"
        },
        gecko_android: {
            strict_min_version: "101.0"
        }
    };

    fs.writeFileSync('./build/firefox/manifest.json', JSON.stringify(manifest, null, 2));
    fs.unlinkSync('./build/firefox/pack.js');
    fs.unlinkSync('./build/chrome/pack.js');
    fs.unlinkSync('./build/firefox/.gitignore');
    fs.unlinkSync('./build/chrome/.gitignore');

    console.log("Patched!");
    if (fs.existsSync('./build/firefox.zip')) {
        console.log("Deleting old zip...");
        fs.unlinkSync('./build/firefox.zip');
        console.log("Deleted old zip!");
    }
    console.log("Zipping Firefox version...");
    try {
        const zip = new AdmZip();
        const outputDir = "./build/firefox.zip";
        zip.addLocalFolder("./build/firefox");
        zip.writeZip(outputDir);
    } catch (e) {
        console.log(`Something went wrong ${e}`);
    }
    if (fs.existsSync('./build/chrome.zip')) {
        console.log("Deleting old zip...");
        fs.unlinkSync('./build/chrome.zip');
        console.log("Deleted old zip!");
    }
    console.log("Zipping Chrome version...");
    try {
        const zip = new AdmZip();
        const outputDir = "./build/chrome.zip";
        zip.addLocalFolder("./build/chrome");
        zip.writeZip(outputDir);
    } catch (e) {
        console.log(`Something went wrong ${e}`);
    }
    console.log("Zipped!");
    console.log("Deleting temporary folders...");
    fs.rmSync('./build/chrome', { recursive: true });
    fs.rmSync('./build/firefox', { recursive: true });
    console.log("Deleted!");
});
