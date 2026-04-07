#!/usr/bin/env node
import sharp from 'sharp';
import { existsSync } from 'fs';
import path from 'path';

const SOURCE = process.argv[2] || 'public/icon-source.png';
const OUT_DIR = 'public';

if (!existsSync(SOURCE)) {
  console.error(`Source image not found: ${SOURCE}`);
  console.error('Usage: node scripts/generate-icons.mjs <path-to-source-image>');
  process.exit(1);
}

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
];

for (const { name, size } of sizes) {
  const outPath = path.join(OUT_DIR, name);
  await sharp(SOURCE)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath} (${size}x${size})`);
}

console.log('\nDone! Icons generated in public/');
