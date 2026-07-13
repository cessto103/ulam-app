const fs = require('node:fs');

const packageVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
const appVersion = JSON.parse(fs.readFileSync('app.json', 'utf8')).expo.version;

if (packageVersion !== appVersion) {
  console.error(`Version mismatch: package.json=${packageVersion}, app.json=${appVersion}`);
  process.exit(1);
}

console.log(`Version metadata is consistent (${appVersion}).`);
