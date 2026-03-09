#!/usr/bin/env node
/**
 * Diagnose layout chunk error. Builds the app, locates layout chunk, and inspects
 * content around the error line for bad escapes (e.g. Windows paths).
 * Usage: node scripts/diagnose-layout-error.js [lineNumber]
 * Default lineNumber: 755 (Next 14) or pass e.g. 1756 for Next 15
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CHUNKS_DIR = path.join(ROOT, '.next', 'static', 'chunks');
const LINE = parseInt(process.argv[2] || '755', 10);
const WINDOW = 5;

function findAllJsChunks(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      files.push(...findAllJsChunks(full));
    } else if (name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

function findLayoutChunks(dir) {
  const all = findAllJsChunks(dir);
  const byContent = all.filter((f) => {
    try {
      const c = fs.readFileSync(f, 'utf8');
      return c.includes('AppWrappers') || c.includes('DM_Sans');
    } catch {
      return false;
    }
  });
  if (byContent.length > 0) return byContent;
  const byName = all.filter((f) => path.basename(f).includes('layout'));
  return byName.length > 0 ? byName : all.slice(0, 5);
}

function linesAround(content, targetLine, window) {
  const lines = content.split(/\r?\n/);
  const start = Math.max(0, targetLine - window);
  const end = Math.min(lines.length, targetLine + window);
  return lines.slice(start, end).map((l, i) => {
    const num = start + i + 1;
    const mark = num === targetLine ? ' >>> ' : '     ';
    return `${mark}${num}: ${l}`;
  });
}

function hexDumpAround(content, byteOffset, bytes) {
  const buf = Buffer.from(content, 'utf8');
  const start = Math.max(0, byteOffset - bytes);
  const slice = buf.slice(start, start + bytes * 2);
  let out = '';
  for (let i = 0; i < slice.length; i += 16) {
    const row = slice.slice(i, i + 16);
    const hex = row.toString('hex').match(/.{1,2}/g)?.join(' ') || '';
    const ascii = row.toString('ascii').replace(/[^\x20-\x7e]/g, '.');
    out += `${(start + i).toString(16).padStart(6, '0')}  ${hex.padEnd(48, ' ')}  ${ascii}\n`;
  }
  return out;
}

function main() {
  console.log('Running next build...');
  try {
    execSync('next build', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('Build failed.');
    process.exit(1);
  }

  const chunks = findLayoutChunks(CHUNKS_DIR);
  if (chunks.length === 0) {
    console.log('No layout/app chunks found in', CHUNKS_DIR);
    return;
  }

  console.log('\nFound', chunks.length, 'candidate chunk(s).\n');

  for (const file of chunks) {
    const content = fs.readFileSync(file, 'utf8');
    const lineCount = content.split(/\r?\n/).length;
    if (lineCount < LINE) continue;

    const rel = path.relative(ROOT, file);
    console.log('---', rel, '---');
    console.log('Lines around', LINE, ':');
    console.log(linesAround(content, LINE, WINDOW).join('\n'));
    console.log('');

    const lineStarts = content.split(/\r?\n/).reduce((acc, l) => {
      acc.push((acc[acc.length - 1] || 0) + (l.length + 1));
      return acc;
    }, [0]);
    const byteAtLine = lineStarts[LINE - 1] || 0;
    console.log('Hex dump around line', LINE, '(offset', byteAtLine, '):');
    console.log(hexDumpAround(content, byteAtLine, 64));
    console.log('');

    const badEscapes = content.match(/\\[A-Za-z]/g);
    if (badEscapes) {
      const uniq = [...new Set(badEscapes)];
      console.log('Potential bad escapes found:', uniq.join(', '));
    }
  }
}

main();
