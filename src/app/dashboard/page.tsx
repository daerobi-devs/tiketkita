'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ticket,
  LayoutDashboard,
  Calendar,
  DollarSign,
  BarChart3,
  QrCode,
  LogOut,
  Search,
  Users,
  Pencil,
  Trash2,
  Check,
  X,
  Download,
  Printer,
  RefreshCw,
  Menu,
} from 'lucide-react';

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
  genre?: string;
  tanggal_event: string;
  waktu_mulai?: string;
  lokasi_venue: string;
  poster_url?: string;
  poster_ratio?: 'landscape' | 'portrait';
  categories: Category[];
}

interface OrderItem {
  id_transaksi: string;
  id_event?: string;
  nama_pemesan: string;
  no_wa?: string;
  email_pemesan?: string;
  nama_event: string;
  nama_kategori: string;
  jumlah_tiket: number;
  total_bayar: number;
  metode_bayar: string;
  status_bayar: string;
  waktu_pesan?: string;
}

interface TicketItem {
  id_tiket: string;
  id_transaksi: string;
  status_checkin: string;
}

interface EventStats {
  totalOrders: number;
  lunasOrders: number;
  pendingOrders: number;
  ditolakOrders: number;
  totalTicketsBooked: number;
  lunasTickets: number;
  checkedInCount: number;
  issuedTicketCount: number;
  revenue: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [panel, setPanel] = useState<'overview' | 'events' | 'ots' | 'mis'>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [user, setUser] = useState<{ nama_lengkap: string; email: string } | null>(null);

  // Order search & filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'semua' | 'pending' | 'lunas' | 'ditolak'>('semua');

  // Event create / edit form state
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [evName, setEvName] = useState('');
  const [evDate, setEvDate] = useState('20 Des 2026');
  const [evLoc, setEvLoc] = useState('Lapangan Kota');
  const [evGenre, setEvGenre] = useState('Indie');
  const [evPrice, setEvPrice] = useState('125000');
  const [evQuota, setEvQuota] = useState('500');
  const [evPosterUrl, setEvPosterUrl] = useState('');
  const [evRatio, setEvRatio] = useState<'landscape' | 'portrait'>('landscape');
  const [uploading, setUploading] = useState(false);

  // Event registrant detail modal
  const [selectedEventForRegistrants, setSelectedEventForRegistrants] = useState<EventItem | null>(null);

  // Kasir OTS state
  const [otsCat, setOtsCat] = useState('');
  const [otsName, setOtsName] = useState('Hendra Wijaya');
  const [otsQty, setOtsQty] = useState('2');

  async function loadData() {
    const [evRes, ordRes] = await Promise.all([fetch('/api/events'), fetch('/api/orders')]);
    const evData = await evRes.json();
    const ordData = await ordRes.json();
    const evs: EventItem[] = evData.events || [];
    setEvents(evs);
    setOrders(ordData.orders || []);
    setTickets(ordData.tickets || []);
    if (!otsCat && evs[0]?.categories[0]) setOtsCat(evs[0].categories[0].id_kategori);
  }

  useEffect(() => {
    const saved = localStorage.getItem('tiketkita_user');
    if (saved) setUser(JSON.parse(saved));
    loadData();
  }, []);

  function logout() {
    localStorage.removeItem('tiketkita_user');
    router.push('/login');
  }

  async function approveOrder(id: string) {
    await fetch(`/api/orders/${id}/approve`, { method: 'PATCH' });
    loadData();
  }

  async function rejectOrder(id: string) {
    if (!confirm(`Tolak transaksi ${id}? Kuota tiket akan dikembalikan.`)) return;
    await fetch(`/api/orders/${id}/reject`, { method: 'PATCH' });
    loadData();
  }

