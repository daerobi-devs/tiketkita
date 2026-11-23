'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  X,
  RefreshCw,
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
  genre: string;
  poster_ratio?: 'landscape' | 'portrait';
  tanggal_event: string;
  waktu_mulai: string;
  lokasi_venue: string;
  poster_url: string;
  categories: Category[];
}

interface MpgPayment {
  order_id: string;
  amount: number;
  unique_code: number;
  final_amount: number;
  qr_string: string;
  checkout_url: string;
  expires_at: string;
}

export default function BeliTiketPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ev, setEv] = useState<EventItem | null>(null);
  const [catId, setCatId] = useState('');
  const [qty, setQty] = useState(1);
  const [nama, setNama] = useState('');
  const [wa, setWa] = useState('');
  const [email, setEmail] = useState('');
  const [metode, setMetode] = useState<'QRIS Otomatis' | 'QRIS Manual'>('QRIS Otomatis');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  // Headless Modal Pop-up (OPSI B)
  const [paymentModal, setPaymentModal] = useState<MpgPayment | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('tiketkita_user');
    if (!saved) {
      router.replace(`/login?redirect=${encodeURIComponent(`/beli/${id}`)}`);
      return;
    }
    const u = JSON.parse(saved);
    if (u.nama_lengkap) setNama(u.nama_lengkap);
    if (u.email) setEmail(u.email);
    if (u.no_wa) setWa(String(u.no_wa).replace(/[^0-9]/g, ''));
    setAuthChecked(true);

    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.events || []).find((x: EventItem) => x.id_event === id) || d.events?.[0];
        if (found) {
          setEv(found);
          const avail = found.categories.find((c: Category) => c.kuota_tersedia > 0) || found.categories[0];
          if (avail) setCatId(avail.id_kategori);
        }
      });
  }, [id, router]);

  // Poll status order setiap 3 detik saat modal QRIS terbuka
  useEffect(() => {
    if (!paymentModal || isPaid) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${paymentModal.order_id}/status`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status_bayar === 'lunas') {
          setIsPaid(true);
          clearInterval(timer);
        }
      } catch {
        // ignore transient network errors during polling
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [paymentModal, isPaid]);

  const selectedCat = ev?.categories.find((c) => c.id_kategori === catId);
  const subtotal = (selectedCat?.harga_tiket || 0) * qty;
  const total = subtotal + 5000;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCat) return;
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_kategori: selectedCat.id_kategori,
          nama_pemesan: nama,
          no_wa: wa,
          email_pemesan: email,
          jumlah_tiket: qty,
          metode_bayar: metode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || 'Gagal memproses pesanan.');
        setLoading(false);
        return;
      }

      if (metode === 'QRIS Otomatis' && data.payment?.qr_string) {
        const qrImg = await QRCode.toDataURL(data.payment.qr_string, {
          width: 280,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrDataUrl(qrImg);
        setIsPaid(false);
        setPaymentModal(data.payment);
        setLoading(false);
        return;
      }

      router.push('/tiket-saya');
    } catch {
      setErr('Koneksi ke server bermasalah.');
      setLoading(false);
    }
  }

  function copyExactAmount() {
    if (!paymentModal) return;
    navigator.clipboard.writeText(String(paymentModal.final_amount));
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  }

  if (!authChecked || !ev) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-500">
        Memuat detail konser...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/tiket-saya" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard Saya
        </Link>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left: Event & Category Selection */}
          <div className="space-y-6 lg:col-span-7">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div
                className={`relative bg-slate-900 ${
                  ev.poster_ratio === 'portrait' ? 'aspect-[3/4] max-h-[460px] w-full' : 'h-52'
                }`}
              >
                <img src={ev.poster_url} alt={ev.nama_event} className="h-full w-full object-cover object-top" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold">{ev.genre}</span>
                  <h1 className="mt-1.5 text-2xl font-extrabold">{ev.nama_event}</h1>
                  <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-200">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-sky-400" /> {ev.tanggal_event} &bull; {ev.waktu_mulai}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-sky-400" /> {ev.lokasi_venue}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h2 className="mb-3 text-sm font-bold text-slate-900">1. Pilih Kategori Tiket</h2>
                <div className="space-y-2.5">
                  {ev.categories.map((c) => {
                    const soldOut = c.kuota_tersedia <= 0;
                    const active = c.id_kategori === catId;
                    return (
                      <button
                        type="button"
                        key={c.id_kategori}
                        disabled={soldOut}
                        onClick={() => setCatId(c.id_kategori)}
                        className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                          soldOut
                            ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                            : active
                              ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                              : 'border-slate-200 bg-white hover:border-blue-200'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">{c.nama_kategori}</div>
                          <div className="text-xs text-slate-500">
                            {soldOut ? 'Kuota Habis' : `Sisa ${c.kuota_tersedia} dari ${c.kuota_total} tiket`}
                          </div>
                        </div>
                        <div className="text-sm font-extrabold text-blue-600">
                          Rp {c.harga_tiket.toLocaleString('id-ID')}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Buyer Form & QRIS Payment */}
          <div className="lg:col-span-5">
            <form onSubmit={handleCheckout} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">2. Data Pemesan &amp; Pembayaran QRIS</h2>

              {err && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {err}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Nama Lengkap</label>
                <input
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Nomor Telepon (Opsional)</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={15}
                    value={wa}
                    onChange={(e) => setWa(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="081234567890"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Jumlah Tiket</label>
                  <select
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} Tiket
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Mode QRIS</label>
                  <select
                    value={metode}
                    onChange={(e) => setMetode(e.target.value as 'QRIS Otomatis' | 'QRIS Manual')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="QRIS Otomatis">QRIS Otomatis (MPG)</option>
                    <option value="QRIS Manual">QRIS Manual (Cek Admin)</option>
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3.5 py-2.5 text-[11px] font-medium text-slate-600">
                {metode === 'QRIS Otomatis'
                  ? 'Kode QRIS dinamis beserta nominal persis akan muncul setelah Anda menekan tombol Konfirmasi & Bayar Sekarang.'
                  : 'Pesanan Anda akan diteruskan ke Admin EO untuk verifikasi pembayaran manual.'}
              </div>

              <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal ({qty} tiket)</span>
                  <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Layanan</span>
                  <span>Rp 5.000</span>
                </div>
                <div className="flex justify-between pt-1 text-sm font-extrabold text-blue-600">
                  <span>Total Bayar</span>
                  <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !selectedCat || selectedCat.kuota_tersedia < qty}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading ? 'Membuat Tagihan QRIS...' : 'Konfirmasi & Bayar Sekarang'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* OPSI B: HEADLESS MODAL POP-UP QRIS DINAMIS (MPG) */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-slate-900">Pembayaran QRIS Dinamis</div>
                <div className="font-mono text-[11px] text-slate-400">{paymentModal.order_id}</div>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModal(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isPaid ? (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">Pembayaran Diterima!</h3>
                <p className="mt-1 text-xs text-slate-500">
                  E-Ticket QR Code Anda sudah aktif dan siap digunakan di pintu masuk venue.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/tiket-saya')}
                  className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Lihat E-Ticket Saya
                </button>
              </div>
            ) : (
              <div className="p-6 text-center">
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                  <div className="text-[11px] font-semibold text-slate-500">
                    Transfer Nominal Persis (Termasuk Kode Unik +{paymentModal.unique_code})
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    <span className="font-mono text-2xl font-extrabold text-blue-700">
                      Rp {paymentModal.final_amount.toLocaleString('id-ID')}
                    </span>
                    <button
                      type="button"
                      onClick={copyExactAmount}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-50"
                    >
                      {copiedAmount ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedAmount ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                </div>

                {qrDataUrl && (
                  <div className="mx-auto mt-4 inline-block rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
                    <img src={qrDataUrl} alt="QRIS Dinamis MPG" className="h-56 w-56" />
                  </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Scan menggunakan BCA, Mandiri, BRI, BNI, GoPay, OVO, DANA, atau ShopeePay.
                </p>

                <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-2 text-[11px] font-semibold text-slate-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                  Menunggu konfirmasi otomatis dari Mandiri Private Gateway...
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href="/tiket-saya"
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cek di Tiket Saya
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
