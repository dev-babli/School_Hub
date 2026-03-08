/**
 * Meta WhatsApp Cloud API - send template message.
 * Use hello_world template first (no params). For attendance use custom template with params.
 */

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const API_VERSION = 'v18.0';

export async function sendWhatsAppTemplate(
  to: string,
  options: {
    templateName: string;
    languageCode?: string;
    bodyParams?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return { success: false, error: 'WhatsApp not configured (missing env)' };
  }

  const normalizedPhone = to.replace(/\D/g, '');
  const components: { type: string; parameters?: { type: string; text: string }[] }[] = [];

  if (options.bodyParams && options.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: options.bodyParams.map((text) => ({ type: 'text', text })),
    });
  }

  const body: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    to: normalizedPhone,
    type: 'template',
    template: {
      name: options.templateName,
      language: { code: options.languageCode || 'en' },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: { message?: string }; messages?: unknown[] };
    if (!res.ok) {
      const msg = data?.error?.message || res.statusText;
      return { success: false, error: msg };
    }
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { success: false, error: msg };
  }
}

/** Send hello_world (no params) - fastest for demo. */
export async function sendHelloWorld(to: string): Promise<{ success: boolean; error?: string }> {
  return sendWhatsAppTemplate(to, { templateName: 'hello_world' });
}

/** Send attendance notification (requires template "attendance_notification" with {{1}} {{2}} in body). */
export async function sendAttendanceNotification(
  to: string,
  studentName: string,
  time: string
): Promise<{ success: boolean; error?: string }> {
  return sendWhatsAppTemplate(to, {
    templateName: 'attendance_notification',
    languageCode: 'en',
    bodyParams: [studentName, time],
  });
}

/**
 * Send a custom text message via WhatsApp.
 * Uses template from WHATSAPP_MESSAGE_TEMPLATE env (body with {{1}}) if set,
 * otherwise falls back to hello_world (fixed message).
 */
export async function sendCustomMessage(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const templateName = process.env.WHATSAPP_MESSAGE_TEMPLATE || 'hello_world';
  if (templateName === 'hello_world') {
    return sendHelloWorld(to);
  }
  return sendWhatsAppTemplate(to, {
    templateName,
    languageCode: 'en',
    bodyParams: [message],
  });
}
