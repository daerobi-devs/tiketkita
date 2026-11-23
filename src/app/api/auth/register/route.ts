import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { queryDb, hashPassword } from '@/lib/daeroom';
import { verifyOtp } from '@/lib/maildaeroom';

export async function POST(req: Request) {
  try {
    const { nama_lengkap, email, password, no_wa, otp_code } = await req.json();

    if (!nama_lengkap?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Nama, email, dan kata sandi wajib diisi.' }, { status: 400 });
    }

    const cleanWa = String(no_wa || '').trim();
    if (cleanWa && !/^[0-9]{10,15}$/.test(cleanWa)) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak valid (gunakan 10–15 digit angka).' },
        { status: 400 }
      );
    }

    const cleanOtp = String(otp_code || '').trim();
    if (!/^[0-9]{6}$/.test(cleanOtp)) {
      return NextResponse.json({ error: 'Masukkan kode OTP 6 digit yang dikirim ke email Anda.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const verifyRes = await verifyOtp({ recipient: cleanEmail, code: cleanOtp });
    if (!verifyRes?.success && !verifyRes?.valid) {
      return NextResponse.json(
        { error: verifyRes?.error || verifyRes?.message || 'Kode OTP salah atau sudah kedaluwarsa.' },
        { status: 400 }
      );
    }

    const id = 'USR-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const pwHash = hashPassword(password);
    await queryDb(
      'INSERT INTO pengguna (id_pengguna, nama_lengkap, email, password_hash, no_wa, peran) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, nama_lengkap.trim(), cleanEmail, pwHash, cleanWa, 'pelanggan']
    );

    return NextResponse.json({
      user: { id_pengguna: id, nama_lengkap: nama_lengkap.trim(), email: cleanEmail, no_wa: cleanWa, peran: 'pelanggan' },
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('unique')) {
      return NextResponse.json({ error: 'Email sudah terdaftar.' }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
