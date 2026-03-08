import { NextRequest, NextResponse } from 'next/server';

const STREAM_SERVER = process.env.CAMERA_STREAM_URL || 'http://localhost:5000';

export async function GET(request: NextRequest) {
  const checkOnly = request.nextUrl.searchParams.get('check') === '1';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), checkOnly ? 3000 : 30000);
    // For availability check use /health so we get a quick response; /stream is used only for the actual feed
    const url = checkOnly ? `${STREAM_SERVER}/health` : `${STREAM_SERVER}/stream`;
    const res = await fetch(url, {
      headers: checkOnly ? { Accept: 'application/json' } : { Accept: 'multipart/x-mixed-replace' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (checkOnly) {
      const data = res.ok ? (await res.json().catch(() => ({}))) : {};
      return NextResponse.json({ available: res.ok && (data as { ok?: boolean }).ok !== false });
    }

    if (!res.ok || !res.body) {
      return new NextResponse('Camera stream unavailable. Run: py attendance_poc.py (from face-recognition-poc)', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return new Response(res.body, {
      headers: {
        'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
      },
    });
  } catch {
    if (checkOnly) {
      return NextResponse.json({ available: false });
    }
    return new NextResponse('Camera stream unavailable. Run: py attendance_poc.py (from face-recognition-poc)', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
