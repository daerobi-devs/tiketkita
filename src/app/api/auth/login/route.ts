import { NextResponse } from 'next/server';
import { queryDb, hashPassword } from '@/lib/daeroom';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan kata sandi wajib diisi.' }, { status: 400 });
    }
    const pwHash = hashPassword(password);
    const r = await queryDb(
      'SELECT id_pengguna, nama_lengkap, email, no_wa, peran FROM pengguna WHERE LOWER(email) = LOWER($1) AND password_hash = $2 AND status_aktif = TRUE',
      [email.trim(), pwHash]
    );
    if (!r.rows.length) {
      return NextResponse.json({ error: 'Email atau kata sandi salah.' }, { status: 401 });
    }
    return NextResponse.json({ user: r.rows[0] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
