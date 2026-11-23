import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/daeroom';
import { requestOtp } from '@/lib/maildaeroom';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Alamat email wajib diisi.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await queryDb<{ id_pengguna: string }>(
      'SELECT id_pengguna FROM pengguna WHERE LOWER(email) = LOWER($1)',
      [cleanEmail]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Email tidak ditemukan di sistem.' }, { status: 404 });
    }

    const otpRes = await requestOtp({
      recipient: cleanEmail,
      channel: 'email',
      actionName: 'reset kata sandi akun TiketKita',
      lang: 'id',
      expiresInMinutes: 5,
    });

    if (otpRes?.error && !otpRes?.success) {
      return NextResponse.json(
        { error: otpRes.error || otpRes.message || 'Gagal mengirim kode OTP reset sandi.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Kode OTP 6 digit untuk reset sandi telah dikirim ke ${cleanEmail}.`,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
