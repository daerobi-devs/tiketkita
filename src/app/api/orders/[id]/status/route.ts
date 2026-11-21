import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const r = await queryDb<{ id_transaksi: string; status_bayar: string; total_bayar: number }>(
      'SELECT id_transaksi, status_bayar, total_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [id]
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: 'Transaksi tidak ditemukan.' }, { status: 404 });
    }

    const tickets = await queryDb<{ id_tiket: string; kode_qr: string }>(
      'SELECT id_tiket, kode_qr FROM tiket_detail WHERE id_transaksi = $1',
      [id]
    );

    return NextResponse.json({
      id_transaksi: r.rows[0].id_transaksi,
      status_bayar: r.rows[0].status_bayar,
      total_bayar: r.rows[0].total_bayar,
      tickets: tickets.rows,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
