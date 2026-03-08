import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { join } from 'path';

const POC_DIR = join(process.cwd(), 'face-recognition-poc');

export async function POST(request: NextRequest) {
  try {
    let envEnrollName = '';
    let envEnrollPhone = '';
    try {
      const body = (await request.json()) as { name?: string; phone?: string };
      if (body?.name && typeof body.name === 'string') envEnrollName = body.name.trim();
      if (body?.phone && typeof body.phone === 'string') envEnrollPhone = body.phone.trim();
    } catch {
      // No body or invalid JSON — use defaults
    }
    const child = spawn('py', ['enroll_face.py'], {
      cwd: POC_DIR,
      env: {
        ...process.env,
        ENROLL_NON_INTERACTIVE: '1',
        ...(envEnrollName && { ENROLL_NAME: envEnrollName }),
        ...(envEnrollPhone && { ENROLL_PHONE: envEnrollPhone }),
      },
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return NextResponse.json({ status: 'started' });
  } catch (e) {
    console.error('Failed to start enroll_face.py', e);
    return NextResponse.json({ error: 'Failed to start enroll script' }, { status: 500 });
  }
}

