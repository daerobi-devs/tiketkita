import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function POST(req: Request) {
  try {
    const { kode_qr, id_petugas } = await req.json();
    if (!kode_qr) return NextResponse.json({ valid: false, message: 'Kode QR wajib diisi.' }, { status: 400 });

    const r = await queryDb<{
      id_tiket: string;
      kode_qr: string;
      nama_pemegang: string;
      status_checkin: string;
      status_bayar: string;
      nama_kategori: string;
      nama_event: string;
    }>(
      `SELECT td.id_tiket, td.kode_qr, td.nama_pemegang, td.status_checkin, t.status_bayar, k.nama_kategori, e.nama_event
       FROM tiket_detail td
       JOIN transaksi_pemesanan t ON td.id_transaksi = t.id_transaksi
       JOIN kategori_tiket k ON t.id_kategori = k.id_kategori
       JOIN event_konser e ON k.id_event = e.id_event
       WHERE td.kode_qr = $1`,
      [kode_qr.trim()]
    );

    if (!r.rows.length) return NextResponse.json({ valid: false, message: 'Kode QR tidak ditemukan di sistem.' });
    const tkt = r.rows[0];
    if (tkt.status_bayar !== 'lunas') return NextResponse.json({ valid: false, message: 'Pembayaran tiket belum lunas.' });
    if (tkt.status_checkin === 'sudah_checkin') {
      return NextResponse.json({ valid: false, message: `Tiket ${tkt.kode_qr} sudah pernah check-in sebelumnya.` });
    }
    await queryDb(
      "UPDATE tiket_detail SET status_checkin = 'sudah_checkin', waktu_checkin = NOW(), id_petugas_gate = $1 WHERE id_tiket = $2",
      [id_petugas || 'USR-GAT-01', tkt.id_tiket]
    );
    return NextResponse.json({ valid: true, message: 'Tiket Valid — Silakan Masuk', ticket: tkt });
  } catch (err) {
    return NextResponse.json({ valid: false, message: (err as Error).message }, { status: 500 });
  }
}
