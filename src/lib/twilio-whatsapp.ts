/**
 * Twilio WhatsApp Sandbox - send messages without Meta approval.
 *
 * Setup:
 * 1. Sign up at twilio.com
 * 2. Go to Try WhatsApp → Sandbox
 * 3. Send "join positive-express" to +1 415 523 8886 from your WhatsApp
 * 4. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN to .env
 *
 * After joining, you can send free-form text (within 24h window) or use pre-approved templates.
 */

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SANDBOX_FROM = 'whatsapp:+14155238886';

/** Pre-approved Sandbox templates (Content SID from Twilio) */
const SANDBOX_TEMPLATES = {
  appointment_reminder: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // "Your appointment is coming up on {{1}} at {{2}}"
  verification_code: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Replace with actual SID from Twilio Console
  order_notification: 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Replace with actual SID from Twilio Console
};

/**
 * Normalize phone to E.164 for WhatsApp. India: 91 + 10 digits. Other: keep as-is with +.
 */
export function normalizePhone(to: string): string {
  const digits = to.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('91') && digits.length === 12) return `whatsapp:+${digits}`;
  if (digits.length === 10) return `whatsapp:+91${digits}`;
  return `whatsapp:+${digits}`;
}

/** Map Twilio errors to user-friendly messages. */
export function mapTwilioError(raw: string): string {
  const lower = (raw || '').toLowerCase();
  if (lower.includes('not in') || lower.includes('sandbox') || lower.includes('join'))
    return `Recipient not in sandbox. Ask them to send "join [phrase]" to +1 415 523 8886`;
  if (lower.includes('invalid') || lower.includes('phone') || lower.includes('to'))
    return 'Invalid phone format. Use country code (e.g. 919876543210)';
  if (lower.includes('24') && lower.includes('hour'))
    return '24h window expired. Ask recipient to send a message first, then try again.';
  return raw;
}

/**
 * Send a free-form text message (works within 24h after user sent "join positive-express").
 */
export async function sendTwilioWhatsAppText(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    return { success: false, error: 'Twilio not configured (missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', SANDBOX_FROM);
  params.append('To', normalizePhone(to));
  params.append('Body', body);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64'),
      },
      body: params.toString(),
    });

    const data = (await res.json()) as { error_message?: string; message?: string; sid?: string };
    if (!res.ok) {
      const raw = data?.error_message || data?.message || res.statusText;
      return { success: false, error: mapTwilioError(raw) };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { success: false, error: msg };
  }
}

/**
 * Send using pre-approved Appointment Reminder template.
 * Body: "Your appointment is coming up on {{1}} at {{2}}"
 */
export async function sendTwilioAppointmentReminder(
  to: string,
  date: string,
  time: string
): Promise<{ success: boolean; error?: string }> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    return { success: false, error: 'Twilio not configured' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', SANDBOX_FROM);
  params.append('To', normalizePhone(to));
  params.append('ContentSid', SANDBOX_TEMPLATES.appointment_reminder);
  params.append('ContentVariables', JSON.stringify({ '1': date, '2': time }));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64'),
      },
      body: params.toString(),
    });

    const data = (await res.json()) as { error_message?: string; message?: string };
    if (!res.ok) {
      const raw = data?.error_message || data?.message || res.statusText;
      return { success: false, error: mapTwilioError(raw) };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
