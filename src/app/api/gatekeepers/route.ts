import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb, hashPassword } from '@/lib/daeroom';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const r = await queryDb(`
      SELECT
        p.id_pengguna,
        p.nama_lengkap,
        p.email,
        p.no_wa,
        p.status_aktif,
        COUNT(td.id_tiket) FILTER (WHERE td.status_checkin = 'sudah_checkin')::int AS total_scan,
        MAX(td.waktu_checkin) AS last_scan_at
      FROM pengguna p
      LEFT JOIN tiket_detail td ON td.id_petugas_gate = p.id_pengguna
      WHERE p.peran = 'gatekeeper'
      GROUP BY p.id_pengguna, p.nama_lengkap, p.email, p.no_wa, p.status_aktif
      ORDER BY p.id_pengguna ASC
    `);
    return NextResponse.json({ gatekeepers: r.rows }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nama_lengkap, email, password, no_wa } = await req.json();
    if (!nama_lengkap?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Nama petugas, email, dan kata sandi wajib diisi.' }, { status: 400 });
    }
    const cleanWa = String(no_wa || '').trim().replace(/[^0-9]/g, '');
    const id = 'USR-GAT-' + crypto.randomBytes(2).toString('hex').toUpperCase();
    const pwHash = hashPassword(password);

    await queryDb(
      'INSERT INTO pengguna (id_pengguna, nama_lengkap, email, password_hash, no_wa, peran, status_aktif) VALUES ($1,$2,$3,$4,$5,$6,TRUE)',
      [id, nama_lengkap.trim(), email.trim().toLowerCase(), pwHash, cleanWa, 'gatekeeper']
    );

    return NextResponse.json({
      success: true,
      gatekeeper: { id_pengguna: id, nama_lengkap: nama_lengkap.trim(), email: email.trim().toLowerCase(), no_wa: cleanWa, status_aktif: true },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('unique')) {
      return NextResponse.json({ error: 'Email tersebut sudah terdaftar di sistem.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
