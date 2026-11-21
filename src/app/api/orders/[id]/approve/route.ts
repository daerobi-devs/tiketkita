import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/daeroom';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await queryDb<{ id_transaksi: string; jumlah_tiket: number; nama_pemesan: string; status_bayar: string }>(
      'SELECT id_transaksi, jumlah_tiket, nama_pemesan, status_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [id]
    );
    if (!r.rows.length) return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    const trx = r.rows[0];
    if (trx.status_bayar === 'lunas') return NextResponse.json({ success: true, message: 'Sudah lunas.' });

    await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'lunas' WHERE id_transaksi = $1", [trx.id_transaksi]);
    for (let i = 1; i <= trx.jumlah_tiket; i++) {
      const code = `TKT-${trx.id_transaksi.slice(-4)}-${i}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      await queryDb(
        'INSERT INTO tiket_detail (id_tiket, id_transaksi, kode_qr, nama_pemegang) VALUES ($1,$2,$3,$4)',
        [code, trx.id_transaksi, code, trx.nama_pemesan]
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
