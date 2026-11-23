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
  ClipboardCheck,
  ShieldCheck,
  Plus,
  UserPlus,
  MapPin,
  ArrowRight,
  Power,
  ExternalLink,
  Clock,
  Tag,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { CONCERT_GENRES } from '@/lib/genres';

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

interface GatekeeperItem {
  id_pengguna: string;
  nama_lengkap: string;
  email: string;
  no_wa: string;
  status_aktif: boolean;
  total_scan: number;
  last_scan_at: string | null;
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

type AdminPanel = 'overview' | 'verifikasi' | 'events' | 'gatekeepers' | 'mis';

export default function DashboardPage() {
  const router = useRouter();
  const [panel, setPanel] = useState<AdminPanel>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [gatekeepers, setGatekeepers] = useState<GatekeeperItem[]>([]);
  const [user, setUser] = useState<{ nama_lengkap: string; email: string } | null>(null);

  // Order search & filter
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'semua' | 'pending' | 'lunas' | 'ditolak'>('semua');

  // Event modal create / edit state
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [evName, setEvName] = useState('');
  const [evDate, setEvDate] = useState('20 Des 2026');
  const [evLoc, setEvLoc] = useState('Lapangan Kota');
  const [evGenre, setEvGenre] = useState('Pop');
  const [evPrice, setEvPrice] = useState('125000');
  const [evQuota, setEvQuota] = useState('500');
  const [evPosterUrl, setEvPosterUrl] = useState('');
  const [evRatio, setEvRatio] = useState<'landscape' | 'portrait'>('portrait');
  const [uploading, setUploading] = useState(false);

  // Full-page Detail Event view state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'pendaftar' | 'kategori'>('pendaftar');

  // Overview event filter
  const [overviewEventFilter, setOverviewEventFilter] = useState<string>('all');

  // Gatekeeper create form
  const [gkName, setGkName] = useState('');
  const [gkEmail, setGkEmail] = useState('');
  const [gkPass, setGkPass] = useState('');
  const [gkPhone, setGkPhone] = useState('');
  const [gkErr, setGkErr] = useState('');
  const [gkSaving, setGkSaving] = useState(false);

  // MIS filter
  const [misEventFilter, setMisEventFilter] = useState<string>('all');

  async function loadData() {
    const [evRes, ordRes, gkRes] = await Promise.all([
      fetch('/api/events', { cache: 'no-store' }),
      fetch('/api/orders', { cache: 'no-store' }),
      fetch('/api/gatekeepers', { cache: 'no-store' }),
    ]);
    const evData = await evRes.json();
    const ordData = await ordRes.json();
    const gkData = await gkRes.json();
    const evs: EventItem[] = evData.events || [];
    setEvents(evs);
    setOrders(ordData.orders || []);
    setTickets(ordData.tickets || []);
    setGatekeepers(gkData.gatekeepers || []);
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

  function openCreateEventModal() {
    setEditingEventId(null);
    setEditingCatId(null);
    setEvName('');
    setEvDate('20 Des 2026');
    setEvLoc('Lapangan Kota');
    setEvGenre('Pop');
    setEvPrice('125000');
    setEvQuota('500');
    setEvPosterUrl('');
    setEvRatio('portrait');
    setEventModalOpen(true);
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
    setEventModalOpen(true);
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
          poster_url: evPosterUrl || '/posters/poster-suramaya-fest.jpg',
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
          poster_url: evPosterUrl || '/posters/poster-suramaya-fest.jpg',
          poster_ratio: evRatio,
        }),
      });
    }
    setEventModalOpen(false);
    loadData();
  }

  async function delEvent(id: string) {
    if (!confirm('Hapus event ini? Semua kategori dan data terkait akan terhapus.')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function createGatekeeper(e: React.FormEvent) {
    e.preventDefault();
    setGkErr('');
    setGkSaving(true);
    const res = await fetch('/api/gatekeepers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama_lengkap: gkName,
        email: gkEmail,
        password: gkPass,
        no_wa: gkPhone,
      }),
    });
    const data = await res.json();
    setGkSaving(false);
    if (!res.ok) {
      setGkErr(data.error || 'Gagal membuat akun petugas gate.');
      return;
    }
    setGkName('');
    setGkEmail('');
    setGkPass('');
    setGkPhone('');
    loadData();
  }

  async function toggleGatekeeperStatus(gk: GatekeeperItem) {
    await fetch(`/api/gatekeepers/${gk.id_pengguna}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status_aktif: !gk.status_aktif }),
    });
    loadData();
  }

  async function deleteGatekeeper(id: string) {
    if (!confirm('Hapus akun petugas gate ini?')) return;
    await fetch(`/api/gatekeepers/${id}`, { method: 'DELETE' });
    loadData();
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

  const misEvents = misEventFilter === 'all' ? events : events.filter((e) => e.id_event === misEventFilter);

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
    const rows = misEvents.map((ev) => {
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

  // MIS computed totals for filtered events
  const misSummary = misEvents.reduce(
    (acc, ev) => {
      const tot = ev.categories.reduce((a, c) => a + c.kuota_total, 0);
      const sisa = ev.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
      const st = getEventStats(ev);
      acc.quota += tot;
      acc.sold += tot - sisa;
      acc.orders += st.totalOrders;
      acc.lunas += st.lunasOrders;
      acc.pending += st.pendingOrders;
      acc.checkedIn += st.checkedInCount;
      acc.issued += st.issuedTicketCount;
      acc.revenue += st.revenue;
      return acc;
    },
    { quota: 0, sold: 0, orders: 0, lunas: 0, pending: 0, checkedIn: 0, issued: 0, revenue: 0 }
  );
  const misAvgOcc = misSummary.quota ? Math.round((misSummary.sold / misSummary.quota) * 100) : 0;
  const maxEventRev = Math.max(1, ...misEvents.map((ev) => getEventStats(ev).revenue));

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

  const selectedEvent = selectedEventId ? events.find((e) => e.id_event === selectedEventId) || null : null;
  const selectedRegOrders = selectedEvent ? getEventOrders(selectedEvent) : [];
  const selectedRegStats = selectedEvent ? getEventStats(selectedEvent) : null;

  const panelMeta: Record<AdminPanel, { title: string; subtitle: string }> = {
    overview: { title: 'Dashboard Overview', subtitle: 'Ringkasan pendapatan, tren pesanan, tiket terjual, dan status check-in' },
    verifikasi: { title: 'Verifikasi Transaksi QRIS', subtitle: 'Setujui atau tolak pembayaran masuk dan pantau riwayat order' },
    events: { title: 'Kelola Event & Pendaftar', subtitle: 'Atur jadwal, poster konser, kuota tiket, dan rincian pendaftar per event' },
    gatekeepers: { title: 'Manajemen Petugas Gate', subtitle: 'Buat akun khusus gatekeeper dan pantau total scan setiap pintu masuk' },
    mis: { title: 'Laporan Manajemen (MIS)', subtitle: 'Analisis realisasi pendapatan, okupansi kuota, dan ekspor laporan resmi' },
  };

  // Overview filtered dataset
  const ovEvents = overviewEventFilter === 'all' ? events : events.filter((e) => e.id_event === overviewEventFilter);
  const ovEventIds = new Set(ovEvents.map((e) => e.id_event));
  const ovEventNames = new Set(ovEvents.map((e) => e.nama_event));
  const ovOrders =
    overviewEventFilter === 'all'
      ? orders
      : orders.filter((o) => (o.id_event && ovEventIds.has(o.id_event)) || ovEventNames.has(o.nama_event));
  const ovOrderIds = new Set(ovOrders.map((o) => o.id_transaksi));
  const ovTickets = overviewEventFilter === 'all' ? tickets : tickets.filter((t) => ovOrderIds.has(t.id_transaksi));

  const ovRevenue = ovOrders
    .filter((o) => o.status_bayar === 'lunas')
    .reduce((acc, o) => acc + Number(o.total_bayar || 0), 0);
  const ovPending = ovOrders.filter((o) => o.status_bayar === 'pending').length;
  const ovLunas = ovOrders.filter((o) => o.status_bayar === 'lunas').length;
  const ovDitolak = ovOrders.filter((o) => o.status_bayar === 'ditolak').length;
  const ovSold = ovEvents.reduce(
    (acc, ev) => acc + ev.categories.reduce((a, c) => a + (c.kuota_total - c.kuota_tersedia), 0),
    0
  );
  const ovCheckedIn = ovTickets.filter((t) => t.status_checkin === 'sudah_checkin').length;

  // Bar Chart data: Tiket terjual per event
  const barChartData = ovEvents.map((ev) => ({
    label: ev.nama_event.length > 16 ? ev.nama_event.slice(0, 15) + '…' : ev.nama_event,
    fullLabel: ev.nama_event,
    sold: ev.categories.reduce((a, c) => a + (c.kuota_total - c.kuota_tersedia), 0),
  }));
  const maxBarSold = Math.max(1, ...barChartData.map((d) => d.sold));

  // Area Chart data: Tren pesanan per tanggal (berdasarkan waktu_pesan nyata)
  const dateMap = new Map<string, number>();
  [...ovOrders].reverse().forEach((o) => {
    const dt = o.waktu_pesan ? new Date(o.waktu_pesan) : new Date();
    const key = dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    dateMap.set(key, (dateMap.get(key) || 0) + 1);
  });
  const trendPoints = Array.from(dateMap.entries()).map(([label, count]) => ({ label, count }));
  const maxTrend = Math.max(1, ...trendPoints.map((p) => p.count));

  // Donut 1: Distribusi Tiket per Event
  const donutColors = ['#2563eb', '#0ea5e9', '#10b981', '#6366f1', '#f59e0b', '#64748b'];
  const eventDonutTotal = Math.max(1, barChartData.reduce((a, b) => a + b.sold, 0));
  let evOffset = 0;
  const eventDonutSlices = barChartData.map((item, idx) => {
    const pct = (item.sold / eventDonutTotal) * 100;
    const slice = {
      label: item.fullLabel,
      value: item.sold,
      pct,
      offset: evOffset,
      color: donutColors[idx % donutColors.length],
    };
    evOffset += pct;
    return slice;
  });

  // Donut 2: Distribusi Status Pesanan
  const statusDonutRaw = [
    { label: 'Lunas', value: ovLunas, color: '#2563eb' },
    { label: 'Pending', value: ovPending, color: '#f59e0b' },
    { label: 'Ditolak', value: ovDitolak, color: '#f43f5e' },
  ];
  const statusDonutTotal = Math.max(1, ovLunas + ovPending + ovDitolak);
  let stOffset = 0;
  const statusDonutSlices = statusDonutRaw.map((item) => {
    const pct = (item.value / statusDonutTotal) * 100;
    const slice = { ...item, pct, offset: stOffset };
    stOffset += pct;
    return slice;
  });

  function switchTab(next: AdminPanel) {
    setPanel(next);
    if (next !== 'events') setSelectedEventId(null);
    setMobileNavOpen(false);
  }

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
            <div className="text-[10px] font-semibold text-slate-400">Admin Panel EO</div>
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
            <Link href="/" className="block">
              <img src="/brand/logo-horizontal.png" alt="TiketKita" className="h-8 w-auto object-contain" />
              <div className="mt-1 text-[11px] font-semibold text-slate-400">Admin Panel EO</div>
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
              onClick={() => switchTab('overview')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'overview'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" /> Overview
            </button>
            <button
              onClick={() => switchTab('verifikasi')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'verifikasi'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ClipboardCheck className="h-4 w-4" /> Verifikasi Transaksi
              </span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => switchTab('events')}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'events'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <Calendar className="h-4 w-4" /> Kelola Event
            </button>

            <div className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tim &amp; Laporan
            </div>
            <button
              onClick={() => switchTab('gatekeepers')}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs ${
                panel === 'gatekeepers'
                  ? 'bg-blue-50 font-bold text-blue-700'
                  : 'font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4" /> Petugas Gate
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {gatekeepers.length}
              </span>
            </button>
            <button
              onClick={() => switchTab('mis')}
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
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{panelMeta[panel].title}</h1>
            <p className="text-xs text-slate-500">{panelMeta[panel].subtitle}</p>
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

        {/* ==================== 1. OVERVIEW (6 KPI + BAR & AREA CHART + 3-COL BOTTOM) ==================== */}
        {panel === 'overview' && (
          <div className="space-y-6">
            {/* Event Filter Bar */}
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs">
              <select
                value={overviewEventFilter}
                onChange={(e) => setOverviewEventFilter(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">Semua Event ({events.length} Konser Aktif)</option>
                {events.map((ev) => (
                  <option key={ev.id_event} value={ev.id_event}>
                    {ev.nama_event} ({ev.tanggal_event})
                  </option>
                ))}
              </select>
            </div>

            {/* 6 Soft-Tinted KPI Cards (2 Rows x 3 Cols) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/90 to-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-emerald-800/80">Saldo / Pendapatan</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">
                  Rp {ovRevenue.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-amber-800/80">Pesanan Belum Dibayar</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">{ovPending}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/90 to-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-blue-800/80">Pesanan Sudah Dibayar</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">{ovLunas}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100/70 to-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-600">Total Pesanan</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">{ovOrders.length}</div>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-sky-800/80">Tiket Terjual</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">
                  {ovSold.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/90 to-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-indigo-800/80">Total Check-In Gate</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">{ovCheckedIn}</div>
              </div>
            </div>

            {/* 2 Charts Side-by-Side: Bar Chart & Area Chart */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Bar Chart: Total Tiket Terjual */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Total Tiket Terjual per Event</h2>
                  <span className="font-mono text-xs font-bold text-blue-600">{ovSold} tiket</span>
                </div>
                <div className="flex h-52 items-end justify-around gap-3 border-b border-l border-slate-200 px-3 pb-2 pt-4">
                  {barChartData.map((d) => {
                    const hPct = Math.max(8, Math.round((d.sold / maxBarSold) * 100));
                    return (
                      <div key={d.fullLabel} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-700">{d.sold}</span>
                        <div
                          title={`${d.fullLabel}: ${d.sold} tiket`}
                          className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-blue-600 to-sky-400 transition-all"
                          style={{ height: `${hPct}%` }}
                        />
                        <span className="w-full truncate text-center text-[10px] font-semibold text-slate-500">
                          {d.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Area / Line Chart: Tren Total Pesanan */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Tren Total Pesanan</h2>
                  <span className="font-mono text-xs font-bold text-emerald-600">{ovOrders.length} pesanan</span>
                </div>
                {trendPoints.length === 0 ? (
                  <div className="flex h-52 items-center justify-center text-xs text-slate-400">
                    Belum ada data tren pesanan.
                  </div>
                ) : (
                  <div>
                    <svg viewBox="0 0 420 175" className="h-44 w-full overflow-visible">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[0, 0.5, 1].map((g) => (
                        <line
                          key={g}
                          x1="10"
                          y1={20 + g * 130}
                          x2="410"
                          y2={20 + g * 130}
                          stroke="#e2e8f0"
                          strokeDasharray="3,3"
                        />
                      ))}
                      {(() => {
                        const pts = trendPoints.map((pt, i) => {
                          const x =
                            trendPoints.length === 1
                              ? 210
                              : 20 + (i / (trendPoints.length - 1)) * 380;
                          const y = 150 - (pt.count / maxTrend) * 125;
                          return { x, y, ...pt };
                        });
                        const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                        const areaPath = `${linePath} L ${pts[pts.length - 1].x} 150 L ${pts[0].x} 150 Z`;
                        return (
                          <>
                            <path d={areaPath} fill="url(#areaGrad)" />
                            <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                            {pts.map((p) => (
                              <g key={p.label}>
                                <circle cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">
                                  {p.count}
                                </text>
                                <text x={p.x} y="168" textAnchor="middle" fontSize="10" fill="#64748b">
                                  {p.label}
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom 3-Column Row: Pesanan Terbaru + 2 Donut Charts */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Col 1: Pesanan Terbaru */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900">Pesanan Terbaru</h2>
                  <button
                    onClick={() => setPanel('verifikasi')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Semua <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {ovOrders.slice(0, 5).map((o) => (
                    <div key={o.id_transaksi} className="flex items-center justify-between py-2.5 text-xs">
                      <div className="min-w-0">
                        <div className="truncate font-bold uppercase text-slate-900">{o.nama_pemesan}</div>
                        <div className="truncate text-[11px] text-slate-400">
                          {o.waktu_pesan
                            ? new Date(o.waktu_pesan).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : o.id_transaksi}
                        </div>
                      </div>
                      <span
                        className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                          o.status_bayar === 'lunas'
                            ? 'bg-blue-600 text-white'
                            : o.status_bayar === 'ditolak'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500 text-white'
                        }`}
                      >
                        {o.status_bayar === 'lunas' ? 'PAID' : o.status_bayar === 'ditolak' ? 'REJECT' : 'PENDING'}
                      </span>
                    </div>
                  ))}
                  {ovOrders.length === 0 && (
                    <div className="py-8 text-center text-xs text-slate-400">Belum ada pesanan.</div>
                  )}
                </div>
              </div>

              {/* Col 2: Donut Chart — Distribusi Tiket per Event */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Berdasarkan Event</h2>
                <div className="flex items-center gap-5">
                  <svg viewBox="0 0 36 36" className="h-28 w-28 shrink-0 -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4.2" />
                    {eventDonutSlices.map((s) => (
                      <circle
                        key={s.label}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="4.2"
                        strokeDasharray={`${s.pct} ${100 - s.pct}`}
                        strokeDashoffset={-s.offset}
                      />
                    ))}
                  </svg>
                  <div className="min-w-0 flex-1 space-y-2 text-xs">
                    {eventDonutSlices.map((s) => (
                      <div key={s.label} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-xs" style={{ backgroundColor: s.color }} />
                          <span className="truncate">{s.label}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Col 3: Donut Chart — Distribusi Status Pesanan */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Status Pesanan</h2>
                <div className="flex items-center gap-5">
                  <svg viewBox="0 0 36 36" className="h-28 w-28 shrink-0 -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4.2" />
                    {statusDonutSlices.map((s) => (
                      <circle
                        key={s.label}
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="4.2"
                        strokeDasharray={`${s.pct} ${100 - s.pct}`}
                        strokeDashoffset={-s.offset}
                      />
                    ))}
                  </svg>
                  <div className="min-w-0 flex-1 space-y-2 text-xs">
                    {statusDonutSlices.map((s) => (
                      <div key={s.label} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-xs" style={{ backgroundColor: s.color }} />
                          <span>{s.label}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. VERIFIKASI TRANSAKSI ==================== */}
        {panel === 'verifikasi' && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {(['semua', 'pending', 'lunas', 'ditolak'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderFilter(st)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize ${
                      orderFilter === st
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {st === 'semua'
                      ? `Semua (${orders.length})`
                      : st === 'pending'
                        ? `Pending (${pendingCount})`
                        : st === 'lunas'
                          ? `Lunas (${totalLunasOrders})`
                          : 'Ditolak'}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Cari ID, nama, atau event..."
                  className="rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs focus:border-blue-500 focus:outline-none"
                />
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
        )}

        {/* ==================== 3. KELOLA EVENT (LIST GRID / FULL-PAGE DETAIL EVENT) ==================== */}
        {panel === 'events' && selectedEvent && selectedRegStats ? (
          <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <button
                type="button"
                onClick={() => setSelectedEventId(null)}
                className="font-bold text-blue-600 hover:underline"
              >
                Kelola Event
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-700">Detail Event</span>
            </div>

            {/* Hero Event Summary Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 lg:w-72">
                  <img
                    src={selectedEvent.poster_url || '/posters/poster-soundwave.jpg'}
                    alt={selectedEvent.nama_event}
                    className="h-52 w-full object-cover lg:h-full"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          Published
                        </span>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
                          Publik
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-slate-400">
                          {selectedEvent.id_event}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => startEditEvent(selectedEvent)}
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <Link
                          href={`/beli/${selectedEvent.id_event}`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Buka Halaman Event
                        </Link>
                      </div>
                    </div>

                    <h2 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900">
                      {selectedEvent.nama_event}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">Event Organizer Tangsel Live Creative</p>

                    <div className="mt-4 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>{selectedEvent.lokasi_venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>Genre: {selectedEvent.genre || 'Indie'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>{selectedEvent.tanggal_event}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>{selectedEvent.waktu_mulai || '19.00 WIB'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>
                          {selectedEvent.categories.length > 0
                            ? `Rp ${Math.min(...selectedEvent.categories.map((c) => c.harga_tiket)).toLocaleString('id-ID')} – Rp ${Math.max(...selectedEvent.categories.map((c) => c.harga_tiket)).toLocaleString('id-ID')}`
                            : 'Rp 0'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 shrink-0 text-blue-600" />
                        <span>
                          Sisa {selectedEvent.categories.reduce((a, c) => a + c.kuota_tersedia, 0)} /{' '}
                          {selectedEvent.categories.reduce((a, c) => a + c.kuota_total, 0)} kuota
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2 Big Highlight Stat Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/70 p-6">
                <div>
                  <div className="text-xs font-bold text-emerald-800">Total Pesanan / Pendaftar</div>
                  <div className="mt-1.5 font-mono text-3xl font-extrabold text-emerald-700">
                    {selectedRegStats.totalOrders}
                  </div>
                  <div className="mt-1.5 text-xs text-emerald-800/80">
                    {selectedRegStats.lunasOrders} Lunas &bull; {selectedRegStats.pendingOrders} Pending &bull; Check-In:{' '}
                    <b>
                      {selectedRegStats.checkedInCount}/{selectedRegStats.issuedTicketCount}
                    </b>
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                  <ShoppingBag className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-sky-100 bg-sky-50/80 p-6">
                <div>
                  <div className="text-xs font-bold text-blue-900">Total Penjualan Event</div>
                  <div className="mt-1.5 font-mono text-3xl font-extrabold text-blue-700">
                    Rp {selectedRegStats.revenue.toLocaleString('id-ID')}
                  </div>
                  <div className="mt-1.5 text-xs text-blue-900/75">
                    Lihat rekap perbandingan penuh di halaman{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMisEventFilter(selectedEvent.id_event);
                        setPanel('mis');
                      }}
                      className="font-bold text-blue-700 underline"
                    >
                      Laporan MIS
                    </button>
                    .
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Underline Sub-Tabs + Full-Width Tables */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center gap-6 border-b border-slate-200 px-6 pt-3">
                <button
                  type="button"
                  onClick={() => setDetailSubTab('pendaftar')}
                  className={`border-b-2 pb-3 text-xs font-bold transition ${
                    detailSubTab === 'pendaftar'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Daftar Pendaftar &amp; Transaksi ({selectedRegOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailSubTab('kategori')}
                  className={`border-b-2 pb-3 text-xs font-bold transition ${
                    detailSubTab === 'kategori'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Daftar Kategori Tiket ({selectedEvent.categories.length})
                </button>
              </div>

              {detailSubTab === 'pendaftar' ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3">ID Order</th>
                        <th className="px-4 py-3">Pemesan &amp; Kontak</th>
                        <th className="px-4 py-3">Kategori &amp; Jml</th>
                        <th className="px-4 py-3">Total Bayar</th>
                        <th className="px-4 py-3">Status Bayar</th>
                        <th className="px-4 py-3">Check-In Gate</th>
                        <th className="px-6 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRegOrders.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                            Belum ada pendaftar untuk event ini.
                          </td>
                        </tr>
                      )}
                      {selectedRegOrders.map((o) => {
                        const ordTickets = tickets.filter((t) => t.id_transaksi === o.id_transaksi);
                        const ordChecked = ordTickets.filter((t) => t.status_checkin === 'sudah_checkin').length;
                        return (
                          <tr key={o.id_transaksi} className="hover:bg-slate-50/60">
                            <td className="px-6 py-3.5 font-mono font-bold text-slate-900">{o.id_transaksi}</td>
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-slate-900">{o.nama_pemesan}</div>
                              <div className="text-[11px] text-slate-400">
                                {o.email_pemesan || '-'} {o.no_wa && o.no_wa !== '-' ? `• ${o.no_wa}` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {o.nama_kategori} ({o.jumlah_tiket} tiket)
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-slate-900">
                              Rp {Number(o.total_bayar).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3.5">
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
                            <td className="px-4 py-3.5 font-mono">
                              {ordTickets.length > 0 ? (
                                <span className="font-bold text-blue-700">
                                  {ordChecked} / {ordTickets.length} masuk
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-3.5">
                              {o.status_bayar === 'pending' ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => approveOrder(o.id_transaksi)}
                                    className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                                  >
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() => rejectOrder(o.id_transaksi)}
                                    className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
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
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-6 py-3">Nama Kategori Tiket</th>
                        <th className="px-4 py-3">Harga Tiket</th>
                        <th className="px-4 py-3">Terjual / Kuota Total</th>
                        <th className="px-4 py-3">Sisa Tersedia</th>
                        <th className="px-6 py-3">Okupansi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedEvent.categories.map((c) => {
                        const sold = c.kuota_total - c.kuota_tersedia;
                        const occ = c.kuota_total ? Math.round((sold / c.kuota_total) * 100) : 0;
                        return (
                          <tr key={c.id_kategori} className="hover:bg-slate-50/60">
                            <td className="px-6 py-3.5 font-bold text-slate-900">{c.nama_kategori}</td>
                            <td className="px-4 py-3.5 font-mono font-bold text-blue-700">
                              Rp {c.harga_tiket.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3.5 font-mono">
                              {sold} / {c.kuota_total}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-semibold text-slate-700">{c.kuota_tersedia}</td>
                            <td className="px-6 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${occ}%` }} />
                                </div>
                                <span className="font-mono font-bold text-slate-700">{occ}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : panel === 'events' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-xs">
              <div>
                <div className="text-sm font-bold text-slate-900">Total {events.length} Event Aktif</div>
                <div className="text-xs text-slate-500">
                  Klik tombol Pendaftar pada kartu event untuk melihat rincian pembeli dan status check-in.
                </div>
              </div>
              <button
                onClick={openCreateEventModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Tambah Event Baru
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {events.map((e) => {
                const s = e.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
                const t = e.categories.reduce((a, c) => a + c.kuota_total, 0);
                const sold = t - s;
                const occ = t ? Math.round((sold / t) * 100) : 0;
                const st = getEventStats(e);
                return (
                  <div
                    key={e.id_event}
                    className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div
                      className={`relative bg-slate-900 ${
                        e.poster_ratio === 'portrait' ? 'aspect-[3/4]' : 'h-40'
                      }`}
                    >
                      <img
                        src={e.poster_url || '/posters/poster-suramaya-fest.jpg'}
                        alt={e.nama_event}
                        className="h-full w-full object-cover object-top"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                      <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                        {e.genre || 'Indie'} &bull; {e.poster_ratio === 'portrait' ? '3:4' : '16:9'}
                      </span>
                      <span className="absolute right-3 top-3 rounded-md bg-slate-950/70 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                        {e.id_event}
                      </span>
                      <div className="absolute bottom-3 left-3.5 right-3.5 text-white">
                        <h3 className="truncate text-sm font-extrabold">{e.nama_event}</h3>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-200">
                          <Calendar className="h-3 w-3 shrink-0" /> {e.tanggal_event}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span className="truncate">{e.lokasi_venue}</span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[11px] font-semibold">
                            <span className="text-slate-600">
                              Terjual {sold} / {t}
                            </span>
                            <span className="font-mono font-bold text-blue-600">{occ}%</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${occ}%` }} />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-center">
                          <div>
                            <div className="text-[10px] font-semibold text-slate-400">Pendaftar</div>
                            <div className="font-mono text-xs font-extrabold text-slate-900">{st.totalOrders}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-slate-400">Lunas / Pend</div>
                            <div className="font-mono text-xs font-extrabold text-emerald-600">
                              {st.lunasOrders}
                              <span className="text-amber-600">/{st.pendingOrders}</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-semibold text-slate-400">Check-In</div>
                            <div className="font-mono text-xs font-extrabold text-blue-600">
                              {st.checkedInCount}/{st.issuedTicketCount}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                        <button
                          onClick={() => {
                            setDetailSubTab('pendaftar');
                            setSelectedEventId(e.id_event);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-blue-50 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <Users className="h-3.5 w-3.5" /> Detail &amp; Pendaftar
                        </button>
                        <button
                          onClick={() => startEditEvent(e)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => delEvent(e.id_event)}
                          className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                          title="Hapus Event"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== 4. MANAJEMEN & PANTAU PETUGAS GATE ==================== */}
        {panel === 'gatekeepers' && (
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Buat Akun Petugas Gate</h2>
              </div>
              {gkErr && (
                <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {gkErr}
                </div>
              )}
              <form onSubmit={createGatekeeper} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Nama Petugas / Pos Pintu</label>
                  <input
                    required
                    value={gkName}
                    onChange={(e) => setGkName(e.target.value)}
                    placeholder="Contoh: Rizky - Gate Utara"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Email Login Petugas</label>
                  <input
                    type="email"
                    required
                    value={gkEmail}
                    onChange={(e) => setGkEmail(e.target.value)}
                    placeholder="gate2@tiketkita.id"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Kata Sandi</label>
                  <input
                    type="password"
                    minLength={6}
                    required
                    value={gkPass}
                    onChange={(e) => setGkPass(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Nomor Telepon (Opsional)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    value={gkPhone}
                    onChange={(e) => setGkPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="081234567890"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={gkSaving}
                  className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {gkSaving ? 'Menyimpan...' : '+ Buat Akun Petugas Gate'}
                </button>
              </form>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-8">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Pemantauan Aktivitas Petugas Gate</h2>
                <p className="text-[11px] text-slate-500">
                  Jumlah tiket yang berhasil divalidasi oleh masing-masing akun petugas secara real-time.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Petugas &amp; Email</th>
                      <th className="px-4 py-3">Total Scan Valid</th>
                      <th className="px-4 py-3">Scan Terakhir</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-5 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gatekeepers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                          Belum ada akun petugas gate terdaftar.
                        </td>
                      </tr>
                    )}
                    {gatekeepers.map((gk) => (
                      <tr key={gk.id_pengguna} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="font-bold text-slate-900">{gk.nama_lengkap}</div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {gk.email} {gk.no_wa ? `• ${gk.no_wa}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-700">
                            {gk.total_scan} Tiket
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {gk.last_scan_at
                            ? new Date(gk.last_scan_at).toLocaleString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Belum ada scan'}
                        </td>
                        <td className="px-4 py-3">
                          {gk.status_aktif ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              Aktif
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500">
                              Nonaktif
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleGatekeeperStatus(gk)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                            >
                              <Power className="h-3 w-3" /> {gk.status_aktif ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              onClick={() => deleteGatekeeper(gk.id_pengguna)}
                              className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100"
                              title="Hapus Petugas"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 6. LAPORAN MIS (UPGRADED EXECUTIVE VIEW) ==================== */}
        {panel === 'mis' && (
          <div className="space-y-6">
            {/* Filter & Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-xs print:hidden">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-600">Filter Event:</span>
                <select
                  value={misEventFilter}
                  onChange={(e) => setMisEventFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="all">Semua Event ({events.length})</option>
                  {events.map((ev) => (
                    <option key={ev.id_event} value={ev.id_event}>
                      {ev.nama_event}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportMisCsv}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Export CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Printer className="h-3.5 w-3.5" /> Cetak Laporan
                </button>
              </div>
            </div>

            {/* 4 Executive KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Total Realisasi Pendapatan</div>
                <div className="mt-1.5 font-mono text-xl font-extrabold text-blue-600">
                  Rp {misSummary.revenue.toLocaleString('id-ID')}
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Dari {misSummary.lunas} transaksi lunas</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Rata-rata Okupansi</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-emerald-600">{misAvgOcc}%</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {misSummary.sold} dari {misSummary.quota} kuota terjual
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Rasio Kehadiran (Check-In)</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">
                  {misSummary.issued ? Math.round((misSummary.checkedIn / misSummary.issued) * 100) : 0}%
                </div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {misSummary.checkedIn} / {misSummary.issued} E-Ticket terbit
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="text-xs font-semibold text-slate-500">Pendaftar Lunas vs Pending</div>
                <div className="mt-1.5 font-mono text-2xl font-extrabold text-slate-900">
                  {misSummary.lunas}{' '}
                  <span className="text-sm font-bold text-amber-600">/ {misSummary.pending} pending</span>
                </div>
                <div className="mt-1 text-[11px] text-slate-400">Total {misSummary.orders} pendaftaran</div>
              </div>
            </div>

            {/* Visual Bar Chart Perbandingan Omzet per Event */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Perbandingan Realisasi Pendapatan per Event</h2>
              <div className="space-y-3.5">
                {misEvents.map((ev) => {
                  const st = getEventStats(ev);
                  const pct = Math.round((st.revenue / maxEventRev) * 100);
                  return (
                    <div key={ev.id_event} className="grid items-center gap-3 sm:grid-cols-12">
                      <div className="truncate text-xs font-bold text-slate-700 sm:col-span-4">{ev.nama_event}</div>
                      <div className="sm:col-span-5">
                        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-500"
                            style={{ width: `${Math.max(pct, st.revenue > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs font-extrabold text-blue-700 sm:col-span-3">
                        Rp {st.revenue.toLocaleString('id-ID')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rekapitulasi Tabel MIS Lengkap + Baris Total */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-bold text-slate-900">Tabel Rekapitulasi Penjualan, Pendaftar &amp; Okupansi</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Nama Event</th>
                      <th className="px-4 py-3">Pendaftar (Lunas / Pending)</th>
                      <th className="px-4 py-3">Terjual / Kuota</th>
                      <th className="px-4 py-3">Okupansi</th>
                      <th className="px-4 py-3">Check-In</th>
                      <th className="px-5 py-3 text-right">Realisasi Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {misEvents.map((e) => {
                      const tot = e.categories.reduce((a, c) => a + c.kuota_total, 0);
                      const sisa = e.categories.reduce((a, c) => a + c.kuota_tersedia, 0);
                      const sold = tot - sisa;
                      const occ = tot ? Math.round((sold / tot) * 100) : 0;
                      const st = getEventStats(e);
                      return (
                        <tr key={e.id_event} className="hover:bg-slate-50/50">
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-900">{e.nama_event}</div>
                            <div className="text-[11px] text-slate-400">{e.tanggal_event}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-900">{st.totalOrders}</span>{' '}
                            <span className="text-[11px] text-slate-500">
                              ({st.lunasOrders} lunas, {st.pendingOrders} pending)
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {sold} / {tot}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${occ}%` }} />
                              </div>
                              <span className="font-mono font-bold text-slate-700">{occ}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {st.checkedInCount} / {st.issuedTicketCount}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-blue-600">
                            Rp {st.revenue.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
                    <tr>
                      <td className="px-5 py-3.5 uppercase">Total Keseluruhan</td>
                      <td className="px-4 py-3.5">
                        {misSummary.orders} ({misSummary.lunas} lunas, {misSummary.pending} pending)
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        {misSummary.sold} / {misSummary.quota}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-emerald-700">{misAvgOcc}%</td>
                      <td className="px-4 py-3.5 font-mono">
                        {misSummary.checkedIn} / {misSummary.issued}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-sm text-blue-700">
                        Rp {misSummary.revenue.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================== MODAL TAMBAH / EDIT EVENT ==================== */}
      {eventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingEventId ? `Edit Event (${editingEventId})` : 'Tambah Event Konser Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setEventModalOpen(false)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveEvent} className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">Nama Event Konser</label>
                <input
                  required
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  placeholder="Contoh: Soundwave Indie Fest 2026"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Tanggal Pelaksanaan</label>
                <input
                  required
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  placeholder="20 Des 2026"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Lokasi Venue</label>
                <input
                  required
                  value={evLoc}
                  onChange={(e) => setEvLoc(e.target.value)}
                  placeholder="Lapangan Kota"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Genre Musik</label>
                <select
                  value={evGenre}
                  onChange={(e) => setEvGenre(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                >
                  {CONCERT_GENRES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Rasio Poster di Beranda</label>
                <select
                  value={evRatio}
                  onChange={(e) => setEvRatio(e.target.value as 'landscape' | 'portrait')}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                >
                  <option value="landscape">Landscape (16:9 / Lebar)</option>
                  <option value="portrait">Portrait (3:4 / Tegak)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Harga Tiket (Rp)</label>
                <input
                  type="number"
                  required
                  value={evPrice}
                  onChange={(e) => setEvPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Kuota Total</label>
                <input
                  type="number"
                  required
                  value={evQuota}
                  onChange={(e) => setEvQuota(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">Upload Foto Poster (JPG / PNG / WebP)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                />
                {uploading && <span className="mt-1 block text-[11px] font-semibold text-blue-600">Mengunggah poster...</span>}
              </div>

              {evPosterUrl && (
                <div className="flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3 sm:col-span-2">
                  <img
                    src={evPosterUrl}
                    alt="Preview Poster"
                    className={
                      evRatio === 'portrait'
                        ? 'h-24 w-18 rounded-lg border border-slate-200 object-cover'
                        : 'h-18 w-32 rounded-lg border border-slate-200 object-cover'
                    }
                  />
                  <div className="min-w-0 text-xs text-slate-600">
                    <div className="font-bold text-slate-900">
                      Poster Siap ({evRatio === 'portrait' ? 'Portrait 3:4' : 'Landscape 16:9'})
                    </div>
                    <div className="truncate font-mono text-[11px] text-blue-600">{evPosterUrl}</div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setEventModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingEventId ? 'Simpan Perubahan' : 'Simpan Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
