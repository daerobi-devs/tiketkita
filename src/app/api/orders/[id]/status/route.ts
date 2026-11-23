import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/daeroom';
import { getMpgInvoiceStatus } from '@/lib/mpg';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await queryDb<{
      id_transaksi: string;
      status_bayar: string;
      total_bayar: number;
      metode_bayar: string;
      jumlah_tiket: number;
      nama_pemesan: string;
    }>(
      'SELECT id_transaksi, status_bayar, total_bayar, metode_bayar, jumlah_tiket, nama_pemesan FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [id]
    );

    if (!r.rows.length) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    const trx = r.rows[0];
    let currentStatus = trx.status_bayar;

    // Auto-sync langsung ke MPG saat masih pending (tidak bergantung pada webhook saja!)
    if (currentStatus === 'pending' && trx.metode_bayar === 'QRIS Otomatis') {
      const mpgInfo = await getMpgInvoiceStatus(trx.id_transaksi);
      if (mpgInfo && (mpgInfo.status === 'PAID' || mpgInfo.status === 'LUNAS' || mpgInfo.status === 'SUCCESS')) {
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
        currentStatus = 'lunas';
      }
    }

    const tickets = await queryDb<{ id_tiket: string; kode_qr: string }>(
      'SELECT id_tiket, kode_qr FROM tiket_detail WHERE id_transaksi = $1',
      [id]
    );

    return NextResponse.json(
      {
        id_transaksi: trx.id_transaksi,
        status_bayar: currentStatus,
        total_bayar: trx.total_bayar,
        tickets: tickets.rows,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
