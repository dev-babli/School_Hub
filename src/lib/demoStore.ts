import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Persistent store for attendance events.
 * Uses Vercel KV when KV_REST_API_URL is set (Vercel deployment); else JSON file under ./data.
 */

export type AttendanceStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface AttendanceLog {
  id: string;
  tenant_id: string;
  student_name: string;
  phone: string;
  time: string;
  status: AttendanceStatus;
  created_at: number;
  error_message?: string;
}

const DATA_DIR = join(process.cwd(), 'data');
const LOG_FILE = join(DATA_DIR, 'attendanceLogs.json');
const KV_KEY = 'attendance_logs';

function hasKV(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function readLogsFromKV(): Promise<AttendanceLog[]> {
  try {
    const { kv } = await import('@vercel/kv');
    const raw = await kv.get<AttendanceLog[]>(KV_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

async function writeLogsToKV(logs: AttendanceLog[]): Promise<void> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.set(KV_KEY, logs);
  } catch {
    // ignore
  }
}

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLogsFromDisk(): AttendanceLog[] {
  try {
    if (!existsSync(LOG_FILE)) return [];
    const raw = readFileSync(LOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AttendanceLog[];
  } catch {
    return [];
  }
}

function writeLogsToDisk(logs: AttendanceLog[]): void {
  try {
    ensureDir();
    writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch {
    // swallow disk errors for now; API callers still get in-memory result
  }
}

export async function addLog(log: Omit<AttendanceLog, 'id' | 'created_at'>): Promise<AttendanceLog> {
  const logs = hasKV() ? await readLogsFromKV() : readLogsFromDisk();
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const created_at = Date.now();
  const entry: AttendanceLog = { ...log, id, created_at };
  logs.push(entry);
  if (hasKV()) {
    await writeLogsToKV(logs);
  } else {
    writeLogsToDisk(logs);
  }
  return entry;
}

const DEFAULT_PAGE_SIZE = 100;

export async function getLogs(
  tenant_id?: string,
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
): Promise<AttendanceLog[]> {
  const logs = hasKV() ? await readLogsFromKV() : readLogsFromDisk();
  let filtered = tenant_id ? logs.filter((l) => l.tenant_id === tenant_id) : logs;
  filtered = filtered.slice().reverse();
  return filtered.slice(offset, offset + limit);
}

export async function updateLogStatus(
  id: string,
  status: AttendanceStatus,
  error_message?: string
): Promise<void> {
  const logs = hasKV() ? await readLogsFromKV() : readLogsFromDisk();
  const entry = logs.find((l) => l.id === id);
  if (entry) {
    entry.status = status;
    if (error_message !== undefined) entry.error_message = error_message;
    if (hasKV()) {
      await writeLogsToKV(logs);
    } else {
      writeLogsToDisk(logs);
    }
  }
}

export async function getLogById(id: string): Promise<AttendanceLog | undefined> {
  const logs = hasKV() ? await readLogsFromKV() : readLogsFromDisk();
  return logs.find((l) => l.id === id);
}

export async function getStats(tenant_id?: string): Promise<{
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}> {
  const logs = hasKV() ? await readLogsFromKV() : readLogsFromDisk();
  const list = tenant_id ? logs.filter((l) => l.tenant_id === tenant_id) : logs;
  return {
    total: list.length,
    pending: list.filter((l) => l.status === 'pending').length,
    sent: list.filter((l) => l.status === 'sent').length,
    delivered: list.filter((l) => l.status === 'delivered').length,
    failed: list.filter((l) => l.status === 'failed').length,
  };
}
