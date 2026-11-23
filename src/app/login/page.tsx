'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ShieldCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');

  // OTP states (shared cooldown 60s anti-spam)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redir = params.get('redirect');
    if (redir && redir.startsWith('/')) {
      setRedirectTo(redir);
      setInfo('Silakan masuk atau daftar akun terlebih dahulu untuk melanjutkan pemesanan tiket.');
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function redirectByRole(user: { peran: string }) {
    localStorage.setItem('tiketkita_user', JSON.stringify(user));
    if (redirectTo && user.peran === 'pelanggan') {
      router.push(redirectTo);
      return;
    }
    if (user.peran === 'admin') router.push('/dashboard');
    else if (user.peran === 'gatekeeper') router.push('/gate');
    else router.push('/tiket-saya');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setInfo('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || 'Gagal login.');
    redirectByRole(data.user);
  }

  async function handleRequestRegisterOtp(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    setErr('');
    setInfo('');
    if (wa && !/^[0-9]{10,15}$/.test(wa)) {
      return setErr('Nomor telepon tidak valid (gunakan 10–15 digit angka).');
    }
    setLoading(true);
    const res = await fetch('/api/auth/register/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_lengkap: nama, email, no_wa: wa, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || 'Gagal mengirim kode OTP.');
    setOtpSent(true);
    setCooldown(60);
    setInfo(data.message || `Kode OTP 6 digit telah dikirim ke ${email}.`);
  }

  async function handleVerifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setInfo('');
    if (!/^[0-9]{6}$/.test(otpCode)) {
      return setErr('Masukkan kode OTP 6 digit berupa angka.');
    }
    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_lengkap: nama, email, no_wa: wa, password, otp_code: otpCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || 'Verifikasi OTP gagal.');
    redirectByRole(data.user);
  }

  async function handleRequestForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    setErr('');
    setInfo('');
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || 'Gagal mengirim OTP reset sandi.');
    setOtpSent(true);
    setCooldown(60);
    setInfo(data.message || `Kode OTP 6 digit telah dikirim ke ${email}.`);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setInfo('');
    if (!/^[0-9]{6}$/.test(otpCode)) {
      return setErr('Masukkan kode OTP 6 digit berupa angka.');
    }
    if (newPassword.length < 6) {
      return setErr('Kata sandi baru minimal 6 karakter.');
    }
    setLoading(true);
    const res = await fetch('/api/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || 'Gagal memperbarui kata sandi.');

    // Kembali ke tab login dengan email terisi & pesan sukses
    setMode('login');
    setOtpSent(false);
    setOtpCode('');
    setPassword('');
    setNewPassword('');
    setInfo(data.message || 'Kata sandi berhasil diperbarui. Silakan masuk sekarang.');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50 px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-blue-900/10 md:grid-cols-12">
        <div className="flex flex-col justify-between bg-gradient-to-br from-blue-600 to-sky-500 p-8 text-white md:col-span-5 md:p-10">
          <div>
            <Link href="/" className="inline-flex items-center rounded-2xl bg-white px-3.5 py-2 shadow-sm">
              <img src="/brand/logo-horizontal.png" alt="TiketKita" className="h-8 w-auto object-contain" />
            </Link>
            <h1 className="mt-10 text-2xl font-extrabold leading-tight tracking-tight">
              Satu Portal Masuk untuk Penonton, Admin EO, &amp; Petugas Gate.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              Pendaftaran akun dan reset sandi dilengkapi verifikasi kode OTP 6 digit ke email Anda.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs backdrop-blur">
            <div className="font-bold uppercase tracking-wider text-sky-100">Akun Uji Coba (Klik untuk Isi Otomatis)</div>
            <div className="mt-2.5 space-y-1.5 text-blue-50">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setOtpSent(false);
                  setErr('');
                  setInfo('');
                  setEmail('admin@tiketkita.id');
                  setPassword('admin123');
                }}
                className="flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-left transition hover:bg-white/20"
              >
                <span>
                  Admin EO: <span className="font-mono font-semibold">admin@tiketkita.id</span>
                </span>
                <span className="font-mono text-[11px] opacity-90">admin123</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setOtpSent(false);
                  setErr('');
                  setInfo('');
                  setEmail('gate@tiketkita.id');
                  setPassword('gate123');
                }}
                className="flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-left transition hover:bg-white/20"
              >
                <span>
                  Petugas Gate: <span className="font-mono font-semibold">gate@tiketkita.id</span>
                </span>
                <span className="font-mono text-[11px] opacity-90">gate123</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setOtpSent(false);
                  setErr('');
                  setInfo('');
                  setEmail('bagas@email.com');
                  setPassword('user123');
                }}
                className="flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-left transition hover:bg-white/20"
              >
                <span>
                  Penonton: <span className="font-mono font-semibold">bagas@email.com</span>
                </span>
                <span className="font-mono text-[11px] opacity-90">user123</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 md:col-span-7 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {mode === 'login'
                  ? 'Masuk ke Akun'
                  : mode === 'register'
                    ? 'Daftar Akun Penonton'
                    : 'Reset Kata Sandi'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {mode === 'login'
                  ? 'Gunakan email dan kata sandi yang terdaftar.'
                  : mode === 'register'
                    ? 'Verifikasi pendaftaran menggunakan 1 kode OTP ke email Anda.'
                    : 'Masukkan email akun Anda untuk menerima kode OTP reset sandi.'}
              </p>
            </div>
            <Link href="/" className="text-xs font-bold text-blue-600 hover:underline">
              Kembali ke Beranda
            </Link>
          </div>

          <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErr('');
                setInfo('');
                setOtpSent(false);
                setOtpCode('');
              }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
                mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErr('');
                setInfo('');
                setOtpSent(false);
                setOtpCode('');
              }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
                mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Daftar Penonton
            </button>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
              {err}
            </div>
          )}

          {info && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700">
              {info}
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setOtpSent(false);
                      setOtpCode('');
                      setNewPassword('');
                      setErr('');
                      setInfo('');
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? 'Memproses...' : 'Masuk Sekarang'}
              </button>
            </form>
          )}

          {/* MODE 2: REGISTER */}
          {mode === 'register' && !otpSent && (
            <form onSubmit={handleRequestRegisterOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email (Penerima OTP)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@anda.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Nomor Telepon (Opsional)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    value={wa}
                    onChange={(e) => setWa(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="081234567890"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Kata Sandi</label>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {loading
                  ? 'Mengirim OTP ke Email...'
                  : cooldown > 0
                    ? `Tunggu ${cooldown} detik...`
                    : 'Kirim Kode OTP ke Email'}
              </button>
            </form>
          )}

          {mode === 'register' && otpSent && (
            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600">
                Masukkan <strong>6 digit kode OTP</strong> yang telah dikirim ke{' '}
                <span className="font-mono font-bold text-blue-700">{email}</span>.
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Kode OTP (6 Digit)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-center font-mono text-xl font-extrabold tracking-[0.4em] text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <ShieldCheck className="h-4 w-4" />
                {loading ? 'Memverifikasi OTP...' : 'Verifikasi OTP & Buat Akun'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setErr('');
                    setInfo('');
                  }}
                  className="font-bold text-slate-500 hover:text-slate-700"
                >
                  Ubah Data Pendaftaran
                </button>
                <button
                  type="button"
                  disabled={loading || cooldown > 0}
                  onClick={handleRequestRegisterOtp}
                  className="font-bold text-blue-600 hover:underline disabled:text-slate-400"
                >
                  {cooldown > 0 ? `Kirim Ulang (${cooldown}d)` : 'Kirim Ulang OTP'}
                </button>
              </div>
            </form>
          )}

          {/* MODE 3: FORGOT PASSWORD (1x OTP + COOLDOWN 60s) */}
          {mode === 'forgot' && !otpSent && (
            <form onSubmit={handleRequestForgotOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email Terdaftar</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@anda.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {loading
                  ? 'Mengirim Kode OTP...'
                  : cooldown > 0
                    ? `Tunggu ${cooldown} detik...`
                    : 'Kirim Kode OTP Reset'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErr('');
                    setInfo('');
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Kembali ke Halaman Masuk
                </button>
              </div>
            </form>
          )}

          {mode === 'forgot' && otpSent && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-600">
                Masukkan <strong>kode OTP 6 digit</strong> dari{' '}
                <span className="font-mono font-bold text-blue-700">{email}</span> dan kata sandi baru Anda.
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Kode OTP (6 Digit)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center font-mono text-lg font-extrabold tracking-[0.4em] text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Kata Sandi Baru</label>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {loading ? 'Menyimpan Sandi Baru...' : 'Simpan Kata Sandi Baru'}
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtpCode('');
                    setErr('');
                    setInfo('');
                  }}
                  className="font-bold text-slate-500 hover:text-slate-700"
                >
                  Ganti Email
                </button>
                <button
                  type="button"
                  disabled={loading || cooldown > 0}
                  onClick={handleRequestForgotOtp}
                  className="font-bold text-blue-600 hover:underline disabled:text-slate-400"
                >
                  {cooldown > 0 ? `Kirim Ulang (${cooldown}d)` : 'Kirim Ulang OTP'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
