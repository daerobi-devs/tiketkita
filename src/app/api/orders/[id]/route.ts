import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await queryDb<{ status_bayar: string }>(
      'SELECT status_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [id]
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }
    if (r.rows[0].status_bayar !== 'ditolak') {
      return NextResponse.json(
        { error: 'Hanya riwayat transaksi berstatus ditolak yang dapat dihapus.' },
        { status: 400 }
      );
    }

    await queryDb('DELETE FROM tiket_detail WHERE id_transaksi = $1', [id]);
    await queryDb('DELETE FROM transaksi_pemesanan WHERE id_transaksi = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
