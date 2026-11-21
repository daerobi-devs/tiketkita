import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/daeroom';
import { verifyMpgSignature } from '@/lib/mpg';

interface MpgWebhookPayload {
  event?: string;
  order_id?: string;
  amount?: number;
  base_amount?: number;
  unique_code?: number;
  detected_bank?: string;
  paid_at?: string;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature =
      req.headers.get('x-callback-signature') ||
      req.headers.get('x-mpg-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('x-signature');

    if (signature && !verifyMpgSignature(rawBody, signature)) {
      console.log('[MPG WEBHOOK 401] Invalid signature', {
        sigPrefix: signature.slice(0, 16),
        bodyPreview: rawBody.slice(0, 200),
      });
      return NextResponse.json({ success: false, error: 'Invalid HMAC signature.' }, { status: 401 });
    }

    if (!signature) {
      const xHeaders = Array.from(req.headers.keys()).filter((k) => k.startsWith('x-'));
      console.log('[MPG WEBHOOK NO-SIG]', { xHeaders, bodyPreview: rawBody.slice(0, 200) });
    }

    const payload: MpgWebhookPayload = JSON.parse(rawBody);
    if (payload.event !== 'payment.success' || !payload.order_id) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const trxRes = await queryDb<{
      id_transaksi: string;
      jumlah_tiket: number;
      nama_pemesan: string;
      status_bayar: string;
    }>(
      'SELECT id_transaksi, jumlah_tiket, nama_pemesan, status_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [payload.order_id]
    );

    if (!trxRes.rows.length) {
      if (payload.order_id.toUpperCase().includes('TEST') || payload.order_id.toUpperCase().includes('PING')) {
        return NextResponse.json({ success: true, test: true });
      }
      return NextResponse.json({ success: false, error: 'Order tidak ditemukan.' }, { status: 404 });
    }

    const trx = trxRes.rows[0];

    // Idempotency guard: jangan proses ulang jika sudah lunas
    if (trx.status_bayar === 'lunas') {
      return NextResponse.json({ success: true });
    }

    await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'lunas' WHERE id_transaksi = $1", [
      trx.id_transaksi,
    ]);

    const existingTickets = await queryDb<{ id_tiket: string }>(
      'SELECT id_tiket FROM tiket_detail WHERE id_transaksi = $1',
      [trx.id_transaksi]
    );

    if (existingTickets.rows.length === 0) {
      for (let i = 1; i <= trx.jumlah_tiket; i++) {
        const code = `TKT-${trx.id_transaksi.slice(-4)}-${i}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        await queryDb(
          'INSERT INTO tiket_detail (id_tiket, id_transaksi, kode_qr, nama_pemegang) VALUES ($1,$2,$3,$4)',
          [code, trx.id_transaksi, code, trx.nama_pemesan]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
