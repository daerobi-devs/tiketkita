import crypto from 'crypto';

export interface MpgInvoiceItem {
  name: string;
  price: number;
  quantity: number;
}

export interface CreateMpgInvoiceInput {
  order_id: string;
  amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  redirect_url: string;
  items: MpgInvoiceItem[];
}

export interface MpgInvoiceData {
  order_id: string;
  amount: number;
  unique_code: number;
  final_amount: number;
  qr_string: string;
  checkout_url: string;
  expires_at: string;
}

export async function createMpgInvoice(input: CreateMpgInvoiceInput): Promise<MpgInvoiceData> {
  const gatewayUrl = (process.env.MPG_GATEWAY_URL || 'https://paymentgateway.daeroom.my.id').replace(/\/$/, '');
  const apiKey = process.env.MPG_API_KEY;

  if (!apiKey) {
    throw new Error('MPG_API_KEY belum dikonfigurasi di environment.');
  }

  const res = await fetch(`${gatewayUrl}/api/v1/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(input),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || json.error || `Gagal membuat tagihan MPG (${res.status}).`);
  }

  const d = json.data;
  return {
    order_id: d.order_id,
    amount: Number(d.base_amount ?? d.amount ?? input.amount),
    unique_code: Number(d.unique_code ?? 0),
    final_amount: Number(d.final_amount ?? d.amount ?? input.amount),
    qr_string: d.qr_string || d.qris_string || '',
    checkout_url: d.checkout_url || '',
    expires_at: d.expires_at || d.expired_at || '',
  };
}

export function verifyMpgSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.MPG_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.trim().replace(/^sha256=/i, '');

  const expectedBuf = Buffer.from(expectedHex, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}
