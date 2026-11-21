'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket, ShieldCheck, Search, MapPin, Calendar, ArrowRight, Menu, X } from 'lucide-react';

interface Category {
  id_kategori: string;
  nama_kategori: string;
  harga_tiket: number;
  kuota_total: number;
  kuota_tersedia: number;
}

interface EventItem {
  id_event: string;
  nama_event: string;
  genre: string;
  tanggal_event: string;
  waktu_mulai: string;
  lokasi_venue: string;
  poster_url: string;
  poster_ratio?: 'landscape' | 'portrait';
  categories: Category[];
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [genre, setGenre] = useState('Semua');
  const [query, setQuery] = useState('');
  const [user, setUser] = useState<{ nama_lengkap: string; peran: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tiketkita_user');
    if (saved) setUser(JSON.parse(saved));
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .catch(() => {});
  }, []);

  function logout() {
    localStorage.removeItem('tiketkita_user');
    setUser(null);
  }

  const filtered = events.filter((ev) => {
    const mg = genre === 'Semua' || ev.genre === genre;
    const q = query.trim().toLowerCase();
    const mq = !q || ev.nama_event.toLowerCase().includes(q) || ev.lokasi_venue.toLowerCase().includes(q) || ev.genre.toLowerCase().includes(q);
    return mg && mq;
  });

  const featured = events[0];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-blue-500/25">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Tiket<span className="text-blue-600">Kita</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#top" className="text-blue-600">Beranda</a>
            <a href="#konser" className="transition-colors hover:text-blue-600">Daftar Konser</a>
            <Link href="/tiket-saya" className="transition-colors hover:text-blue-600">Tiket Saya</Link>
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  {user.peran === 'admin' && (
                    <Link href="/dashboard" className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
                      Dashboard Admin
                    </Link>
                  )}
                  {user.peran === 'gatekeeper' && (
                    <Link href="/gate" className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
                      Portal Gate
                    </Link>
                  )}
                  {user.peran === 'pelanggan' && (
                    <Link href="/tiket-saya" className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700">
                      {user.nama_lengkap.split(' ')[0]} &bull; Tiket Saya
                    </Link>
                  )}
                  <button
                    onClick={logout}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
                  >
                    Keluar
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700 active:scale-[0.98]"
                >
                  Masuk
                </Link>
              )}
            </div>
            <a
              href="#konser"
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-blue-600/25 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:scale-[0.98] sm:px-4"
            >
              Cari Tiket
            </a>
            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle Navigasi"
              className="rounded-xl border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 md:hidden"
            >
              {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col space-y-2 text-xs font-bold text-slate-700">
              <a
                href="#top"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl px-3 py-2 text-blue-600 hover:bg-blue-50"
              >
                Beranda
              </a>
              <a
                href="#konser"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl px-3 py-2 hover:bg-slate-50"
              >
                Daftar Konser
              </a>
              <Link
                href="/tiket-saya"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl px-3 py-2 hover:bg-slate-50"
              >
                Tiket Saya
              </Link>
              <div className="border-t border-slate-100 pt-2">
                {user ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {user.peran === 'admin' && (
                      <Link
                        href="/dashboard"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center font-bold text-blue-700"
                      >
                        Dashboard Admin
                      </Link>
                    )}
                    {user.peran === 'gatekeeper' && (
                      <Link
                        href="/gate"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center font-bold text-blue-700"
                      >
                        Portal Gate
                      </Link>
                    )}
                    {user.peran === 'pelanggan' && (
                      <Link
                        href="/tiket-saya"
                        onClick={() => setMobileNavOpen(false)}
                        className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center font-bold text-blue-700"
                      >
                        Dashboard ({user.nama_lengkap.split(' ')[0]})
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setMobileNavOpen(false);
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 font-bold text-rose-600"
                    >
                      Keluar
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileNavOpen(false)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center font-bold text-slate-700"
                  >
                    Masuk / Daftar Akun
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="hero-mesh border-b border-slate-100">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 sm:px-5 lg:grid-cols-12 lg:gap-12 lg:py-20">
          <div className="lg:col-span-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-blue-50/90 px-3 py-1 text-[11px] font-bold text-blue-700 sm:mb-5 sm:px-3.5 sm:text-xs">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />
              Platform Resmi E-Ticketing Konser &amp; Festival Lokal
            </div>

            <h1 className="text-3xl font-extrabold leading-[1.14] tracking-tight text-slate-900 sm:text-5xl">
              Amankan Tiket <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Konser Lokal</span> Favoritmu Tanpa Antre.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Pantau sisa kuota kategori secara real-time langsung dari PostgreSQL. Bayar praktis lewat QRIS dan langsung dapatkan E-Ticket QR Code resmi untuk akses cepat di gerbang venue.
            </p>

            <div className="mt-6 flex max-w-xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/[0.04] focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-500/10 sm:mt-7">
              <div className="pl-2.5 text-slate-400 sm:pl-3">
                <Search className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari konser, genre, atau lokasi..."
                className="min-w-0 flex-1 bg-transparent py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-sm"
              />
              <a
                href="#konser"
                className="shrink-0 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98] sm:px-5 sm:py-2.5"
              >
                Cari
              </a>
            </div>

            <div className="mt-7 grid max-w-lg grid-cols-3 gap-3 border-t border-slate-200/70 pt-5 sm:mt-8 sm:gap-6 sm:pt-6">
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl">100%</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">Kuota Real-Time</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl">QRIS</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">Pembayaran Instan</div>
              </div>
              <div>
                <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl">&lt; 3 dtk</div>
                <div className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">Validasi Gate</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="group overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl shadow-blue-900/10 transition-all duration-300 hover:-translate-y-1">
              <div className="relative h-64 overflow-hidden bg-slate-900">
                <img
                  src={featured?.poster_url || '/posters/poster-soundwave.jpg'}
                  alt={featured?.nama_event || 'Soundwave Indie Fest 2026'}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                <div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-blue-700 shadow-sm">
                  Event Unggulan
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <div className="text-xs font-semibold text-sky-300">
                    {featured ? `${featured.tanggal_event} • ${featured.waktu_mulai}` : '14 Nov 2026 • 18.00 WIB'}
                  </div>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                    {featured?.nama_event || 'Soundwave Indie Fest 2026'}
                  </h2>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-200">
                    <MapPin className="h-3.5 w-3.5 text-sky-400" />
                    {featured?.lokasi_venue || 'Lapangan Terbuka Kota'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-white px-5 py-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Harga Mulai</div>
                  <div className="text-lg font-extrabold text-blue-600">
                    Rp {(featured?.categories?.[0]?.harga_tiket || 100000).toLocaleString('id-ID')}
                  </div>
                </div>
                <Link
                  href={`/beli/${featured?.id_event || 'EV-01'}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-[0.98]"
                >
                  Pesan Tiket
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section id="konser" className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Konser &amp; Event Mendatang</h2>
            <p className="mt-1.5 text-sm text-slate-500">Pilih pertunjukan musik lokal dan pantau ketersediaan kuota secara langsung.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Semua', 'Indie', 'Akustik', 'Jazz'].map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={
                  genre === g
                    ? 'rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all'
                    : 'rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                }
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => {
            const total = ev.categories.reduce((a, c) => a + c.kuota_total, 0);
            const sisa = ev.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
            const sold = total - sisa;
            const pct = total ? Math.round((sold / total) * 100) : 0;
            const minPrice = ev.categories.length ? Math.min(...ev.categories.map((c) => c.harga_tiket)) : 0;
            const isLow = sisa <= 50;

            return (
              <article
                key={ev.id_event}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/[0.06]"
              >
                <div className={`relative overflow-hidden bg-slate-900 ${ev.poster_ratio === 'portrait' ? 'aspect-[3/4]' : 'h-48'}`}>
                  <img src={ev.poster_url} alt={ev.nama_event} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <span className={`absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm ${isLow ? 'border border-amber-200 bg-amber-50 text-amber-700' : 'bg-white/95 text-blue-700'}`}>
                    {isLow ? 'Hampir Habis' : 'Tersedia'}
                  </span>
                  <span className="absolute bottom-3 left-3.5 rounded-md bg-slate-950/70 px-2 py-0.5 text-[11px] font-semibold text-sky-200 backdrop-blur">
                    {ev.genre}
                  </span>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">{ev.nama_event}</h3>
                    <div className="mt-2.5 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" />
                        {ev.tanggal_event} &bull; {ev.waktu_mulai}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        {ev.lokasi_venue}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-50">
                        <div className={`h-full rounded-full ${isLow ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] font-semibold">
                        <span className={isLow ? 'text-amber-600' : 'text-blue-600'}>
                          {sold.toLocaleString('id-ID')} / {total.toLocaleString('id-ID')} terjual
                        </span>
                        <span className="text-slate-400">Sisa {sisa}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Mulai dari</div>
                      <div className="text-base font-extrabold text-slate-900">Rp {minPrice.toLocaleString('id-ID')}</div>
                    </div>
                    <Link
                      href={`/beli/${ev.id_event}`}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-blue-700 active:scale-[0.98]"
                    >
                      Beli Tiket
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="cara-kerja" className="border-t border-slate-100 bg-slate-50/70 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">Alur Pemesanan Cepat</span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Dari Pilih Konser Sampai Masuk Venue</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['01', 'Pilih Konser & Kategori', 'Pilih jadwal konser dan kelas tiket (Presale, Regular, atau VIP) dengan sisa kuota yang selalu terpantau real-time.'],
              ['02', 'Bayar Praktis via QRIS', 'Selesaikan pembayaran menggunakan QRIS dengan dukungan verifikasi otomatis maupun konfirmasi admin yang aman.'],
              ['03', 'Scan QR di Pintu Masuk', 'Tunjukkan E-Ticket QR Code unik dari smartphone kepada petugas gate untuk validasi instan kurang dari 3 detik.'],
            ].map(([no, title, desc]) => (
              <div key={no} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 font-mono text-sm font-bold text-blue-600">{no}</div>
                <h3 className="text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-xs text-slate-500 sm:flex-row">
          <div className="font-medium">&copy; 2026 TiketKita &mdash; Sistem Informasi Penjualan Tiket Event &amp; Konser Lokal</div>
          <div className="flex items-center gap-5 font-semibold text-slate-600">
            <a href="#konser" className="hover:text-blue-600">Katalog Event</a>
            <Link href="/login" className="hover:text-blue-600">Portal Staf EO</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
