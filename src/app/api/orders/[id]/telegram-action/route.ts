import crypto from 'crypto';
import { queryDb } from '@/lib/daeroom';

export const dynamic = 'force-dynamic';

function signAction(orderId: string, action: string): string {
  const secret = process.env.DAEROOM_MAIL_WEBHOOK_SECRET || process.env.MPG_WEBHOOK_SECRET || 'tiketkita-secret';
  return crypto.createHmac('sha256', secret).update(`${orderId}:${action}`).digest('hex').slice(0, 32);
}

function htmlPage(title: string, subtitle: string, ok: boolean) {
  const accent = ok ? '#16a34a' : '#dc2626';
  const bg = ok ? '#f0fdf4' : '#fef2f2';
  return new Response(
    `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} - TiketKita</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { max-width: 420px; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 28px; text-align: center; box-shadow: 0 12px 30px rgba(15,23,42,0.08); }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; color: ${accent}; background: ${bg}; }
    h1 { font-size: 20px; color: #0f172a; margin: 14px 0 8px; }
    p { font-size: 13px; color: #475569; line-height: 1.5; margin: 0; }
    a { display: inline-block; margin-top: 20px; background: #2563eb; color: #fff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 18px; border-radius: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">TiketKita Admin</div>
    <h1>${title}</h1>
    <p>${subtitle}</p>
    <a href="/dashboard">Buka Dashboard Admin</a>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const action = (searchParams.get('action') || '').toLowerCase();
    const token = searchParams.get('token') || '';

    if (action !== 'approve' && action !== 'reject') {
      return htmlPage('Aksi Tidak Valid', 'Parameter aksi harus approve atau reject.', false);
    }

    const expected = signAction(id, action);
    if (!token || token !== expected) {
      return htmlPage('Tautan Tidak Sah', 'Token keamanan HMAC tidak cocok.', false);
    }

    const r = await queryDb<{
      id_transaksi: string;
      id_kategori: string;
      jumlah_tiket: number;
      nama_pemesan: string;
      status_bayar: string;
    }>(
      'SELECT id_transaksi, id_kategori, jumlah_tiket, nama_pemesan, status_bayar FROM transaksi_pemesanan WHERE id_transaksi = $1',
      [id]
    );

    if (!r.rows.length) {
      return htmlPage('Order Tidak Ditemukan', `Transaksi ${id} tidak ditemukan di database.`, false);
    }

    const trx = r.rows[0];

    if (action === 'approve') {
      if (trx.status_bayar === 'lunas') {
        return htmlPage('Sudah Lunas Sebelumnya', `Order ${trx.id_transaksi} atas nama ${trx.nama_pemesan} sudah berstatus LUNAS.`, true);
      }

      await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'lunas' WHERE id_transaksi = $1", [trx.id_transaksi]);

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

      return htmlPage(
        'Pembayaran Disetujui!',
        `Order ${trx.id_transaksi} (${trx.nama_pemesan}, ${trx.jumlah_tiket} tiket) telah ditandai LUNAS dan E-Ticket QR otomatis diterbitkan.`,
        true
      );
    }

    // action === 'reject'
    if (trx.status_bayar === 'lunas') {
      return htmlPage('Tidak Dapat Ditolak', `Order ${trx.id_transaksi} sudah berstatus LUNAS.`, false);
    }
    if (trx.status_bayar === 'ditolak') {
      return htmlPage('Sudah Ditolak Sebelumnya', `Order ${trx.id_transaksi} sudah berstatus DITOLAK dan kuota sudah kembali.`, false);
    }

    await queryDb("UPDATE transaksi_pemesanan SET status_bayar = 'ditolak' WHERE id_transaksi = $1", [trx.id_transaksi]);
    await queryDb('UPDATE kategori_tiket SET kuota_tersedia = kuota_tersedia + $1 WHERE id_kategori = $2', [
      trx.jumlah_tiket,
      trx.id_kategori,
    ]);

    return htmlPage(
      'Pesanan Ditolak',
      `Order ${trx.id_transaksi} (${trx.nama_pemesan}) telah ditolak dan ${trx.jumlah_tiket} kuota tiket berhasil dikembalikan.`,
      false
    );
  } catch (err) {
    return htmlPage('Terjadi Kesalahan', (err as Error).message, false);
  }
}
