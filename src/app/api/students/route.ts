import 'server-only';
import { NextResponse } from 'next/server';
import { getStudents } from 'lib/studentsConfig';

export async function GET() {
  const students = getStudents();
  return NextResponse.json({ students });
}
