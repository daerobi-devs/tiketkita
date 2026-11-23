import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function GET() {
  try {
    const evs = await queryDb<Record<string, unknown>>("SELECT * FROM event_konser WHERE status_event = 'aktif' ORDER BY id_event ASC");
    const cats = await queryDb<Record<string, unknown>>('SELECT * FROM kategori_tiket ORDER BY harga_tiket ASC');
    const events = evs.rows.map((ev) => ({
      ...ev,
      categories: cats.rows.filter((c) => c.id_event === ev.id_event),
    }));
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nama_event, genre, tanggal_event, waktu_mulai, lokasi_venue, poster_url, poster_ratio, nama_kategori, harga_tiket, kuota_total } = await req.json();
    if (!nama_event || !harga_tiket || !kuota_total) {
      return NextResponse.json({ error: 'Data event dan kategori wajib lengkap.' }, { status: 400 });
    }
    const idEv = 'EV-' + Date.now().toString().slice(-4);
    const idKt = 'KT-' + Date.now().toString().slice(-4);
    await queryDb(
      'INSERT INTO event_konser (id_event, id_pembuat, nama_event, genre, tanggal_event, waktu_mulai, lokasi_venue, poster_url, poster_ratio) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [idEv, 'USR-ADM-01', nama_event, genre || 'Pop', tanggal_event || '20 Des 2026', waktu_mulai || '19.00 WIB', lokasi_venue || 'Lapangan Kota', poster_url || '/posters/poster-suramaya-fest.jpg', poster_ratio || 'portrait']
    );
    await queryDb(
      'INSERT INTO kategori_tiket (id_kategori, id_event, nama_kategori, harga_tiket, kuota_total, kuota_tersedia) VALUES ($1,$2,$3,$4,$5,$6)',
      [idKt, idEv, nama_kategori || 'Regular', Number(harga_tiket), Number(kuota_total), Number(kuota_total)]
    );
    return NextResponse.json({ success: true, id_event: idEv });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