  async function handlePosterUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const img = new Image();
    img.onload = () => {
      setEvRatio(img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape');
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);

    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) setEvPosterUrl(data.url);
    setUploading(false);
  }

  function startEditEvent(ev: EventItem) {
    const primaryCat = ev.categories[0];
    setEditingEventId(ev.id_event);
    setEditingCatId(primaryCat?.id_kategori || null);
    setEvName(ev.nama_event);
    setEvDate(ev.tanggal_event);
    setEvLoc(ev.lokasi_venue);
    setEvGenre(ev.genre || 'Indie');
    setEvPrice(primaryCat ? String(primaryCat.harga_tiket) : '125000');
    setEvQuota(primaryCat ? String(primaryCat.kuota_total) : '500');
    setEvPosterUrl(ev.poster_url || '');
    setEvRatio(ev.poster_ratio === 'portrait' ? 'portrait' : 'landscape');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEditingCatId(null);
    setEvName('');
    setEvDate('20 Des 2026');
    setEvLoc('Lapangan Kota');
    setEvGenre('Indie');
    setEvPrice('125000');
    setEvQuota('500');
    setEvPosterUrl('');
    setEvRatio('landscape');
  }

  async function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (editingEventId) {
      await fetch(`/api/events/${editingEventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_event: evName,
          tanggal_event: evDate,
          lokasi_venue: evLoc,
          genre: evGenre,
          id_kategori: editingCatId,
          harga_tiket: evPrice,
          kuota_total: evQuota,
          poster_url: evPosterUrl || '/posters/poster-soundwave.jpg',
          poster_ratio: evRatio,
        }),
      });
    } else {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama_event: evName,
          tanggal_event: evDate,
          lokasi_venue: evLoc,
          genre: evGenre,
          harga_tiket: evPrice,
          kuota_total: evQuota,
          poster_url: evPosterUrl || '/posters/poster-soundwave.jpg',
          poster_ratio: evRatio,
        }),
      });
    }
    resetEventForm();
    loadData();
  }

  async function delEvent(id: string) {
    if (!confirm('Hapus event ini? Semua kategori dan data terkait akan terhapus.')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    if (editingEventId === id) resetEventForm();
    loadData();
  }

  async function submitOts(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_kategori: otsCat,
        nama_pemesan: otsName,
        jumlah_tiket: otsQty,
        metode_bayar: 'QRIS Otomatis',
        instant_ots: true,
      }),
    });
    loadData();
    alert('Transaksi berhasil dicatat dan QR Code diterbitkan!');
  }

  function getEventOrders(ev: EventItem): OrderItem[] {
    return orders.filter(
      (o) => (o.id_event && o.id_event === ev.id_event) || o.nama_event === ev.nama_event
    );
  }

  function getEventStats(ev: EventItem): EventStats {
    const evOrders = getEventOrders(ev);
    const lunasOrders = evOrders.filter((o) => o.status_bayar === 'lunas');
    const pendingOrders = evOrders.filter((o) => o.status_bayar === 'pending');
    const ditolakOrders = evOrders.filter((o) => o.status_bayar === 'ditolak');
    const trxIds = new Set(evOrders.map((o) => o.id_transaksi));
    const evTickets = tickets.filter((t) => trxIds.has(t.id_transaksi));
    const checkedInCount = evTickets.filter((t) => t.status_checkin === 'sudah_checkin').length;
    const revenue = lunasOrders.reduce((acc, o) => acc + Number(o.total_bayar || 0), 0);

    return {
      totalOrders: evOrders.length,
      lunasOrders: lunasOrders.length,
      pendingOrders: pendingOrders.length,
      ditolakOrders: ditolakOrders.length,
      totalTicketsBooked: evOrders
        .filter((o) => o.status_bayar !== 'ditolak')
        .reduce((acc, o) => acc + Number(o.jumlah_tiket || 0), 0),
      lunasTickets: lunasOrders.reduce((acc, o) => acc + Number(o.jumlah_tiket || 0), 0),
      checkedInCount,
      issuedTicketCount: evTickets.length,
      revenue,
    };
  }

  function exportMisCsv() {
    const headers = [
      'ID Event',
      'Nama Event',
      'Tanggal',
      'Lokasi',
      'Total Pendaftar',
      'Pendaftar Lunas',
      'Pendaftar Pending',
      'Kuota Total',
      'Tiket Terjual',
      'Okupansi (%)',
      'Sudah Check-In',
      'Realisasi Pendapatan (Rp)',
    ];
    const rows = events.map((ev) => {
      const tot = ev.categories.reduce((a, c) => a + c.kuota_total, 0);
      const sisa = ev.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
      const sold = tot - sisa;
      const occ = tot ? Math.round((sold / tot) * 100) : 0;
      const st = getEventStats(ev);
      return [
        ev.id_event,
        `"${ev.nama_event.replace(/"/g, '""')}"`,
        `"${ev.tanggal_event}"`,
        `"${ev.lokasi_venue}"`,
        st.totalOrders,
        st.lunasOrders,
        st.pendingOrders,
        tot,
        sold,
        occ,
        st.checkedInCount,
        st.revenue,
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-mis-tiketkita-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  let totalQuota = 0;
  let totalSisa = 0;
  events.forEach((e) =>
    e.categories.forEach((c) => {
      totalQuota += c.kuota_total;
      totalSisa += c.kuota_tersedia;
    })
  );
  const totalSold = totalQuota - totalSisa;
  const pendingCount = orders.filter((o) => o.status_bayar === 'pending').length;
  const checkedIn = tickets.filter((t) => t.status_checkin === 'sudah_checkin').length;
  const totalRevenueAll = orders
    .filter((o) => o.status_bayar === 'lunas')
    .reduce((acc, o) => acc + Number(o.total_bayar || 0), 0);
  const totalLunasOrders = orders.filter((o) => o.status_bayar === 'lunas').length;
  const avgOccupancy = totalQuota ? Math.round((totalSold / totalQuota) * 100) : 0;

  const filteredOrders = orders.filter((o) => {
    const matchStatus = orderFilter === 'semua' || o.status_bayar === orderFilter;
    const q = orderSearch.trim().toLowerCase();
    const matchQuery =
      !q ||
      o.id_transaksi.toLowerCase().includes(q) ||
      o.nama_pemesan.toLowerCase().includes(q) ||
      o.nama_event.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const selectedRegOrders = selectedEventForRegistrants
    ? getEventOrders(selectedEventForRegistrants)
    : [];
  const selectedRegStats = selectedEventForRegistrants
    ? getEventStats(selectedEventForRegistrants)
    : null;

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
            <div className="text-sm font-extrabold tracking-tight text-slate-900">
              Tiket<span className="text-blue-600">Kita</span>
            </div>
            <div className="text-[10px] font-medium text-slate-400">Admin Panel EO</div>
          </div>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Sync
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
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                <Ticket className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-extrabold tracking-tight text-slate-900">
                  Tiket<span className="text-blue-600">Kita</span>
                </div>
                <div className="text-[11px] font-medium text-slate-400">Admin Panel EO</div>
              </div>
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
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Operasional</div>
            <button
              onClick={() => {
                setPanel('overview');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'overview'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Overview &amp; Verifikasi
            </button>
            <button
              onClick={() => {
                setPanel('events');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'events'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <Calendar className="h-4 w-4" /> Kelola Event &amp; Pendaftar
            </button>
            <button
              onClick={() => {
                setPanel('ots');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'ots'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <DollarSign className="h-4 w-4" /> Kasir Loket (TPS)
            </button>

            <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Manajemen</div>
            <button
              onClick={() => {
                setPanel('mis');
                setMobileNavOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'mis'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <BarChart3 className="h-4 w-4" /> Laporan MIS
            </button>
            <Link
              href="/gate"
              onClick={() => setMobileNavOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            >
              <QrCode className="h-4 w-4" /> Portal Scan Gate
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
            <div className="text-[10px] font-bold uppercase text-blue-700">Database Terhubung</div>
            <div className="font-mono text-[11px] font-semibold text-slate-700">PostgreSQL (db_webkonser)</div>
          </div>
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-slate-900">{user?.nama_lengkap || 'Admin EO'}</div>
              <div className="truncate text-[11px] text-slate-400">{user?.email || 'admin@tiketkita.id'}</div>
            </div>
            <button
              onClick={logout}
              title="Keluar"
              className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Admin EO</h1>
            <p className="text-xs text-slate-500">Data tersinkronisasi langsung dengan PostgreSQL Daeroom Cloud</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sinkronkan
            </button>
            <Link
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:border-blue-200 hover:text-blue-600"
            >
              Lihat Halaman User
            </Link>
          </div>
        </div>

        {panel === 'overview' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Tiket Terjual</div>
                <div className="mt-1 font-mono text-2xl font-bold text-slate-900">{totalSold.toLocaleString('id-ID')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Sisa Kuota Tersedia</div>
                <div className="mt-1 font-mono text-2xl font-bold text-blue-600">{totalSisa.toLocaleString('id-ID')}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Menunggu Verifikasi</div>
                <div className="mt-1 font-mono text-2xl font-bold text-amber-600">{pendingCount}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Gate Check-In</div>
                <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">{checkedIn}</div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Antrean Pembayaran QRIS &amp; Status Tiket</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Cari ID, nama, atau event..."
                      className="rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <select
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value as 'semua' | 'pending' | 'lunas' | 'ditolak')}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="semua">Semua Status ({orders.length})</option>
                    <option value="pending">Pending ({pendingCount})</option>
                    <option value="lunas">Lunas ({totalLunasOrders})</option>
                    <option value="ditolak">Ditolak</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">ID Order</th>
                      <th className="px-4 py-3">Pemesan</th>
                      <th className="px-4 py-3">Event &amp; Kategori</th>
                      <th className="px-4 py-3">Jml</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Metode</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                          Tidak ada transaksi yang sesuai filter.
                        </td>
                      </tr>
                    )}
                    {filteredOrders.map((o) => (
                      <tr key={o.id_transaksi} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-mono font-bold text-slate-900">{o.id_transaksi}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{o.nama_pemesan}</div>
                          {o.email_pemesan && o.email_pemesan !== '-' && (
                            <div className="text-[11px] text-slate-400">{o.email_pemesan}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {o.nama_event} ({o.nama_kategori})
                        </td>
                        <td className="px-4 py-3">{o.jumlah_tiket}</td>
                        <td className="px-4 py-3 font-semibold">Rp {Number(o.total_bayar).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3">{o.metode_bayar}</td>
                        <td className="px-4 py-3">
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
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {o.status_bayar === 'pending' ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => approveOrder(o.id_transaksi)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                              >
                                <Check className="h-3 w-3" /> Setujui
                              </button>
                              <button
                                onClick={() => rejectOrder(o.id_transaksi)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                              >
                                <X className="h-3 w-3" /> Tolak
                              </button>
                            </div>
                          ) : o.status_bayar === 'lunas' ? (
                            <span className="text-slate-400">QR Terbit</span>
                          ) : (
                            <span className="text-slate-400">Kuota Kembali</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {panel === 'events' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  {editingEventId ? `Edit Event (${editingEventId})` : 'Tambah Event Konser Baru'}
                </h2>
                {editingEventId && (
                  <button
                    type="button"
                    onClick={resetEventForm}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Batal Edit
                  </button>
                )}
              </div>
              <form onSubmit={saveEvent} className="grid gap-4 sm:grid-cols-3">
                <input
                  required
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  placeholder="Nama Event Konser"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <input
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  placeholder="Tanggal"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <input
                  required
                  value={evLoc}
                  onChange={(e) => setEvLoc(e.target.value)}
                  placeholder="Lokasi Venue"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
                <select
                  value={evGenre}
                  onChange={(e) => setEvGenre(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                >
                  <option>Indie</option>
                  <option>Akustik</option>
                  <option>Jazz</option>
                </select>
                <input
                  type="number"
                  required
                  value={evPrice}
                  onChange={(e) => setEvPrice(e.target.value)}
                  placeholder="Harga Tiket (Rp)"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
                <input
                  type="number"
                  required
                  value={evQuota}
                  onChange={(e) => setEvQuota(e.target.value)}
                  placeholder="Kuota Total"
                  className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">
                    Upload Foto Poster (JPG / PNG / WebP)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePosterUpload}
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                  />
                  {uploading && (
                    <span className="mt-1 block text-[11px] font-semibold text-blue-600">Mengunggah poster...</span>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-600">Rasio Poster di Beranda</label>
                  <select
                    value={evRatio}
                    onChange={(e) => setEvRatio(e.target.value as 'landscape' | 'portrait')}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                  >
                    <option value="landscape">Landscape (16:9 / Lebar)</option>
                    <option value="portrait">Portrait (3:4 / Tegak)</option>
                  </select>
                </div>

                {evPosterUrl && (
                  <div className="sm:col-span-3 flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                    <img
                      src={evPosterUrl}
                      alt="Preview Poster"
                      className={
                        evRatio === 'portrait'
                          ? 'h-28 w-21 rounded-lg border border-slate-200 object-cover'
                          : 'h-20 w-36 rounded-lg border border-slate-200 object-cover'
                      }
                    />
                    <div className="text-xs text-slate-600">
                      <div className="font-bold text-slate-900">
                        Poster Siap Ditampilkan ({evRatio === 'portrait' ? 'Portrait 3:4' : 'Landscape 16:9'})
                      </div>
                      <div className="break-all font-mono text-[11px] text-blue-600">{evPosterUrl}</div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 sm:col-span-3"
                >
                  {editingEventId ? 'Simpan Perubahan Event' : '+ Simpan Event ke PostgreSQL'}
                </button>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Daftar Event &amp; Rekap Pendaftar Spesifik</h2>
                <p className="text-[11px] text-slate-500">
                  Klik Detail Pendaftar untuk melihat daftar pembeli dan status check-in khusus di event tersebut.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Event</th>
                      <th className="px-4 py-3">Jadwal &amp; Lokasi</th>
                      <th className="px-4 py-3">Total Pendaftar</th>
                      <th className="px-4 py-3">Tiket &amp; Kuota</th>
                      <th className="px-4 py-3">Check-In Gate</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((e) => {
                      const s = e.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
                      const t = e.categories.reduce((a, c) => a + c.kuota_total, 0);
                      const sold = t - s;
                      const st = getEventStats(e);
                      return (
                        <tr key={e.id_event} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-900">{e.nama_event}</div>
                            <div className="font-mono text-[11px] text-slate-400">
                              {e.id_event} &bull; {e.genre || 'Indie'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div>{e.tanggal_event}</div>
                            <div className="text-[11px] text-slate-400">{e.lokasi_venue}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{st.totalOrders} Pendaftar</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                                {st.lunasOrders} Lunas
                              </span>
                              {st.pendingOrders > 0 && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">
                                  {st.pendingOrders} Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900">
                              {sold} / {t} terjual
                            </div>
                            <div className="text-[11px] text-slate-400">Sisa {s} kuota</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-blue-700">{st.checkedInCount}</span>
                            <span className="text-slate-400"> / {st.issuedTicketCount} QR terbit</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => setSelectedEventForRegistrants(e)}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                              >
                                <Users className="h-3 w-3" /> Pendaftar
                              </button>
                              <button
                                onClick={() => startEditEvent(e)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </button>
                              <button
                                onClick={() => delEvent(e.id_event)}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                              >
                                <Trash2 className="h-3 w-3" /> Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {panel === 'ots' && (
          <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Catat Transaksi QRIS Otomatis / Loket (TPS)</h2>
            <form onSubmit={submitOts} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Pilih Kategori Tiket</label>
                <select
                  value={otsCat}
                  onChange={(e) => setOtsCat(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                >
                  {events.flatMap((e) =>
                    e.categories.map((c) => (
                      <option key={c.id_kategori} value={c.id_kategori}>
                        {e.nama_event} — {c.nama_kategori} (Rp {c.harga_tiket.toLocaleString('id-ID')} | Sisa{' '}
                        {c.kuota_tersedia})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Nama Pembeli</label>
                  <input
                    required
                    value={otsName}
                    onChange={(e) => setOtsName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Jumlah Tiket</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={otsQty}
                    onChange={(e) => setOtsQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Simpan Lunas &amp; Terbitkan QR
              </button>
            </form>
          </div>
        )}

        {panel === 'mis' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Realisasi Pendapatan</div>
                <div className="mt-1 font-mono text-xl font-bold text-blue-600">
                  Rp {totalRevenueAll.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Pendaftar Lunas</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900">{totalLunasOrders} Transaksi</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Rata-rata Okupansi</div>
                <div className="mt-1 font-mono text-xl font-bold text-emerald-600">{avgOccupancy}%</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500">Total Check-In Gate</div>
                <div className="mt-1 font-mono text-xl font-bold text-slate-900">
                  {checkedIn} / {tickets.length}
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Laporan Rekapitulasi Penjualan &amp; Pendaftar (MIS)</h2>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={exportMisCsv}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Export CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    <Printer className="h-3.5 w-3.5" /> Cetak Laporan
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Nama Event</th>
                      <th className="px-4 py-3">Pendaftar (Lunas / Pending)</th>
                      <th className="px-4 py-3">Kuota / Terjual</th>
                      <th className="px-4 py-3">Okupansi</th>
                      <th className="px-4 py-3">Check-In</th>
                      <th className="px-5 py-3">Realisasi Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((e) => {
                      const tot = e.categories.reduce((a, c) => a + c.kuota_total, 0);
                      const sisa = e.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
                      const sold = tot - sisa;
                      const occ = tot ? Math.round((sold / tot) * 100) : 0;
                      const st = getEventStats(e);
                      return (
                        <tr key={e.id_event}>
                          <td className="px-5 py-3 font-bold text-slate-900">{e.nama_event}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">{st.totalOrders}</span>{' '}
                            <span className="text-[11px] text-slate-500">
                              ({st.lunasOrders} lunas, {st.pendingOrders} pending)
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {sold} / {tot}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${occ}%` }} />
                              </div>
                              <span className="font-mono font-bold text-slate-700">{occ}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {st.checkedInCount} / {st.issuedTicketCount}
                          </td>
                          <td className="px-5 py-3 font-bold text-blue-600">
                            Rp {st.revenue.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL DETAIL PENDAFTAR PER EVENT */}
      {selectedEventForRegistrants && selectedRegStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Daftar Pendaftar: {selectedEventForRegistrants.nama_event}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEventForRegistrants.tanggal_event} &bull; {selectedEventForRegistrants.lokasi_venue}
                </p>
              </div>
              <button
                onClick={() => setSelectedEventForRegistrants(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/70 px-6 py-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-slate-500">Total Pendaftar</div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  {selectedRegStats.totalOrders} Orang
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-slate-500">Lunas / Pending</div>
                <div className="font-mono text-lg font-bold text-emerald-600">
                  {selectedRegStats.lunasOrders}{' '}
                  <span className="text-xs font-semibold text-amber-600">/ {selectedRegStats.pendingOrders} pending</span>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-slate-500">Tiket Check-In</div>
                <div className="font-mono text-lg font-bold text-blue-600">
                  {selectedRegStats.checkedInCount} / {selectedRegStats.issuedTicketCount}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-[11px] font-semibold text-slate-500">Omzet Event</div>
                <div className="font-mono text-lg font-bold text-slate-900">
                  Rp {selectedRegStats.revenue.toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">ID Order</th>
                    <th className="px-4 py-2.5">Nama &amp; Kontak</th>
                    <th className="px-4 py-2.5">Kategori &amp; Jml</th>
                    <th className="px-4 py-2.5">Total Bayar</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Check-In</th>
                    <th className="px-4 py-2.5">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRegOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Belum ada pendaftar untuk event ini.
                      </td>
                    </tr>
                  )}
                  {selectedRegOrders.map((o) => {
                    const ordTickets = tickets.filter((t) => t.id_transaksi === o.id_transaksi);
                    const ordChecked = ordTickets.filter((t) => t.status_checkin === 'sudah_checkin').length;
                    return (
                      <tr key={o.id_transaksi}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{o.id_transaksi}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{o.nama_pemesan}</div>
                          <div className="text-[11px] text-slate-400">
                            {o.email_pemesan || '-'} &bull; {o.no_wa || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {o.nama_kategori} ({o.jumlah_tiket} tiket)
                        </td>
                        <td className="px-4 py-3 font-semibold">Rp {Number(o.total_bayar).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3">
                          {o.status_bayar === 'lunas' ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                              Lunas
                            </span>
                          ) : o.status_bayar === 'ditolak' ? (
                            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                              Ditolak
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {ordTickets.length > 0 ? (
                            <span className="font-semibold text-slate-700">
                              {ordChecked} / {ordTickets.length} masuk
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {o.status_bayar === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => approveOrder(o.id_transaksi)}
                                className="rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                              >
                                Setujui
                              </button>
                              <button
                                onClick={() => rejectOrder(o.id_transaksi)}
                                className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
