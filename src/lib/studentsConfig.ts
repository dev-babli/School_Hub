import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Student ID -> name, phone, tenant_id for attendance and Unknown Faces assign.
 * Authoritative source is face-recognition-poc/students.csv (shared with Python).
 * Cached 30s to avoid blocking on every request.
 */

export interface StudentInfo {
  id: string;
  name: string;
  phone: string;
  tenant_id: string;
}

const STUDENTS_CSV = join(process.cwd(), 'face-recognition-poc', 'students.csv');
const CACHE_TTL_MS = 30_000;
let cache: { data: StudentInfo[]; expires: number } | null = null;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function readStudentsCsv(): StudentInfo[] {
  if (!existsSync(STUDENTS_CSV)) {
    return [];
  }
  try {
    const raw = readFileSync(STUDENTS_CSV, 'utf-8');
    const lines = raw.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const nameIdx = headers.indexOf('name');
    const idIdx = headers.indexOf('student_id');
    const phoneIdx = headers.indexOf('phone');
    const tenantIdx = headers.indexOf('tenant_id');
    const result: StudentInfo[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      const name = (parts[nameIdx] ?? parts[0] ?? '').trim();
      if (!name) continue;
      const id = (idIdx >= 0 && parts[idIdx] !== undefined ? parts[idIdx] : String(i)).trim();
      const phone = (phoneIdx >= 0 && parts[phoneIdx] !== undefined ? parts[phoneIdx] : '').trim();
      const tenant_id = (tenantIdx >= 0 && parts[tenantIdx] !== undefined ? parts[tenantIdx] : 'delhi').trim();
      result.push({ id, name, phone, tenant_id });
    }
    return result;
  } catch {
    return [];
  }
}

export function getStudents(): StudentInfo[] {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.data;
  const data = readStudentsCsv();
  cache = { data, expires: now + CACHE_TTL_MS };
  return data;
}

export function getStudentById(id: string): StudentInfo | undefined {
  return getStudents().find((s) => s.id === id);
}
