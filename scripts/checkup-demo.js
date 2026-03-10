#!/usr/bin/env node
/**
 * POC Demo Checkup - Verify everything is ready before the demo.
 * Run: node scripts/checkup-demo.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POC = path.join(ROOT, 'face-recognition-poc');
const WARN_ONLY = process.argv.includes('--warn-only');

const ok = (msg) => console.log('  \x1b[32m✓\x1b[0m', msg);
const fail = (msg) => console.log('  \x1b[31m✗\x1b[0m', msg);
const warn = (msg) => console.log('  \x1b[33m!\x1b[0m', msg);
const section = (title) => console.log('\n\x1b[1m' + title + '\x1b[0m');

let hasFail = false;

function check(name, condition) {
  if (condition) ok(name);
  else {
    fail(name);
    hasFail = true;
  }
}

function checkFile(path, desc) {
  const exists = fs.existsSync(path);
  check(desc, exists);
  return exists;
}

section('1. Camera config');
const cameraConfigPath = path.join(POC, 'camera_config.json');
if (checkFile(cameraConfigPath, 'camera_config.json exists')) {
  try {
    const cfg = JSON.parse(fs.readFileSync(cameraConfigPath, 'utf8'));
    const vs = cfg?.video_source;
    const valid = vs && (vs.includes('rtsp://') || vs.includes('http://') || vs === 0);
    check('video_source set (rtsp/http URL)', valid);
    if (valid && typeof vs === 'string' && vs.includes('192.168.0.115')) {
      warn('Camera IP may be old (192.168.0.115). Update if camera IP changed.');
    }
  } catch (e) {
    fail('camera_config.json invalid: ' + (e.message || e));
    hasFail = true;
  }
}

section('2. Twilio (WhatsApp)');
const envPath = path.join(ROOT, '.env.local');
if (checkFile(envPath, '.env.local exists')) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const hasSid = /TWILIO_ACCOUNT_SID\s*=\s*\S+/.test(content);
    const hasToken = /TWILIO_AUTH_TOKEN\s*=\s*\S+/.test(content);
    check('TWILIO_ACCOUNT_SID set', hasSid);
    check('TWILIO_AUTH_TOKEN set', hasToken);
  } catch {
    fail('.env.local not readable');
    hasFail = true;
  }
} else {
  check('.env.local exists', false);
}

section('3. Students & faces');
const studentsPath = path.join(POC, 'students.csv');
if (checkFile(studentsPath, 'students.csv exists')) {
  try {
    const content = fs.readFileSync(studentsPath, 'utf8');
    const lines = content.trim().split(/\r?\n/).filter((l) => l.trim());
    const hasData = lines.length >= 2; // header + at least 1 row
    check('students.csv has at least 1 student', hasData);
    if (!hasData && fs.existsSync(path.join(POC, 'known_faces'))) {
      const kf = path.join(POC, 'known_faces');
      try {
        const items = fs.readdirSync(kf);
        const hasFaces = items.some((n) => {
          const p = path.join(kf, n);
          const st = fs.statSync(p);
          if (st.isDirectory()) return fs.readdirSync(p).some((f) => /\.(jpg|jpeg|png)$/i.test(f));
          return /\.(jpg|jpeg|png)$/i.test(n);
        });
        if (hasFaces) warn('known_faces has images but students.csv is empty. Run: python sync_students_csv.py');
      } catch (_) {}
    }
  } catch {
    fail('students.csv not readable');
    hasFail = true;
  }
}

const knownFacesPath = path.join(POC, 'known_faces');
if (fs.existsSync(knownFacesPath) && fs.statSync(knownFacesPath).isDirectory()) {
  const exts = ['.jpg', '.jpeg', '.png'];
  let count = 0;
  for (const name of fs.readdirSync(knownFacesPath)) {
    const full = path.join(knownFacesPath, name);
    if (fs.statSync(full).isDirectory()) {
      for (const f of fs.readdirSync(full)) {
        if (exts.some((e) => f.toLowerCase().endsWith(e))) count++;
      }
    } else if (exts.some((e) => name.toLowerCase().endsWith(e))) {
      count++;
    }
  }
  check('known_faces has at least 1 face image', count >= 1);
  if (count > 0) warn(`Found ${count} face image(s).`);
} else {
  check('known_faces folder exists', false);
}

section('4. Next.js');
check('node_modules exists', fs.existsSync(path.join(ROOT, 'node_modules')));
check('package.json exists', fs.existsSync(path.join(ROOT, 'package.json')));

section('5. Python (face-recognition-poc)');
const hasEnroll = fs.existsSync(path.join(POC, 'enroll_face.py'));
const hasAttendance = fs.existsSync(path.join(POC, 'attendance_poc.py'));
check('enroll_face.py exists', hasEnroll);
check('attendance_poc.py exists', hasAttendance);

console.log('\n' + '─'.repeat(50));
if (hasFail) {
  if (WARN_ONLY) {
    console.log('\x1b[33mSome checks failed (run fix before demo). Starting dev anyway.\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\x1b[31mSome checks failed. Fix them before the demo.\x1b[0m\n');
    process.exit(1);
  }
} else {
  console.log('\x1b[32mAll checks passed. Ready for demo!\x1b[0m');
  console.log('\nRun:');
  console.log('  Terminal 1: npm run dev');
  console.log('  Terminal 2: cd face-recognition-poc && python attendance_poc.py');
  console.log('  Dashboard: http://localhost:3000/admin/dashboard\n');
  process.exit(0);
}
