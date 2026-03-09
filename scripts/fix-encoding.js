#!/usr/bin/env node
/**
 * Strip BOM (Byte Order Mark) from source files.
 * Run before npm run dev if you get "Invalid or unexpected token" in layout.js
 * Usage: node scripts/fix-encoding.js
 */
const fs = require('fs');
const path = require('path');

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const ROOT = path.join(__dirname, '..');

const FILES = [
  'src/app/layout.tsx',
  'src/app/AppWrappers.tsx',
  'src/app/page.tsx',
  'src/styles/globals-tailwind.css',
  'src/styles/App.css',
  'src/styles/Contact.css',
  'src/styles/MiniCalendar.css',
  'src/theme/theme.tsx',
  'src/theme/styles.ts',
];

let fixed = 0;
for (const rel of FILES) {
  const filePath = path.join(ROOT, rel);
  if (!fs.existsSync(filePath)) continue;
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 3 && buf[0] === BOM[0] && buf[1] === BOM[1] && buf[2] === BOM[2]) {
    fs.writeFileSync(filePath, buf.slice(3), 'utf8');
    console.log('Fixed (removed BOM):', rel);
    fixed++;
  }
}
if (fixed > 0) {
  console.log('\nRemoved BOM from', fixed, 'file(s).');
} else {
  console.log('No BOM found. Files are OK.');
}
