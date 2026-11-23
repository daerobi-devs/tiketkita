import { NextResponse } from 'next/server';
import { queryDb, hashPassword } from '@/lib/daeroom';
import { verifyOtp } from '@/lib/maildaeroom';

export async function POST(req: Request) {
  try {
    const { email, otp_code, new_password } = await req.json();
    if (!email?.trim() || !otp_code || !new_password) {
      return NextResponse.json({ error: 'Email, kode OTP, dan kata sandi baru wajib diisi.' }, { status: 400 });
    }
    if (String(new_password).length < 6) {
      return NextResponse.json({ error: 'Kata sandi baru minimal 6 karakter.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp_code).trim();
    if (!/^[0-9]{6}$/.test(cleanOtp)) {
      return NextResponse.json({ error: 'Kode OTP harus berupa 6 digit angka.' }, { status: 400 });
    }

    const verifyRes = await verifyOtp({ recipient: cleanEmail, code: cleanOtp });
    if (!verifyRes?.success && !verifyRes?.valid && !verifyRes?.verified) {
      return NextResponse.json(
        { error: verifyRes?.error || verifyRes?.message || 'Kode OTP salah atau sudah kedaluwarsa.' },
        { status: 400 }
      );
    }

    const pwHash = hashPassword(new_password);
    await queryDb('UPDATE pengguna SET password_hash = $1 WHERE LOWER(email) = LOWER($2)', [pwHash, cleanEmail]);

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.',
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
