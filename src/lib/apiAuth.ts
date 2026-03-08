/**
 * Optional API key authentication for write operations.
 * When ATTENDANCE_API_KEY is set in env, requests must include X-API-Key header.
 * When unset, all requests are allowed (backward compatible for local demo).
 */
import { NextRequest, NextResponse } from 'next/server';

const HEADER = 'x-api-key';
const ENV_KEY = process.env.ATTENDANCE_API_KEY;

export type AuthResult = { ok: true } | { ok: false; status: 401; body: { error: string } };

export function requireApiKey(request: NextRequest): AuthResult {
  if (!ENV_KEY) return { ok: true };
  const provided = request.headers.get(HEADER);
  if (!provided || provided !== ENV_KEY) {
    return { ok: false, status: 401, body: { error: 'Invalid or missing X-API-Key' } };
  }
  return { ok: true };
}

/** Returns NextResponse for auth failure, or null if auth passed. */
export function authFailureResponse(auth: AuthResult): NextResponse | null {
  if (auth.ok) return null;
  return NextResponse.json(auth.body, { status: auth.status });
}
