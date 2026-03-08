import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Persistent store for unknown faces (manual fallback queue).
 * Uses JSON file under ./data so queue survives restarts.
 */

export type UnknownFaceStatus = 'pending_review' | 'resolved';

export interface UnknownFace {
  id: string;
  image_base64: string; // Face crop as base64 JPEG
  camera_id: string;
  timestamp: number;
  status: UnknownFaceStatus;
  assigned_student_id?: string;
  assigned_student_name?: string;
  resolved_at?: number;
}

const DATA_DIR = join(process.cwd(), 'data');
const UNKNOWN_FILE = join(DATA_DIR, 'unknownFaces.json');

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): UnknownFace[] {
  try {
    if (!existsSync(UNKNOWN_FILE)) return [];
    const raw = readFileSync(UNKNOWN_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as UnknownFace[];
  } catch {
    return [];
  }
}

function writeStore(store: UnknownFace[]): void {
  try {
    ensureDir();
    writeFileSync(UNKNOWN_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {
    // ignore disk errors for now
  }
}

export function addUnknownFace(face: Omit<UnknownFace, 'id' | 'status'>): UnknownFace {
  const store = readStore();
  const id = `uf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const entry: UnknownFace = {
    ...face,
    id,
    status: 'pending_review',
  };
  store.push(entry);
  writeStore(store);
  return entry;
}

const DEFAULT_PAGE_SIZE = 100;

export function getUnknownFaces(filters?: {
  date?: string;
  camera_id?: string;
  status?: UnknownFaceStatus;
  limit?: number;
  offset?: number;
}): UnknownFace[] {
  let list = readStore();
  if (filters?.date) {
    const dayStart = new Date(filters.date).setHours(0, 0, 0, 0);
    const dayEnd = dayStart + 86400000;
    list = list.filter((f) => f.timestamp >= dayStart && f.timestamp < dayEnd);
  }
  if (filters?.camera_id) {
    list = list.filter((f) => f.camera_id === filters.camera_id);
  }
  if (filters?.status) {
    list = list.filter((f) => f.status === filters.status);
  }
  const reversed = list.reverse();
  const limit = filters?.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters?.offset ?? 0;
  return reversed.slice(offset, offset + limit);
}

export function getUnknownFaceById(id: string): UnknownFace | undefined {
  const store = readStore();
  return store.find((f) => f.id === id);
}

export function assignUnknownFace(
  id: string,
  studentId: string,
  studentName: string
): UnknownFace | null {
  const store = readStore();
  const entry = store.find((f) => f.id === id);
  if (!entry || entry.status !== 'pending_review') return null;
  entry.status = 'resolved';
  entry.assigned_student_id = studentId;
  entry.assigned_student_name = studentName;
  entry.resolved_at = Date.now();
  writeStore(store);
  return entry;
}
