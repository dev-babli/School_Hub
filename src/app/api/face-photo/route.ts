import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const KNOWN_FACES_DIR = join(process.cwd(), 'face-recognition-poc', 'known_faces');

/** Allowed chars: letters, digits, spaces, underscores, hyphens. Rejects path traversal. */
function sanitizeFaceName(name: string): string | null {
  if (!name || name.length > 200) return null;
  if (/\.\.|\/|\\|[\0]/.test(name)) return null;
  const safe = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
  return safe.length > 0 ? safe : null;
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name');
  const safeName = name ? sanitizeFaceName(name.trim()) : null;
  if (!safeName) {
    return new NextResponse('Invalid name', { status: 400 });
  }
  const exts = ['.jpg', '.jpeg', '.png', '.bmp'];
  let path: string | null = null;
  for (const e of exts) {
    const p = join(KNOWN_FACES_DIR, safeName + e);
    if (existsSync(p)) {
      path = p;
      break;
    }
  }
  if (!path) return new NextResponse(null, { status: 404 });
  try {
    const buf = await readFile(path);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
