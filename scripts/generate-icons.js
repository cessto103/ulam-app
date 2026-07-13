/**
 * uLam icon generator — run with: node scripts/generate-icons.js
 *
 * Generates:
 *   assets/icon.png              (1024×1024, iOS / Android)
 *   assets/splash-icon.png       (512×512, splash center image)
 *   assets/android-icon-foreground.png  (1024×1024, foreground layer)
 *
 * Requires: npm install --save-dev sharp
 */

const path = require('path');
const fs   = require('fs');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('❌  sharp not found. Run: npm install --save-dev sharp');
  process.exit(1);
}

const ASSETS = path.resolve(__dirname, '..', 'assets');

// ─── SVG template ─────────────────────────────────────────────────────────────
// Renders the uLam icon at any size. The viewBox is 142×142.

function iconSvg(size) {
  const s = size / 142;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 142 142">
  <!-- Green rounded bg -->
  <rect x="0" y="0" width="142" height="142" rx="32" ry="32" fill="#1E6E47"/>
  <!-- Bowl shadow -->
  <ellipse cx="71" cy="103" rx="42" ry="7" fill="#14523A" opacity="0.5"/>
  <!-- Bowl body -->
  <ellipse cx="71" cy="88" rx="42" ry="28" fill="#F5F0E8"/>
  <!-- Bowl rim -->
  <ellipse cx="71" cy="65" rx="42" ry="11" fill="#EDE7D6"/>
  <!-- Bowl inner -->
  <ellipse cx="71" cy="65" rx="34" ry="8" fill="#F5F0E8"/>
  <!-- Soup surface -->
  <ellipse cx="71" cy="65" rx="30" ry="6.5" fill="#C8E6C9"/>
  <!-- Steam wisps -->
  <path d="M57 52 Q55 42 58 35 Q61 28 59 20" stroke="#A8DFD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M71 50 Q69 40 72 33 Q75 26 73 18" stroke="#A8DFD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M85 52 Q83 42 86 35 Q89 28 87 20" stroke="#A8DFD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Peso coin -->
  <circle cx="71" cy="65" r="12" fill="white" opacity="0.9"/>
  <circle cx="71" cy="65" r="9" fill="#1E6E47"/>
  <text x="71" y="70" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="Arial">₱</text>
</svg>`;
}

// ─── Wordmark SVG for splash ───────────────────────────────────────────────────

function splashSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <!-- Icon centered -->
  <g transform="translate(185, 120)">
    <rect x="0" y="0" width="142" height="142" rx="32" ry="32" fill="white"/>
    <ellipse cx="71" cy="103" rx="42" ry="7" fill="#14523A" opacity="0.4"/>
    <ellipse cx="71" cy="88" rx="42" ry="28" fill="#F5F0E8"/>
    <ellipse cx="71" cy="65" rx="42" ry="11" fill="#EDE7D6"/>
    <ellipse cx="71" cy="65" rx="34" ry="8" fill="#F5F0E8"/>
    <ellipse cx="71" cy="65" rx="30" ry="6.5" fill="#A8DFD0"/>
    <path d="M57 52 Q55 42 58 35 Q61 28 59 20" stroke="#A8DFD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M71 50 Q69 40 72 33 Q75 26 73 18" stroke="#A8DFD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M85 52 Q83 42 86 35 Q89 28 87 20" stroke="#A8DFD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="71" cy="65" r="12" fill="white" opacity="0.9"/>
    <circle cx="71" cy="65" r="9" fill="#1E6E47"/>
    <text x="71" y="70" text-anchor="middle" font-size="11" font-weight="bold" fill="white" font-family="Arial">₱</text>
  </g>
  <!-- Wordmark -->
  <text x="256" y="310" text-anchor="middle" font-size="56" font-weight="900" fill="#14130C" font-family="Arial Black, Arial">u</text>
  <text x="290" y="310" text-anchor="start" font-size="56" font-weight="900" fill="white" font-family="Arial Black, Arial">Lam</text>
  <!-- Tagline -->
  <text x="256" y="345" text-anchor="middle" font-size="18" fill="rgba(255,255,255,0.7)" font-family="Arial">Eat well. Save more.</text>
</svg>`;
}

async function generate() {
  console.log('🎨  Generating uLam icons…');

  const sizes = [
    { file: 'icon.png',                     svg: iconSvg(1024),    w: 1024 },
    { file: 'splash-icon.png',              svg: splashSvg(512),   w: 512  },
    { file: 'android-icon-foreground.png',  svg: iconSvg(1024),    w: 1024 },
  ];

  for (const { file, svg, w } of sizes) {
    const outPath = path.join(ASSETS, file);
    await sharp(Buffer.from(svg))
      .resize(w, w)
      .png()
      .toFile(outPath);
    console.log(`  ✅  ${file}`);
  }

  // Solid green background for adaptive icon
  const bgPath = path.join(ASSETS, 'android-icon-background.png');
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 30, g: 110, b: 71, alpha: 1 } },
  }).png().toFile(bgPath);
  console.log('  ✅  android-icon-background.png');

  console.log('\n✅  Done! Run `npx expo start --clear` to see changes.');
}

generate().catch((err) => { console.error(err); process.exit(1); });
