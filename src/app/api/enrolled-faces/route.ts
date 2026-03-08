import 'server-only';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const POC_DIR = join(process.cwd(), 'face-recognition-poc');
const STUDENTS_CSV = join(POC_DIR, 'students.csv');
const KNOWN_FACES_DIR = join(POC_DIR, 'known_faces');
const CACHE_TTL_MS = 30_000;
let enrolledCache: { data: EnrolledStudent[]; expires: number } | null = null;

export interface EnrolledStudent {
  name: string;
  student_id: string;
  phone: string;
  tenant_id: string;
  photo: string | null;
  hasPhoto: boolean;
}

export async function GET() {
  const now = Date.now();
  if (enrolledCache && enrolledCache.expires > now) {
    return NextResponse.json({ students: enrolledCache.data });
  }
  const students: EnrolledStudent[] = [];
  try {
    const csv = await readFile(STUDENTS_CSV, 'utf-8');
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return NextResponse.json({ students: [] });
    const headers = parseCSVLine(lines[0]).map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const idIdx = headers.indexOf('student_id');
    const phoneIdx = headers.indexOf('phone');
    const tenantIdx = headers.indexOf('tenant_id');
    if (nameIdx === -1) return NextResponse.json({ students: [] });

    for (let i = 1; i < lines.length; i++) {
      const parts = parseCSVLine(lines[i]);
      const name = (parts[nameIdx] ?? parts[0] ?? '').trim();
      if (!name) continue;
      const student_id = (idIdx >= 0 && parts[idIdx] !== undefined) ? String(parts[idIdx]).trim() : String(i);
      const phone = phoneIdx >= 0 && parts[phoneIdx] !== undefined ? String(parts[phoneIdx]).trim() : '';
      const tenant_id = tenantIdx >= 0 && parts[tenantIdx] !== undefined ? String(parts[tenantIdx]).trim() : 'delhi';

      const safeName = name.replace(/\s+/g, '_');
      const exts = ['.jpg', '.jpeg', '.png', '.bmp'];
      let hasPhoto = false;
      for (const ext of exts) {
        if (existsSync(join(KNOWN_FACES_DIR, safeName + ext))) {
          hasPhoto = true;
          break;
        }
      }

      const photo = hasPhoto ? `${safeName}.jpg` : null;
      students.push({ name, student_id, phone, tenant_id, photo, hasPhoto });
    }
    enrolledCache = { data: students, expires: now + CACHE_TTL_MS };
  } catch {
    return NextResponse.json({ students: [] });
  }
  return NextResponse.json({ students });
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}
