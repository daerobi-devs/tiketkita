const crypto = require('crypto');
const { queryDb } = require('./daeroom');

function hashPassword(pw) {
  return crypto.createHash('sha256').update(pw).digest('hex');
}

async function initPostgres() {
  const schema = `
    CREATE TABLE IF NOT EXISTS pengguna (
      id_pengguna VARCHAR(20) PRIMARY KEY,
      nama_lengkap VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      no_wa VARCHAR(20),
      peran VARCHAR(20) NOT NULL CHECK (peran IN ('admin', 'gatekeeper', 'pelanggan')),
      status_aktif BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS event_konser (
      id_event VARCHAR(20) PRIMARY KEY,
      id_pembuat VARCHAR(20) REFERENCES pengguna(id_pengguna),
      nama_event VARCHAR(150) NOT NULL,
      genre VARCHAR(50) NOT NULL,
      tanggal_event VARCHAR(30) NOT NULL,
      waktu_mulai VARCHAR(20) NOT NULL,
      lokasi_venue VARCHAR(150) NOT NULL,
      poster_url VARCHAR(255) NOT NULL,
      status_event VARCHAR(20) DEFAULT 'aktif'
    );

    CREATE TABLE IF NOT EXISTS kategori_tiket (
      id_kategori VARCHAR(20) PRIMARY KEY,
      id_event VARCHAR(20) REFERENCES event_konser(id_event) ON DELETE CASCADE,
      nama_kategori VARCHAR(50) NOT NULL,
      harga_tiket INTEGER NOT NULL,
      kuota_total INTEGER NOT NULL,
      kuota_tersedia INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transaksi_pemesanan (
      id_transaksi VARCHAR(30) PRIMARY KEY,
      id_pelanggan VARCHAR(20) REFERENCES pengguna(id_pengguna),
      id_kategori VARCHAR(20) REFERENCES kategori_tiket(id_kategori),
      nama_pemesan VARCHAR(100) NOT NULL,
      no_wa VARCHAR(20) NOT NULL,
      email_pemesan VARCHAR(100) NOT NULL,
      waktu_pesan TIMESTAMP DEFAULT NOW(),
      jumlah_tiket INTEGER NOT NULL,
      total_bayar INTEGER NOT NULL,
      metode_bayar VARCHAR(30) DEFAULT 'QRIS',
      status_bayar VARCHAR(20) DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS tiket_detail (
      id_tiket VARCHAR(30) PRIMARY KEY,
      id_transaksi VARCHAR(30) REFERENCES transaksi_pemesanan(id_transaksi) ON DELETE CASCADE,
      id_petugas_gate VARCHAR(20),
      kode_qr VARCHAR(64) UNIQUE NOT NULL,
      nama_pemegang VARCHAR(100) NOT NULL,
      status_checkin VARCHAR(20) DEFAULT 'belum_checkin',
      waktu_checkin TIMESTAMP
    );
  `;

  await queryDb(schema);

  // Seed users if empty
  const uCheck = await queryDb('SELECT COUNT(*)::int AS cnt FROM pengguna');
  if (uCheck.rows[0].cnt === 0) {
    const users = [
      ['USR-ADM-01', 'Daerobi (Admin EO)', 'admin@tiketkita.id', hashPassword('admin123'), '081210001001', 'admin'],
      ['USR-GAT-01', 'Rizky Pratama (Petugas Gate)', 'gate@tiketkita.id', hashPassword('gate123'), '081210001002', 'gatekeeper'],
      ['USR-USR-01', 'Bagas Adi Saputra', 'bagas@email.com', hashPassword('user123'), '081288904412', 'pelanggan'],
    ];
    for (const u of users) {
      await queryDb(
        'INSERT INTO pengguna (id_pengguna, nama_lengkap, email, password_hash, no_wa, peran) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        u
      );
    }
  }

  // Seed events & categories if empty
  const eCheck = await queryDb('SELECT COUNT(*)::int AS cnt FROM event_konser');
  if (eCheck.rows[0].cnt === 0) {
    const events = [
      ['EV-01', 'USR-ADM-01', 'Soundwave Indie Fest 2026', 'Indie', '14 Nov 2026', '18.00 WIB', 'Lapangan Terbuka Kota', '/posters/poster-soundwave.jpg', 'aktif'],
      ['EV-02', 'USR-ADM-01', 'Acoustic Night Vol. 4', 'Akustik', '28 Nov 2026', '19.00 WIB', 'Amphitheater Taman Kota', '/posters/poster-acoustic.jpg', 'aktif'],
      ['EV-03', 'USR-ADM-01', 'Urban Jazz & Folk Sessions', 'Jazz', '12 Des 2026', '18.30 WIB', 'Gedung Kesenian Daerah', '/posters/poster-jazz.jpg', 'aktif'],
    ];
    for (const e of events) {
      await queryDb(
        'INSERT INTO event_konser (id_event, id_pembuat, nama_event, genre, tanggal_event, waktu_mulai, lokasi_venue, poster_url, status_event) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
        e
      );
    }

    const cats = [
      ['KT-01', 'EV-01', 'Presale 1', 100000, 400, 0],
      ['KT-02', 'EV-01', 'Regular', 150000, 800, 236],
      ['KT-03', 'EV-01', 'VIP Pass', 250000, 300, 80],
      ['KT-04', 'EV-02', 'Regular', 85000, 350, 20],
      ['KT-05', 'EV-02', 'VIP Pass', 150000, 150, 20],
      ['KT-06', 'EV-03', 'Regular', 120000, 600, 380],
      ['KT-07', 'EV-03', 'VIP Lounge', 220000, 200, 110],
    ];
    for (const c of cats) {
      await queryDb(
        'INSERT INTO kategori_tiket (id_kategori, id_event, nama_kategori, harga_tiket, kuota_total, kuota_tersedia) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        c
      );
    }
  }

  // Seed sample transactions if empty
  const tCheck = await queryDb('SELECT COUNT(*)::int AS cnt FROM transaksi_pemesanan');
  if (tCheck.rows[0].cnt === 0) {
    await queryDb(
      `INSERT INTO transaksi_pemesanan (id_transaksi, id_pelanggan, id_kategori, nama_pemesan, no_wa, email_pemesan, jumlah_tiket, total_bayar, metode_bayar, status_bayar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      ['TRX-261101', 'USR-USR-01', 'KT-03', 'Raka Pratama', '081234567890', 'raka@email.com', 2, 505000, 'QRIS Manual', 'pending']
    );
    await queryDb(
      `INSERT INTO transaksi_pemesanan (id_transaksi, id_pelanggan, id_kategori, nama_pemesan, no_wa, email_pemesan, jumlah_tiket, total_bayar, metode_bayar, status_bayar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      ['TRX-261102', 'USR-USR-01', 'KT-02', 'Dimas Anggara', '081298765432', 'dimas@email.com', 1, 155000, 'QRIS Otomatis', 'lunas']
    );
    await queryDb(
      `INSERT INTO tiket_detail (id_tiket, id_transaksi, kode_qr, nama_pemegang, status_checkin)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      ['TKT-2611-002', 'TRX-261102', 'TKT-2611-002', 'Dimas Anggara', 'belum_checkin']
    );
  }
  console.log('PostgreSQL db_webkonser initialized & seeded.');
}

if (require.main === module) {
  initPostgres().catch((err) => {
    console.error('Init failed:', err);
    process.exit(1);
  });
}

module.exports = { initPostgres, hashPassword };
