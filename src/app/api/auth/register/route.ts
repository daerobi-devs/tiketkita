import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb, hashPassword } from '@/lib/daeroom';

export async function POST(req: Request) {
  try {
    const { nama_lengkap, email, password, no_wa } = await req.json();
    if (!nama_lengkap || !email || !password) {
      return NextResponse.json({ error: 'Nama, email, dan kata sandi wajib diisi.' }, { status: 400 });
    }
    const id = 'USR-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const pwHash = hashPassword(password);
    await queryDb(
      'INSERT INTO pengguna (id_pengguna, nama_lengkap, email, password_hash, no_wa, peran) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, nama_lengkap.trim(), email.trim().toLowerCase(), pwHash, no_wa || '', 'pelanggan']
    );
    return NextResponse.json({
      user: { id_pengguna: id, nama_lengkap, email: email.trim().toLowerCase(), peran: 'pelanggan' },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('unique')) {
      return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
