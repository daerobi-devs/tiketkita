import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/daeroom';
import { verifyDaeroomWebhookSignature } from '@/lib/maildaeroom';

interface DaeroomMailWebhookPayload {
  event?: string;
  action?: string;
  order_id?: string;
  orderId?: string;
  callback_data?: string;
  data?: {
    order_id?: string;
    orderId?: string;
    action?: string;
  };
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    console.log('[DAEROOM MAIL WEBHOOK HIT]', rawBody.slice(0, 300));
    const signature = req.headers.get('x-daeroom-signature') || req.headers.get('x-signature');

    if (signature && !verifyDaeroomWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ success: false, error: 'Invalid Daeroom Mail signature.' }, { status: 401 });
    }

    const payload: DaeroomMailWebhookPayload = JSON.parse(rawBody);
    const cb = payload.callback_data || '';
    const cbParts = cb.split(':'); // e.g. approve:t:TRX-123456

    const orderId =
      payload.order_id ||
      payload.orderId ||
      payload.data?.order_id ||
      payload.data?.orderId ||
      (cbParts.length >= 3 ? cbParts[2] : undefined);

    const actionRaw = (
      payload.event ||
      payload.action ||
      payload.data?.action ||
      (cbParts.length >= 1 ? cbParts[0] : '')
    ).toLowerCase();

    if (!orderId) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const trxRes = await queryDb<{
      id_transaksi: string;
      id_kategori: string;
      jumlah_tiket: number;
      nama_pemesan: string;
      status_bayar: string;
    }>(
      'SELECT id_transaksi, id_kategori, jumlah_tiket, nama_pemesan, status_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [orderId]
    );

    if (!trxRes.rows.length) {
      return NextResponse.json({ success: false, error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    const trx = trxRes.rows[0];

    if (actionRaw.includes('approve') || actionRaw === 'payment.approved') {
      if (trx.status_bayar === 'lunas') {
        return NextResponse.json({ success: true, already_paid: true });
      }
      await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'lunas' WHERE id_transaksi = $1", [
        trx.id_transaksi,
      ]);

      const existing = await queryDb<{ id_tiket: string }>(
        'SELECT id_tiket FROM tiket_detail WHERE id_transaksi = $1',
        [trx.id_transaksi]
      );
      if (existing.rows.length === 0) {
        for (let i = 1; i <= trx.jumlah_tiket; i++) {
          const code = `TKT-${trx.id_transaksi.slice(-4)}-${i}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
          await queryDb(
            'INSERT INTO tiket_detail (id_tiket, id_transaksi, kode_qr, nama_pemegang) VALUES ($1,$2,$3,$4)',
            [code, trx.id_transaksi, code, trx.nama_pemesan]
          );
        }
      }
      return NextResponse.json({ success: true, status: 'lunas', order_id: trx.id_transaksi });
    }

    if (actionRaw.includes('reject') || actionRaw === 'payment.rejected') {
      if (trx.status_bayar === 'ditolak' || trx.status_bayar === 'lunas') {
        return NextResponse.json({ success: true, status: trx.status_bayar });
      }
      await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'ditolak' WHERE id_transaksi = $1", [
        trx.id_transaksi,
      ]);
      await queryDb('UPDATE kategori_tiket SET kuota_tersedia = kuota_tersedia + $1 WHERE id_kategori = $2', [
        trx.jumlah_tiket,
        trx.id_kategori,
      ]);
      return NextResponse.json({ success: true, status: 'ditolak', order_id: trx.id_transaksi });
    }

    return NextResponse.json({ success: true, ignored: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 500 });
  }
}
