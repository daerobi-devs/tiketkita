import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';
import { requestOtp } from '@/lib/maildaeroom';

export async function POST(req: Request) {
  try {
    const { nama_lengkap, email, no_wa, password } = await req.json();

    if (!nama_lengkap?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' }, { status: 400 });
    }

    const cleanWa = String(no_wa || '').trim();
    if (cleanWa && !/^[0-9]{10,15}$/.test(cleanWa)) {
      return NextResponse.json(
        { error: 'Nomor telepon tidak valid (gunakan 10–15 digit angka).' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryDb<{ id_pengguna: string }>(
      'SELECT id_pengguna FROM pengguna WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email sudah terdaftar. Silakan masuk menggunakan akun Anda.' }, { status: 409 });
    }

    const otpRes = await requestOtp({
      recipient: cleanEmail,
      channel: 'email',
      actionName: 'verifikasi pendaftaran akun TiketKita',
      lang: 'id',
      expiresInMinutes: 5,
    });

    if (otpRes?.error && !otpRes?.success) {
      return NextResponse.json(
        { error: otpRes.error || otpRes.message || 'Gagal mengirim kode OTP ke email.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Kode OTP 6 digit telah dikirim ke ${cleanEmail}. Berlaku 5 menit.`,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
