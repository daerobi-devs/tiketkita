'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Ticket,
  Calendar,
  MapPin,
  Download,
  Printer,
  Music,
  User,
  LogOut,
  RefreshCw,
  ClipboardList,
  ArrowRight,
  Home,
  Menu,
  X,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface UserData {
  id_pengguna?: string;
  nama_lengkap: string;
  email: string;
  no_wa?: string;
  peran?: string;
}

interface OrderItem {
  id_transaksi: string;
  nama_pemesan: string;
  nama_event: string;
  nama_kategori: string;
  tanggal_event: string;
  lokasi_venue: string;
  jumlah_tiket: number;
  total_bayar: number;
  metode_bayar: string;
  status_bayar: string;
  qris_string?: string | null;
}

interface TicketDetail {
  id_tiket: string;
  id_transaksi: string;
  kode_qr: string;
  status_checkin: string;
}

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

export default function TiketSayaPage() {
  const router = useRouter();
  const [panel, setPanel] = useState<'orders' | 'concerts' | 'profile'>('orders');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tickets, setTickets] = useState<TicketDetail[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Modal Bayar QRIS Ulang untuk order pending
  const [payModalOrder, setPayModalOrder] = useState<OrderItem | null>(null);
  const [payQrImg, setPayQrImg] = useState('');
  const [payPaid, setPayPaid] = useState(false);
  const [copiedNominal, setCopiedNominal] = useState(false);

  async function openPayModal(order: OrderItem) {
    if (!order.qris_string) return;
    const img = await QRCode.toDataURL(order.qris_string, {
      width: 280,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });
    setPayQrImg(img);
    setPayPaid(false);
    setPayModalOrder(order);
  }

  function printSingleTicket(order: OrderItem, ticket: TicketDetail) {
    const qrSrc = qrMap[ticket.kode_qr] || '';
    const win = window.open('', '_blank', 'width=520,height=720');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>E-Ticket ${ticket.kode_qr} - TiketKita</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; padding: 28px; display: flex; justify-content: center; }
    .ticket { width: 100%; max-width: 420px; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 20px; overflow: hidden; }
    .head { background: #2563eb; color: #ffffff; padding: 20px 24px; }
    .brand { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9; }
    .ev { font-size: 20px; font-weight: 800; margin-top: 6px; }
    .body { padding: 22px 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .divider { border-top: 2px dashed #e2e8f0; margin: 18px 0; }
    .qr-box { text-align: center; }
    .qr-box img { width: 200px; height: 200px; border: 1px solid #e2e8f0; border-radius: 14px; padding: 8px; }
    .code { font-family: monospace; font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 10px; letter-spacing: 0.06em; }
    .note { font-size: 11px; color: #64748b; margin-top: 6px; }
    @media print { body { background: #ffffff; padding: 0; } .ticket { border: 1px solid #94a3b8; } }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="head">
      <div class="brand">TiketKita &bull; Official E-Ticket</div>
      <div class="ev">${order.nama_event}</div>
    </div>
    <div class="body">
      <div class="grid">
        <div><div class="lbl">Pemegang Tiket</div><div class="val">${order.nama_pemesan}</div></div>
        <div><div class="lbl">Kategori</div><div class="val">${order.nama_kategori}</div></div>
        <div><div class="lbl">Tanggal</div><div class="val">${order.tanggal_event}</div></div>
        <div><div class="lbl">Lokasi Venue</div><div class="val">${order.lokasi_venue}</div></div>
        <div><div class="lbl">ID Transaksi</div><div class="val">${order.id_transaksi}</div></div>
        <div><div class="lbl">Status</div><div class="val">LUNAS</div></div>
      </div>
      <div class="divider"></div>
      <div class="qr-box">
        ${qrSrc ? `<img src="${qrSrc}" alt="${ticket.kode_qr}" />` : ''}
        <div class="code">${ticket.kode_qr}</div>
        <div class="note">Tunjukkan QR Code ini kepada Petugas Gate saat memasuki venue.</div>
      </div>
    </div>
  </div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
</body>
</html>`);
    win.document.close();
  }

  useEffect(() => {
    if (!payModalOrder || payPaid) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${payModalOrder.id_transaksi}/status`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status_bayar === 'lunas') {
          setPayPaid(true);
          clearInterval(timer);
          loadAll(user);
        }
      } catch {
        // ignore transient polling error
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [payModalOrder, payPaid, user]);

  async function loadAll(currentUser: UserData | null) {
    setLoading(true);
    const ordUrl =
      currentUser?.email && currentUser.peran === 'pelanggan'
        ? `/api/orders?email=${encodeURIComponent(currentUser.email)}`
        : '/api/orders';

    const [ordRes, evRes] = await Promise.all([fetch(ordUrl), fetch('/api/events')]);
    const ordData = await ordRes.json();
    const evData = await evRes.json();

    setOrders(ordData.orders || []);
    const tkts: TicketDetail[] = ordData.tickets || [];
    setTickets(tkts);
    setEvents(evData.events || []);

    const map: Record<string, string> = {};
    for (const t of tkts) {
      map[t.kode_qr] = await QRCode.toDataURL(t.kode_qr, {
        width: 240,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
    }
    setQrMap(map);
    setLoading(false);
  }

  useEffect(() => {
    const saved = localStorage.getItem('tiketkita_user');
    const parsed: UserData | null = saved ? JSON.parse(saved) : null;
    setUser(parsed);
    loadAll(parsed);
  }, []);

  function logout() {
    localStorage.removeItem('tiketkita_user');
    router.push('/login');
  }

  async function deleteRejectedOrder(id: string) {
    if (!confirm('Hapus riwayat transaksi ditolak ini dari daftar Anda?')) return;
    await fetch(`/api/orders/${id}`, { method: 'DELETE' });
    loadAll(user);
  }

  const lunasCount = orders.filter((o) => o.status_bayar === 'lunas').length;
  const pendingCount = orders.filter((o) => o.status_bayar === 'pending').length;
  const activeTicketCount = tickets.filter((t) =>
    orders.some((o) => o.id_transaksi === t.id_transaksi)
  ).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden print:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Buka Menu"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <img src="/brand/logo-horizontal.png" alt="TiketKita" className="h-7 w-auto object-contain" />
            <div className="text-[10px] font-semibold text-slate-400">Dashboard Pembeli</div>
          </div>
        </div>
        <button
          onClick={() => setPanel(panel === 'concerts' ? 'orders' : 'concerts')}
          className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          {panel === 'concerts' ? 'Tiket Saya' : 'Cari Konser'}
        </button>
      </header>

      {/* MOBILE BACKDROP */}
      {mobileNavOpen && (
        <div
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden print:hidden"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-5 transition-transform duration-200 md:static md:translate-x-0 print:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-5">
            <Link href="/" className="block">
              <img src="/brand/logo-horizontal.png" alt="TiketKita" className="h-8 w-auto object-contain" />
              <div className="mt-1 text-[11px] font-semibold text-slate-400">Dashboard Pembeli</div>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
            <button
              onClick={() => {
                setPanel('orders');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'orders'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <ClipboardList className="h-4 w-4" /> Status Pemesanan
            </button>
            <button
              onClick={() => {
                setPanel('concerts');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'concerts'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <Music className="h-4 w-4" /> Jelajah Konser
            </button>
            <button
              onClick={() => {
                setPanel('profile');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'profile'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <User className="h-4 w-4" /> Profil Saya
            </button>

            <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigasi
            </div>
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            >
              <Home className="h-4 w-4" /> Halaman Beranda
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-slate-900">
                {user?.nama_lengkap || 'Tamu / Pembeli'}
              </div>
              <div className="truncate text-[11px] text-slate-400">
                {user?.email || 'Belum masuk akun'}
              </div>
            </div>
            {user ? (
              <button
                onClick={logout}
                title="Keluar"
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-7">
        {/* TOP HEADER */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {panel === 'orders'
                ? 'Status Pemesanan & E-Ticket'
                : panel === 'concerts'
                  ? 'Daftar Konser Tersedia'
                  : 'Profil Akun Pembeli'}
            </h1>
            <p className="text-xs text-slate-500">
              {panel === 'orders'
                ? 'Pantau status pembayaran QRIS dan unduh atau cetak E-Ticket Anda'
                : panel === 'concerts'
                  ? 'Pilih konser favorit dan pesan tiket langsung dari dashboard Anda'
                  : 'Informasi akun dan ringkasan pemesanan tiket Anda'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {panel === 'orders' && (
              <>
                <button
                  onClick={() => loadAll(user)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang Status
                </button>
              </>
            )}
          </div>
        </div>

        {/* PANEL 1: STATUS PEMESANAN & DOWNLOAD / CETAK E-TICKET */}
        {panel === 'orders' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 print:hidden">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Pesanan</div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-900">{orders.length}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">E-Ticket Aktif (Lunas)</div>
                <div className="mt-1 font-mono text-2xl font-bold text-blue-600">{activeTicketCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Menunggu Verifikasi</div>
                <div className="mt-1 font-mono text-2xl font-bold text-amber-600">{pendingCount}</div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                Memuat data pemesanan...
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="text-sm font-bold text-slate-900">Belum ada riwayat pemesanan</div>
                <p className="mt-1 text-xs text-slate-500">
                  Pilih konser di menu Jelajah Konser untuk mulai memesan tiket.
                </p>
                <button
                  onClick={() => setPanel('concerts')}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Lihat Konser Tersedia <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {orders.map((o) => {
                  const myTkts = tickets.filter((t) => t.id_transaksi === o.id_transaksi);
                  return (
                    <div
                      key={o.id_transaksi}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm break-inside-avoid"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="font-mono text-xs font-bold text-slate-500">{o.id_transaksi}</span>
                        {o.status_bayar === 'lunas' ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                            Lunas
                          </span>
                        ) : o.status_bayar === 'ditolak' ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                            Ditolak
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                            Menunggu Verifikasi Admin
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-base font-extrabold text-slate-900">{o.nama_event}</h2>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" /> {o.tanggal_event}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-500" /> {o.lokasi_venue}
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-semibold text-slate-700">
                        {o.nama_pemesan} &bull; {o.nama_kategori} ({o.jumlah_tiket} Tiket) &bull; Rp{' '}
                        {Number(o.total_bayar).toLocaleString('id-ID')}
                      </div>

                      {myTkts.length > 0 ? (
                        <div className="mt-4 space-y-3">
                          {myTkts.map((t) => (
                            <div
                              key={t.id_tiket}
                              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5"
                            >
                              <div className="flex items-center gap-3.5">
                                {qrMap[t.kode_qr] && (
                                  <img
                                    src={qrMap[t.kode_qr]}
                                    alt={t.kode_qr}
                                    className="h-24 w-24 rounded-lg border border-blue-200 bg-white p-1"
                                  />
                                )}
                                <div>
                                  <div className="font-mono text-xs font-extrabold text-slate-900">
                                    {t.kode_qr}
                                  </div>
                                  <div
                                    className={`mt-1 text-[11px] font-bold ${
                                      t.status_checkin === 'sudah_checkin'
                                        ? 'text-slate-500'
                                        : 'text-emerald-600'
                                    }`}
                                  >
                                    {t.status_checkin === 'sudah_checkin'
                                      ? 'Sudah Check-In di Venue'
                                      : 'Aktif — Siap Scan Gate'}
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center gap-2 print:hidden">
                                    {qrMap[t.kode_qr] && (
                                      <a
                                        href={qrMap[t.kode_qr]}
                                        download={`${t.kode_qr}.png`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50"
                                      >
                                        <Download className="h-3 w-3" /> Unduh QR
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => printSingleTicket(o, t)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                                    >
                                      <Printer className="h-3 w-3" /> Cetak E-Ticket
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : o.status_bayar === 'ditolak' ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                          <div>
                            <div>Pembayaran ditolak dan kuota tiket telah dikembalikan.</div>
                            <div className="mt-0.5 text-[11px] text-rose-500">
                              Riwayat ini akan terhapus otomatis dalam 24 jam.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteRejectedOrder(o.id_transaksi)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 print:hidden"
                          >
                            <Trash2 className="h-3 w-3" /> Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-2.5 rounded-xl bg-amber-50/70 px-3.5 py-3 text-xs font-medium text-amber-800">
                          <div>
                            {o.qris_string
                              ? 'Pesanan belum dibayar. Klik tombol di bawah untuk memunculkan kembali kode QRIS pembayaran Anda.'
                              : 'QR Code E-Ticket akan muncul otomatis setelah pembayaran QRIS Anda terkonfirmasi.'}
                          </div>
                          {o.qris_string && (
                            <button
                              type="button"
                              onClick={() => openPayModal(o)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 print:hidden"
                            >
                              <QrCode className="h-3.5 w-3.5" /> Tampilkan QRIS / Bayar Sekarang
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PANEL 2: JELAJAH KONSER LANGSUNG DI DASHBOARD USER */}
        {panel === 'concerts' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const minPrice = ev.categories.length
                ? Math.min(...ev.categories.map((c) => c.harga_tiket))
                : 0;
              const sisa = ev.categories.reduce((acc, c) => acc + c.kuota_tersedia, 0);
              return (
                <div
                  key={ev.id_event}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div
                    className={`relative overflow-hidden bg-slate-100 ${
                      ev.poster_ratio === 'portrait' ? 'aspect-[3/4]' : 'h-48'
                    }`}
                  >
                    <img
                      src={ev.poster_url || '/posters/poster-suramaya-fest.jpg'}
                      alt={ev.nama_event}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-blue-600 shadow-xs">
                      {ev.genre || 'Indie'}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900">
                      {ev.nama_event}
                    </h3>
                    <div className="mt-2 space-y-1 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-blue-500" /> {ev.tanggal_event} &bull;{' '}
                        {ev.waktu_mulai}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" /> {ev.lokasi_venue}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5">
                      <div>
                        <div className="text-[11px] font-medium text-slate-400">
                          Mulai dari &bull; Sisa {sisa}
                        </div>
                        <div className="text-sm font-extrabold text-blue-600">
                          Rp {minPrice.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <Link
                        href={`/beli/${ev.id_event}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        Pesan <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* PANEL 3: PROFIL PEMBELI */}
        {panel === 'profile' && (
          <div className="max-w-2xl space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    {user?.nama_lengkap || 'Belum Masuk Akun'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {user?.email || 'Silakan masuk menggunakan akun pembeli Anda.'}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Nama Lengkap</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-900">
                    {user?.nama_lengkap || '-'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Email Terdaftar</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-900">{user?.email || '-'}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Nomor WhatsApp</div>
                  <div className="mt-0.5 text-xs font-bold text-slate-900">{user?.no_wa || '-'}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-400">Status Peran</div>
                  <div className="mt-0.5 text-xs font-bold uppercase text-blue-600">
                    {user?.peran || 'pelanggan'}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <span>
                  Total transaksi lunas: <strong className="text-slate-900">{lunasCount}</strong> &bull;
                  Menunggu verifikasi: <strong className="text-amber-600">{pendingCount}</strong>
                </span>
                {user ? (
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Keluar Akun
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Masuk ke Akun
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL TAMPILKAN ULANG QRIS PEMBAYARAN UNTUK ORDER PENDING */}
      {payModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs print:hidden">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Lanjutkan Pembayaran QRIS</div>
                <div className="font-mono text-[11px] text-slate-400">
                  {payModalOrder.id_transaksi} &bull; {payModalOrder.nama_event}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayModalOrder(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {payPaid ? (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Pembayaran Diterima!</h3>
                <p className="mt-1 text-xs text-slate-500">
                  E-Ticket QR Code Anda sudah aktif dan tampil di halaman Status Pemesanan.
                </p>
                <button
                  type="button"
                  onClick={() => setPayModalOrder(null)}
                  className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Lihat E-Ticket Sekarang
                </button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                  <div className="text-[11px] font-semibold text-slate-500">Nominal Persis Pembayaran</div>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-extrabold text-blue-700">
                      Rp {Number(payModalOrder.total_bayar).toLocaleString('id-ID')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(String(payModalOrder.total_bayar));
                        setCopiedNominal(true);
                        setTimeout(() => setCopiedNominal(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50"
                    >
                      {copiedNominal ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedNominal ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                </div>

                {payQrImg && (
                  <div className="mx-auto mt-4 inline-block rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                    <img src={payQrImg} alt="QRIS Dinamis" className="h-56 w-56" />
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Scan QRIS menggunakan Mobile Banking atau E-Wallet Anda. Status otomatis berubah begitu pembayaran masuk.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-[11px] font-semibold text-slate-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Menunggu konfirmasi otomatis...
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
