import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const {
      nama_event,
      genre,
      tanggal_event,
      waktu_mulai,
      lokasi_venue,
      poster_url,
      poster_ratio,
      id_kategori,
      nama_kategori,
      harga_tiket,
      kuota_total,
    } = await req.json();

    if (!nama_event) {
      return NextResponse.json({ error: 'Nama event wajib diisi.' }, { status: 400 });
    }

    await queryDb(
      `UPDATE event_konser
       SET nama_event = $1,
           genre = $2,
           tanggal_event = $3,
           waktu_mulai = $4,
           lokasi_venue = $5,
           poster_url = $6,
           poster_ratio = $7
       WHERE id_event = $8`,
      [
        nama_event,
        genre || 'Indie',
        tanggal_event || '20 Des 2026',
        waktu_mulai || '19.00 WIB',
        lokasi_venue || 'Lapangan Kota',
        poster_url || '/posters/poster-soundwave.jpg',
        poster_ratio || 'landscape',
        id,
      ]
    );

    if (id_kategori && kuota_total !== undefined && harga_tiket !== undefined) {
      const catRes = await queryDb<{ kuota_total: number; kuota_tersedia: number }>(
        'SELECT kuota_total, kuota_tersedia FROM kategori_tiket WHERE id_kategori = $1',
        [id_kategori]
      );
      if (catRes.rows.length) {
        const old = catRes.rows[0];
        const sold = Math.max(0, Number(old.kuota_total) - Number(old.kuota_tersedia));
        const newTotal = Math.max(sold, Number(kuota_total));
        const newAvail = Math.max(0, newTotal - sold);

        await queryDb(
          `UPDATE kategori_tiket
           SET nama_kategori = $1,
               harga_tiket = $2,
               kuota_total = $3,
               kuota_tersedia = $4
           WHERE id_kategori = $5`,
          [nama_kategori || 'Regular', Number(harga_tiket), newTotal, newAvail, id_kategori]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await queryDb(
      `DELETE FROM tiket_detail
       WHERE id_transaksi IN (
         SELECT t.id_transaksi
         FROM transaksi_pemesanan t
         JOIN kategori_tiket k ON t.id_kategori = k.id_kategori
         WHERE k.id_event = $1
       )`,
      [id]
    );
    await queryDb(
      `DELETE FROM transaksi_pemesanan
       WHERE id_kategori IN (SELECT id_kategori FROM kategori_tiket WHERE id_event = $1)`,
      [id]
    );
    await queryDb('DELETE FROM kategori_tiket WHERE id_event = $1', [id]);
    await queryDb('DELETE FROM event_konser WHERE id_event = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
