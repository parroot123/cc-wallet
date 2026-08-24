// One-off icon generator for the PWA manifest / apple-touch-icon.
// Run with: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT_DIR = new URL("../public/icons/", import.meta.url);
mkdirSync(OUT_DIR, { recursive: true });

const BG = "#0b0b12";
const RADIUS_RATIO = 0.225; // ~iOS-style squircle approximation

function backgroundSvg(size, radiusRatio = RADIUS_RATIO) {
  const r = size * radiusRatio;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <radialGradient id="g" cx="20%" cy="15%" r="90%">
          <stop offset="0%" stop-color="#241a3d"/>
          <stop offset="55%" stop-color="${BG}"/>
          <stop offset="100%" stop-color="#08080d"/>
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>
    </svg>`
  );
}

async function makeIcon({ size, out, markScale = 0.58, radiusRatio = RADIUS_RATIO }) {
  const markSize = Math.round(size * markScale);
  const mark = await sharp(fileURLToPath(new URL("../public/favicon.svg", import.meta.url)))
    .resize(markSize, markSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp(backgroundSvg(size, radiusRatio))
    .composite([
      {
        input: mark,
        left: Math.round((size - markSize) / 2),
        top: Math.round((size - markSize) / 2 - size * 0.01),
      },
    ])
    .png()
    .toFile(fileURLToPath(new URL(out, OUT_DIR)));
}

await Promise.all([
  makeIcon({ size: 180, out: "apple-touch-icon.png", radiusRatio: 0 }), // iOS applies its own mask
  makeIcon({ size: 192, out: "icon-192.png" }),
  makeIcon({ size: 512, out: "icon-512.png" }),
  makeIcon({ size: 512, out: "icon-512-maskable.png", markScale: 0.42 }), // extra safe padding for maskable
  makeIcon({ size: 32, out: "favicon-32.png" }),
]);

console.log("Icons generated in public/icons/");
