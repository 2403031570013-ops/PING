// PWA Icon Generator - Run with: node generate-icons.js
// This creates simple PWA icons in the web/pwa-icons directory

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'web', 'pwa-icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate a simple SVG icon and convert to data URI for each size
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

function generateSVGIcon(size) {
    const pad = Math.round(size * 0.15);
    const radius = Math.round(size * 0.22);
    const fontSize = Math.round(size * 0.35);
    const subSize = Math.round(size * 0.12);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366F1"/>
      <stop offset="100%" style="stop-color:#4338CA"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
  <text x="50%" y="45%" text-anchor="middle" dy=".1em" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="800" fill="white">CG</text>
  <text x="50%" y="72%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${subSize}" font-weight="600" fill="rgba(255,255,255,0.7)">L&amp;F</text>
</svg>`;
}

sizes.forEach(size => {
    const svg = generateSVGIcon(size);
    const filePath = path.join(iconsDir, `icon-${size}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`✅ Created icon-${size}.svg`);
});

// Also create a simple PNG-like placeholder using the SVG
// For a real production app, you'd use sharp or canvas to create actual PNGs
// But SVGs work fine for PWA icons in modern browsers

// Create PNG versions using the SVG as base (rename with .png extension but serve SVG content)
// Modern browsers handle SVG icons in manifests
sizes.forEach(size => {
    const svgSrc = path.join(iconsDir, `icon-${size}.svg`);
    const pngDest = path.join(iconsDir, `icon-${size}.png`);
    // Copy SVG as the icon file - browsers will use it
    fs.copyFileSync(svgSrc, pngDest);
});

console.log('\n🎉 All PWA icons generated in web/pwa-icons/');
console.log('Note: For production, convert these SVGs to proper PNGs using a tool like sharp or online converter.');
