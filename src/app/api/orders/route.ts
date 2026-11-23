import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb } from '@/lib/daeroom';
import { createMpgInvoice, MpgInvoiceData } from '@/lib/mpg';
import { sendTelegramAlert } from '@/lib/maildaeroom';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Auto-cleanup: hapus transaksi berstatus ditolak yang berumur lebih dari 24 jam
    await queryDb(
      "DELETE FROM transaksi_pemesanan WHERE status_bayar = 'ditolak' AND waktu_pesan < NOW() - INTERVAL '24 hours'"
    ).catch(() => {});

    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    const r = email
      ? await queryDb(
          `SELECT t.*, k.nama_kategori, e.id_event, e.nama_event, e.tanggal_event, e.lokasi_venue
           FROM transaksi_pemesanan t
           JOIN kategori_tiket k ON t.id_kategori = k.id_kategori
           JOIN event_konser e ON k.id_event = e.id_event
           WHERE LOWER(t.email_pemesan) = LOWER($1)
           ORDER BY t.waktu_pesan DESC`,
          [email]
        )
      : await queryDb(`
          SELECT t.*, k.nama_kategori, e.id_event, e.nama_event, e.tanggal_event, e.lokasi_venue
          FROM transaksi_pemesanan t
          JOIN kategori_tiket k ON t.id_kategori = k.id_kategori
          JOIN event_konser e ON k.id_event = e.id_event
          ORDER BY t.waktu_pesan DESC
        `);

    const tickets = await queryDb('SELECT * FROM tiket_detail ORDER BY id_tiket DESC');
    return NextResponse.json(
      { orders: r.rows, tickets: tickets.rows },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const {
      id_kategori,
      nama_pemesan,
      no_wa,
      email_pemesan,
      jumlah_tiket,
      metode_bayar,
      instant_ots,
    } = await req.json();

    const qty = Number(jumlah_tiket) || 1;
    const catRes = await queryDb<{
      nama_kategori: string;
      harga_tiket: number;
      kuota_tersedia: number;
      nama_event: string;
    }>(
      `SELECT k.nama_kategori, k.harga_tiket, k.kuota_tersedia, e.nama_event
       FROM kategori_tiket k
       JOIN event_konser e ON k.id_event = e.id_event
       WHERE k.id_kategori = $1`,
      [id_kategori]
    );

    if (!catRes.rows.length) {
      return NextResponse.json({ error: 'Kategori tidak ditemukan.' }, { status: 404 });
    }

    const cat = catRes.rows[0];
    if (cat.kuota_tersedia < qty) {
      return NextResponse.json({ error: 'Sisa kuota tidak mencukupi.' }, { status: 400 });
    }

    const idTrx = 'TRX-' + Date.now().toString().slice(-6);
    const baseTotal = cat.harga_tiket * qty + 5000;
    const isMpgAuto = metode_bayar === 'QRIS Otomatis' && !instant_ots;
    const isInstantOts = Boolean(instant_ots);

    let payment: MpgInvoiceData | null = null;
    let finalAmount = baseTotal;

    if (isMpgAuto) {
      const origin = new URL(req.url).origin;
      payment = await createMpgInvoice({
        order_id: idTrx,
        amount: baseTotal,
        customer_name: nama_pemesan || 'Pembeli TiketKita',
        customer_email: email_pemesan && email_pemesan !== '-' ? email_pemesan : 'pembeli@tiketkita.id',
        customer_phone: no_wa && no_wa !== '-' ? no_wa : '081234567890',
        redirect_url: `${origin}/tiket-saya?order_id=${idTrx}`,
        items: [
          {
            name: `${cat.nama_event} - ${cat.nama_kategori}`,
            price: cat.harga_tiket,
            quantity: qty,
          },
          {
            name: 'Biaya Layanan',
            price: 5000,
            quantity: 1,
          },
        ],
      });
      finalAmount = payment.final_amount || baseTotal;
    }

    await queryDb('UPDATE kategori_tiket SET kuota_tersedia = kuota_tersedia - $1 WHERE id_kategori = $2', [
      qty,
      id_kategori,
    ]);

    const status = isInstantOts ? 'lunas' : 'pending';

    await queryDb(
      `INSERT INTO transaksi_pemesanan (id_transaksi, id_pelanggan, id_kategori, nama_pemesan, no_wa, email_pemesan, jumlah_tiket, total_bayar, metode_bayar, status_bayar, qris_string)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        idTrx,
        'USR-USR-01',
        id_kategori,
        nama_pemesan,
        no_wa || '-',
        email_pemesan || '-',
        qty,
        finalAmount,
        metode_bayar || 'QRIS Manual',
        status,
        payment?.qr_string || null,
      ]
    );

    const createdTickets: string[] = [];
    if (isInstantOts) {
      for (let i = 1; i <= qty; i++) {
        const code = `TKT-${idTrx.slice(-4)}-${i}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        await queryDb(
          'INSERT INTO tiket_detail (id_tiket, id_transaksi, kode_qr, nama_pemegang) VALUES ($1,$2,$3,$4)',
          [code, idTrx, code, nama_pemesan]
        );
        createdTickets.push(code);
      }
    } else {
      // Kirim notifikasi ke Telegram Admin dengan tombol 1-klik langsung (signed HMAC URL — tanpa tergantung webhook!)
      const publicBase = (process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin).replace(/\/$/, '');
      const actionSecret =
        process.env.DAEROOM_MAIL_WEBHOOK_SECRET || process.env.MPG_WEBHOOK_SECRET || 'tiketkita-secret';
      const approveToken = crypto
        .createHmac('sha256', actionSecret)
        .update(`${idTrx}:approve`)
        .digest('hex')
        .slice(0, 32);
      const rejectToken = crypto
        .createHmac('sha256', actionSecret)
        .update(`${idTrx}:reject`)
        .digest('hex')
        .slice(0, 32);

      const approveUrl = `${publicBase}/api/orders/${idTrx}/telegram-action?action=approve&token=${approveToken}`;
      const rejectUrl = `${publicBase}/api/orders/${idTrx}/telegram-action?action=reject&token=${rejectToken}`;

      sendTelegramAlert({
        message:
          `Pesanan Tiket Baru!\n` +
          `Order ID: ${idTrx}\n` +
          `Event: ${cat.nama_event} (${cat.nama_kategori})\n` +
          `Pemesan: ${nama_pemesan} (${no_wa || '-'})\n` +
          `Jumlah: ${qty} Tiket\n` +
          `Total: Rp ${finalAmount.toLocaleString('id-ID')}\n` +
          `Metode: ${metode_bayar || 'QRIS Manual'}\n` +
          `Status: Menunggu Pembayaran / Konfirmasi`,
        buttons: [
          { text: 'Setujui Pembayaran', url: approveUrl },
          { text: 'Tolak Pesanan', url: rejectUrl },
        ],
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      id_transaksi: idTrx,
      status_bayar: status,
      tickets: createdTickets,
      payment,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
