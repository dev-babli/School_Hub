#!/usr/bin/env node
/**
 * Strip BOM from ALL source files. Run before npm run dev.
 * Usage: node scripts/fix-encoding.js
 */
const fs = require('fs');
const path = require('path');

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const ROOT = path.join(__dirname, '..');
const EXT = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json'];

let fixed = 0;
function walk(dir) {
  const list = fs.readdirSync(dir);
  for (const name of list) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name !== 'node_modules' && name !== '.next') walk(full);
    } else if (EXT.some((e) => name.endsWith(e))) {
      try {
        const buf = fs.readFileSync(full);
        if (buf.length >= 3 && buf[0] === BOM[0] && buf[1] === BOM[1] && buf[2] === BOM[2]) {
          fs.writeFileSync(full, buf.slice(3), 'utf8');
          console.log('Fixed:', path.relative(ROOT, full));
          fixed++;
        }
      } catch (_) {}
    }
  }
}

walk(path.join(ROOT, 'src'));
['next.config.js', 'tailwind.config.js', 'postcss.config.js'].forEach((name) => {
  const p = path.join(ROOT, name);
  if (!fs.existsSync(p)) return;
  const buf = fs.readFileSync(p);
  if (buf.length >= 3 && buf[0] === BOM[0] && buf[1] === BOM[1] && buf[2] === BOM[2]) {
    fs.writeFileSync(p, buf.slice(3), 'utf8');
    console.log('Fixed:', name);
    fixed++;
  }
});

if (fixed > 0) {
  console.log('\nRemoved BOM from', fixed, 'file(s). Clear .next and restart.');
} else {
  console.log('No BOM found. If error persists, try moving project to C:\\School_Hub (no spaces).');
}
