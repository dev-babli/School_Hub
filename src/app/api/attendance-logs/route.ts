import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getStats } from 'lib/demoStore';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tenant_id = searchParams.get('tenant_id') ?? undefined;
  const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10)), 500);
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));
  const [logs, stats] = await Promise.all([getLogs(tenant_id, limit, offset), getStats(tenant_id)]);
  return NextResponse.json({ logs, stats });
}
