import { NextResponse } from 'next/server';

const STREAM_SERVER = process.env.CAMERA_STREAM_URL || 'http://localhost:5000';

export async function GET() {
  try {
    const res = await fetch(`${STREAM_SERVER}/recognize`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { name: null, confidence: 0, error: 'Recognition unavailable' },
        { status: 503 }
      );
    }
    const data = (await res.json()) as { name: string | null; confidence: number };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { name: null, confidence: 0, error: 'Python backend not reachable' },
      { status: 503 }
    );
  }
}
