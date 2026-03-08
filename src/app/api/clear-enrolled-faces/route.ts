import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { existsSync, unlinkSync, readdirSync, writeFileSync, mkdirSync, rmdirSync, statSync } from 'fs';
import { join } from 'path';
import { requireApiKey, authFailureResponse } from 'lib/apiAuth';
import { invalidateEnrolledCache } from 'lib/enrolledFacesCache';

const POC_DIR = join(process.cwd(), 'face-recognition-poc');
const STUDENTS_CSV = join(POC_DIR, 'students.csv');
const KNOWN_FACES_DIR = join(POC_DIR, 'known_faces');
const CSV_HEADER = 'name,student_id,phone,tenant_id\n';

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  const errResp = authFailureResponse(auth);
  if (errResp) return errResp;

  try {
    if (!existsSync(KNOWN_FACES_DIR)) {
      mkdirSync(KNOWN_FACES_DIR, { recursive: true });
    } else {
      const exts = ['.jpg', '.jpeg', '.png', '.bmp'];
      for (const f of readdirSync(KNOWN_FACES_DIR)) {
        const full = join(KNOWN_FACES_DIR, f);
        try {
          if (existsSync(full) && statSync(full).isDirectory()) {
            for (const sub of readdirSync(full)) {
              const subPath = join(full, sub);
              if (exts.some((e) => sub.toLowerCase().endsWith(e))) unlinkSync(subPath);
            }
            rmdirSync(full);
          } else if (exts.includes(f.substring(f.lastIndexOf('.')).toLowerCase())) {
            unlinkSync(full);
          }
        } catch {}
      }
    }

    if (!existsSync(POC_DIR)) {
      mkdirSync(POC_DIR, { recursive: true });
    }
    writeFileSync(STUDENTS_CSV, CSV_HEADER, 'utf-8');
    invalidateEnrolledCache();

    return NextResponse.json({
      ok: true,
      message: 'All enrolled faces cleared. Enroll a new face for the next client.',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to clear' },
      { status: 500 }
    );
  }
}
