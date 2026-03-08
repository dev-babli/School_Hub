import { NextResponse } from 'next/server';

const STREAM_URL = process.env.CAMERA_STREAM_URL || 'http://localhost:5000';

export async function POST() {
  try {
    const res = await fetch(`${STREAM_URL}/reset-cooldowns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (res.ok && data.ok) {
      return NextResponse.json({ success: true, message: data.message });
    }
    return NextResponse.json(
      { success: false, error: data.message || 'Reset failed' },
      { status: 502 }
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : 'Python server not reachable',
      },
      { status: 502 }
    );
  }
}
