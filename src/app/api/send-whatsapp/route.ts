import { NextRequest, NextResponse } from 'next/server';
import { sendCustomMessage } from 'lib/whatsapp';
import { sendTwilioWhatsAppText } from 'lib/twilio-whatsapp';

export type SendWhatsAppBody = {
  phone: string;
  message?: string;
  provider?: 'twilio' | 'meta';
};

/**
 * POST /api/send-whatsapp
 * Send a WhatsApp message to a phone number.
 *
 * Body: { phone: string, message?: string, provider?: 'twilio' | 'meta' }
 * - phone: Recipient number (e.g. "919876543210" or "9876543210")
 * - message: Text to send. With Twilio: free-form (user must have joined sandbox). With Meta: requires template.
 * - provider: "twilio" (sandbox, no approval) or "meta" (Cloud API). Auto-selects if only one is configured.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendWhatsAppBody;
    const { phone, message, provider } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid phone number' },
        { status: 400 }
      );
    }

    const text = message || 'Hello from your app';
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.length === 10 ? '91' + digits : digits.startsWith('91') && digits.length === 12 ? digits : phone;
    const useTwilio = provider === 'twilio' || (provider !== 'meta' && process.env.TWILIO_ACCOUNT_SID);

    if (useTwilio && process.env.TWILIO_ACCOUNT_SID) {
      const result = await sendTwilioWhatsAppText(normalized, text);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, provider: 'twilio' });
    }

    const result = await sendCustomMessage(normalized, text);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, provider: 'meta' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
