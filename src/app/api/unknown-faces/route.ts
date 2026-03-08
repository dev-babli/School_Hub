import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { addUnknownFace, getUnknownFaces } from 'lib/unknownFacesStore';
import { requireApiKey, authFailureResponse } from 'lib/apiAuth';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date') ?? undefined;
  const camera_id = searchParams.get('camera_id') ?? undefined;
  const status = searchParams.get('status') as 'pending_review' | 'resolved' | undefined;
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)), 500);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

  const faces = getUnknownFaces({ date, camera_id, status, limit, offset });
  return NextResponse.json({ faces });
}

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  const errResp = authFailureResponse(auth);
  if (errResp) return errResp;
  try {
    const body = await request.json();
    const { image_base64, camera_id } = body;
    if (!image_base64 || !camera_id) {
      return NextResponse.json(
        { error: 'Missing image_base64 or camera_id' },
        { status: 400 }
      );
    }
    const entry = addUnknownFace({
      image_base64,
      camera_id,
      timestamp: Date.now(),
    });
    return NextResponse.json(entry);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
