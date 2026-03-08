import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getStats } from 'lib/demoStore';

/**
 * GET /api/logs
 * Alias for /api/attendance-logs. Returns logs and stats, filterable by tenant_id.
 * Query: ?tenant_id=delhi|mumbai|bangalore
 */
export async function GET(request: NextRequest) {
  const tenant_id = request.nextUrl.searchParams.get('tenant_id') ?? undefined;
  const [logs, stats] = await Promise.all([getLogs(tenant_id), getStats(tenant_id)]);
  return NextResponse.json({ logs, stats });
}
