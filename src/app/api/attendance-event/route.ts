import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { addLog, updateLogStatus } from 'lib/demoStore';
import { requireApiKey, authFailureResponse } from 'lib/apiAuth';

export type AttendanceEventBody = {
  student_name: string;
  phone: string;
  time: string;
  tenant_id: string;
};

/** Normalize phone to E.164. India: 91 + 10 digits. */
function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return digits || phone;
}

async function trySendWhatsApp(
  phone: string,
  student_name: string,
  time: string,
  today: string
): Promise<{ success: boolean; error?: string }> {
  const hasTwilio = !!process.env.TWILIO_ACCOUNT_SID;
  if (hasTwilio) {
    const { sendTwilioWhatsAppText, sendTwilioAttendanceTemplate } = await import('lib/twilio-whatsapp');
    const attendanceMsg = `🟢 Alert: ${student_name} has safely arrived at ${time}.`;
    let result = await sendTwilioWhatsAppText(phone, attendanceMsg);
    if (!result.success) result = await sendTwilioAttendanceTemplate(phone, student_name, time);
    return result;
  }
  return {
    success: false,
    error: 'No WhatsApp provider configured (set TWILIO_* env vars)',
  };
}

export async function POST(request: NextRequest) {
  const auth = requireApiKey(request);
  const errResp = authFailureResponse(auth);
  if (errResp) return errResp;
  try {
    const body = (await request.json()) as AttendanceEventBody;
    const { student_name, phone, time, tenant_id } = body;
    if (!student_name || !phone || !time || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing student_name, phone, time, or tenant_id' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneE164(phone);

    const entry = await addLog({
      tenant_id,
      student_name,
      phone: normalizedPhone,
      time,
      status: 'pending',
    });

    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 3600000 * 5.5);
    const today = ist.toLocaleDateString('en-IN', { month: 'numeric', day: 'numeric' });

    const result = await trySendWhatsApp(normalizedPhone, student_name, time, today);

    if (result.success) {
      await updateLogStatus(entry.id, 'sent');
      setTimeout(() => updateLogStatus(entry.id, 'delivered'), 3000);
    } else {
      await updateLogStatus(entry.id, 'failed', result.error ?? undefined);
    }

    return NextResponse.json({
      id: entry.id,
      status: result.success ? 'sent' : 'failed',
      error: result.error,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
