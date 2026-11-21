'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');

  function redirectByRole(user: { peran: string }) {
    localStorage.setItem('tiketkita_user', JSON.stringify(user));
    if (user.peran === 'admin') router.push('/dashboard');
    else if (user.peran === 'gatekeeper') router.push('/gate');
    else router.push('/');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || 'Gagal login.');
    redirectByRole(data.user);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_lengkap: nama, email, no_wa: wa, password }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || 'Gagal mendaftar.');
    redirectByRole(data.user);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 px-4 py-10 flex items-center justify-center">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-blue-900/10 md:grid-cols-12">
        <div className="flex flex-col justify-between bg-gradient-to-br from-blue-600 to-sky-500 p-8 text-white md:col-span-5 md:p-10">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                <Ticket className="h-5 w-5" />
              </div>
              <span className="text-lg font-extrabold tracking-tight">TiketKita</span>
            </Link>
            <h1 className="mt-10 text-2xl font-extrabold leading-tight tracking-tight">
              Satu Portal Masuk untuk Penonton, Admin EO, &amp; Petugas Gate.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              Sistem otomatis mengarahkan Anda ke halaman yang sesuai dengan peran akun Anda.
            </p>
          </div>

          <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs backdrop-blur">
            <div className="font-bold uppercase tracking-wider text-sky-100">Akun Uji Coba (Klik untuk Isi Otomatis)</div>
            <div className="mt-2.5 space-y-1.5 text-blue-50">
              <button type="button" onClick={() => { setMode('login'); setErr(''); setEmail('admin@tiketkita.id'); setPassword('admin123'); }} className="flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-left transition hover:bg-white/20">
                <span>Admin EO: <span className="font-mono font-semibold">admin@tiketkita.id</span></span>
                <span className="font-mono text-[11px] opacity-90">admin123</span>
              </button>
              <button type="button" onClick={() => { setMode('login'); setErr(''); setEmail('gate@tiketkita.id'); setPassword('gate123'); }} className="flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-left transition hover:bg-white/20">
                <span>Petugas Gate: <span className="font-mono font-semibold">gate@tiketkita.id</span></span>
                <span className="font-mono text-[11px] opacity-90">gate123</span>
              </button>
              <button type="button" onClick={() => { setMode('login'); setErr(''); setEmail('bagas@email.com'); setPassword('user123'); }} className="flex w-full items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-left transition hover:bg-white/20">
                <span>Penonton: <span className="font-mono font-semibold">bagas@email.com</span></span>
                <span className="font-mono text-[11px] opacity-90">user123</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-8 md:col-span-7 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                {mode === 'login' ? 'Masuk ke Akun' : 'Daftar Akun Penonton'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">Gunakan email dan kata sandi yang terdaftar.</p>
            </div>
            <Link href="/" className="text-xs font-bold text-blue-600 hover:underline">Kembali ke Beranda</Link>
          </div>

          <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => { setMode('login'); setErr(''); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setMode('register'); setErr(''); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold ${mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}
            >
              Daftar Penonton
            </button>
          </div>

          {err && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">
              {err}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contoh@email.com" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Kata Sandi</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Masukkan kata sandi" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10" />
              </div>
              <button type="submit" className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.99]">
                Masuk Sekarang
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Nama Lengkap</label>
                <input type="text" required value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap Anda" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">Alamat Email</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@anda.com" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-700">No. WhatsApp</label>
                  <input type="text" required value={wa} onChange={(e) => setWa(e.target.value)} placeholder="0812xxxxxxxx" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Kata Sandi</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <button type="submit" className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700">
                Buat Akun Penonton
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
