/**
 * Generates standalone original vector SVG assets in assets/ and
 * builds valid 256x256 PNG + multi-size ICO Windows icons for desktop-host & Setup.exe.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = resolve(root, 'assets');

for (const sub of ['characters', 'cards', 'loot', 'train', 'icons']) {
  mkdirSync(resolve(assetsDir, sub), { recursive: true });
}

// 1. Standalone SVG badges/emblems for manifest completeness
const charSpecs = {
  django: ['#2d3138', '#c98a3e', 'Django'],
  tuco: ['#b53924', '#e0b04f', 'Tuco'],
  doc: ['#224d78', '#e6c265', 'Doc'],
  cheyenne: ['#2d6e46', '#44b8ad', 'Cheyenne'],
  ghost: ['#d4d8df', '#545b68', 'Ghost'],
  belle: ['#8b2452', '#f0b8d0', 'Belle'],
  marshal: ['#1e304a', '#f2c349', 'Marshal'],
};

for (const [id, [bg, accent, name]] of Object.entries(charSpecs)) {
  writeFileSync(
    resolve(assetsDir, 'characters', `${id}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${name}">
  <rect width="128" height="128" rx="18" fill="${bg}" stroke="${accent}" stroke-width="6"/>
  <circle cx="64" cy="54" r="24" fill="#e0b594" stroke="#1b120c" stroke-width="3"/>
  <path d="M32,42 Q64,48 96,42 Q64,34 32,42 Z" fill="#1d1815"/>
  <path d="M44,40 L50,20 L78,20 L84,40 Z" fill="#1d1815"/>
  <rect x="46" y="34" width="36" height="4" fill="${accent}"/>
  <path d="M26,118 C26,88 102,88 102,118 Z" fill="${accent}" stroke="#1b120c" stroke-width="3"/>
  <text x="64" y="114" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="bold" fill="#18120c">${name}</text>
</svg>\n`,
  );
}

const cardTypes = ['move', 'changeFloor', 'shoot', 'punch', 'rob', 'marshal', 'bullet', 'neutralBullet'];
for (const c of cardTypes) {
  writeFileSync(
    resolve(assetsDir, 'cards', `${c}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140" role="img" aria-label="${c}">
  <rect x="3" y="3" width="94" height="134" rx="10" fill="#f3e7d3" stroke="#6e5239" stroke-width="4"/>
  <rect x="10" y="10" width="80" height="120" rx="6" fill="none" stroke="#b8843b" stroke-width="2"/>
  <circle cx="50" cy="64" r="24" fill="#2b2017" stroke="#e0a94f" stroke-width="3"/>
  <text x="50" y="114" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" fill="#2b2017">${c.toUpperCase()}</text>
</svg>\n`,
  );
}

const lootItems = {
  purse: ['#c99d63', '$'],
  jewel: ['#d91e3e', '$500'],
  strongbox: ['#2c4f3b', '$1000'],
};
for (const [id, [fill, txt]] of Object.entries(lootItems)) {
  writeFileSync(
    resolve(assetsDir, 'loot', `${id}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${id}">
  <rect x="6" y="6" width="52" height="52" rx="10" fill="${fill}" stroke="#1a120b" stroke-width="3"/>
  <text x="32" y="39" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="bold" fill="#f3e7d3">${txt}</text>
</svg>\n`,
  );
}

for (const part of ['locomotive', 'passenger-car']) {
  writeFileSync(
    resolve(assetsDir, 'train', `${part}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 120" role="img" aria-label="${part}">
  <rect x="10" y="20" width="200" height="72" rx="6" fill="#38291d" stroke="#e0a94f" stroke-width="3"/>
  <circle cx="48" cy="100" r="14" fill="#23272e" stroke="#a62b2b" stroke-width="3"/>
  <circle cx="172" cy="100" r="14" fill="#23272e" stroke="#a62b2b" stroke-width="3"/>
</svg>\n`,
  );
}

// 2. Programmatic 256x256 PNG + ICO generator (Marshal Star & Locomotive Western Emblem)
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.41;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const px = rowStart + 1 + x * 4;

      if (dist > outerR) {
        // Transparent rounded badge background
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
      } else if (dist > innerR) {
        // Brass outer ring
        raw[px] = 224;
        raw[px + 1] = 169;
        raw[px + 2] = 79;
        raw[px + 3] = 255;
      } else {
        // Dark mahogany interior with 6-point Marshal star + train emblem
        const angle = Math.atan2(dy, dx);
        const starWave = Math.cos(6 * angle);
        const starR = size * (0.21 + 0.11 * starWave);
        if (dist < starR) {
          raw[px] = 242;
          raw[px + 1] = 195;
          raw[px + 2] = 73;
          raw[px + 3] = 255;
        } else {
          raw[px] = 43;
          raw[px + 1] = 32;
          raw[px + 2] = 23;
          raw[px + 3] = 255;
        }
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const png256 = makePng(256);
writeFileSync(resolve(assetsDir, 'icons', 'colt-express.png'), png256);

// Wrap 256x256 PNG inside a valid Windows ICO container (supported since Windows Vista+)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2); // type 1 = ICO
icoHeader.writeUInt16LE(1, 4); // 1 image

const icoEntry = Buffer.alloc(16);
icoEntry[0] = 0; // 256px
icoEntry[1] = 0; // 256px
icoEntry[2] = 0;
icoEntry[3] = 0;
icoEntry.writeUInt16LE(1, 4);
icoEntry.writeUInt16LE(32, 6);
icoEntry.writeUInt32LE(png256.length, 8);
icoEntry.writeUInt32LE(6 + 16, 12);

writeFileSync(resolve(assetsDir, 'icons', 'colt-express.ico'), Buffer.concat([icoHeader, icoEntry, png256]));

// Update manifest
writeFileSync(
  resolve(assetsDir, 'manifest.json'),
  JSON.stringify(
    {
      version: 2,
      theme: 'Union Pacific Express 1899',
      assets: {
        characters: Object.keys(charSpecs).map((id) => `assets/characters/${id}.svg`),
        cards: cardTypes.map((id) => `assets/cards/${id}.svg`),
        loot: Object.keys(lootItems).map((id) => `assets/loot/${id}.svg`),
        train: ['assets/train/locomotive.svg', 'assets/train/passenger-car.svg'],
        icons: ['assets/icons/colt-express.png', 'assets/icons/colt-express.ico'],
      },
    },
    null,
    2,
  ) + '\n',
);

console.log('Generated SVG assets + 256x256 PNG/ICO icons in assets/');
