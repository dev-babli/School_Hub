import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { assignUnknownFace, getUnknownFaceById } from 'lib/unknownFacesStore';
import { requireApiKey, authFailureResponse } from 'lib/apiAuth';
import { getStudentById } from 'lib/studentsConfig';
import { addLog, updateLogStatus } from 'lib/demoStore';
import { sendTwilioAppointmentReminder, sendTwilioWhatsAppText } from 'lib/twilio-whatsapp';
import { sendAttendanceNotification, sendHelloWorld } from 'lib/whatsapp';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireApiKey(request);
  const errResp = authFailureResponse(auth);
  if (errResp) return errResp;
  try {
    const { id } = await params;
    const body = await request.json();
    const { student_id } = body;
    if (!student_id) {
      return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
    }

    const face = getUnknownFaceById(id);
    if (!face) {
      return NextResponse.json({ error: 'Unknown face not found' }, { status: 404 });
    }
    if (face.status !== 'pending_review') {
      return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
    }

    const student = getStudentById(student_id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    assignUnknownFace(id, student.id, student.name);

    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const today = now.toLocaleDateString('en-IN', { month: 'numeric', day: 'numeric' });

    const entry = await addLog({
      tenant_id: student.tenant_id,
      student_name: student.name,
      phone: student.phone,
      time,
      status: 'pending',
    });

    const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID;
    const hasMeta = !!process.env.WHATSAPP_ACCESS_TOKEN;

    let result = hasTwilio
      ? await sendTwilioAppointmentReminder(student.phone, today, time)
      : { success: false, error: 'Twilio not configured' };

    if (!result.success && hasTwilio) {
      const msg = `🟢 Alert: ${student.name} has safely arrived at ${time}.`;
      result = await sendTwilioWhatsAppText(student.phone, msg);
    }
    if (!result.success && hasMeta) {
      result = await sendAttendanceNotification(student.phone, student.name, time);
      if (!result.success) result = await sendHelloWorld(student.phone);
    }
    if (!result.success && !hasTwilio && !hasMeta) {
      result = { success: false, error: 'No WhatsApp provider configured (set TWILIO_* or WHATSAPP_ACCESS_TOKEN)' };
    }

    if (result.success) {
      await updateLogStatus(entry.id, 'sent');
      setTimeout(() => updateLogStatus(entry.id, 'delivered'), 3000);
    } else {
      await updateLogStatus(entry.id, 'failed', result.error ?? undefined);
    }

    return NextResponse.json({
      id: face.id,
      assigned_to: student.name,
      attendance_id: entry.id,
      whatsapp_status: result.success ? 'sent' : 'failed',
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
