/**
 * Client-side headers for API requests.
 * When NEXT_PUBLIC_ATTENDANCE_API_KEY is set, adds X-API-Key for write operations.
 */
const API_KEY = typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_ATTENDANCE_API_KEY ?? '') : '';

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) h['X-API-Key'] = API_KEY;
  return { ...h, ...(extra as Record<string, string>) };
}
