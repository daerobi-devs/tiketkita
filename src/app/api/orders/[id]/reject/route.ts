import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await queryDb<{ id_transaksi: string; id_kategori: string; jumlah_tiket: number; status_bayar: string }>(
      'SELECT id_transaksi, id_kategori, jumlah_tiket, status_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [id]
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    const trx = r.rows[0];
    if (trx.status_bayar === 'lunas') {
      return NextResponse.json({ error: 'Transaksi yang sudah lunas tidak dapat ditolak.' }, { status: 400 });
    }
    if (trx.status_bayar === 'ditolak') {
      return NextResponse.json({ success: true, message: 'Transaksi sudah ditolak sebelumnya.' });
    }

    await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'ditolak' WHERE id_transaksi = $1", [trx.id_transaksi]);
    await queryDb('UPDATE kategori_tiket SET kuota_tersedia = kuota_tersedia + $1 WHERE id_kategori = $2', [
      trx.jumlah_tiket,
      trx.id_kategori,
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
