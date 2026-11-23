import crypto from 'crypto';

const MAIL_BASE_URL = (process.env.DAEROOM_MAIL_URL || 'https://mail.daeroom.my.id').replace(/\/$/, '');
const MAIL_API_KEY = process.env.DAEROOM_MAIL_API_KEY || '';
const APP_SLUG = process.env.DAEROOM_APP_SLUG || 't';
const MAIL_WEBHOOK_SECRET = process.env.DAEROOM_MAIL_WEBHOOK_SECRET || MAIL_API_KEY;

export async function requestOtp({
  recipient,
  channel = 'email',
  actionName = 'verifikasi pendaftaran akun TiketKita',
  lang = 'id',
  expiresInMinutes = 5,
}: {
  recipient: string;
  channel?: 'email' | 'whatsapp' | 'telegram' | 'auto';
  actionName?: string;
  lang?: 'en' | 'id';
  expiresInMinutes?: number;
}) {
  const res = await fetch(`${MAIL_BASE_URL}/api/otp/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MAIL_API_KEY ? { Authorization: `Bearer ${MAIL_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      identifier: recipient,
      recipient,
      channel,
      action_name: actionName,
      template_style: 'vercel',
      lang,
      expires_in_minutes: expiresInMinutes,
      appName: APP_SLUG,
      app_name: APP_SLUG,
    }),
    cache: 'no-store',
  });
  return res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
}

export async function verifyOtp({ recipient, code }: { recipient: string; code: string }) {
  const res = await fetch(`${MAIL_BASE_URL}/api/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MAIL_API_KEY ? { Authorization: `Bearer ${MAIL_API_KEY}` } : {}),
    },
    body: JSON.stringify({ identifier: recipient, recipient, code, appName: APP_SLUG, app_name: APP_SLUG }),
    cache: 'no-store',
  });
  return res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
}

export async function sendBrandedEmail({
  to,
  subject,
  recipientName,
  templateVariant = 'welcome',
  customData = {},
}: {
  to: string;
  subject: string;
  recipientName?: string;
  templateVariant?: 'ecommerce_receipt' | 'welcome' | 'otp_code' | 'broadcast';
  customData?: Record<string, unknown>;
}) {
  const res = await fetch(`${MAIL_BASE_URL}/api/webhook/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MAIL_API_KEY}`,
    },
    body: JSON.stringify({
      to,
      subject,
      recipient_name: recipientName,
      app_name: APP_SLUG,
      template_variant: templateVariant,
      custom_data: customData,
      sandbox: false,
    }),
    cache: 'no-store',
  });
  return res.json().catch(() => ({ success: false }));
}

export async function sendTelegramAlert({
  chatId,
  message,
  photoUrl,
  buttons,
}: {
  chatId?: string | number;
  message: string;
  photoUrl?: string;
  buttons?: Array<{ text: string; action?: string; callback_data?: string; url?: string }>;
}) {
  const targetChatId =
    chatId || process.env.DAEROOM_TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID || undefined;
  const res = await fetch(`${MAIL_BASE_URL}/api/telegram/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MAIL_API_KEY ? { Authorization: `Bearer ${MAIL_API_KEY}` } : {}),
    },
    body: JSON.stringify({
      ...(targetChatId ? { chatId: targetChatId } : {}),
      appName: APP_SLUG,
      text: `[${APP_SLUG}] ${message}`,
      photoUrl,
      buttons,
    }),
    cache: 'no-store',
  });
  return res.json().catch(() => ({ success: false }));
}

export function verifyDaeroomWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!MAIL_WEBHOOK_SECRET || !signatureHeader) return false;
  const provided = signatureHeader.trim().replace(/^sha256=/i, '');
  const expected = crypto.createHmac('sha256', MAIL_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
