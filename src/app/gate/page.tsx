'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Ticket,
  QrCode,
  LayoutDashboard,
  Camera,
  CameraOff,
  Upload,
  Volume2,
  VolumeX,
  LogOut,
  SwitchCamera,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

interface ScanResponse {
  valid?: boolean;
  message?: string;
  ticket?: {
    nama_pemegang: string;
    nama_event: string;
    nama_kategori: string;
    kode_qr: string;
  };
}

interface ScanLogItem {
  id: string;
  time: string;
  kode: string;
  valid: boolean;
  message: string;
  holder?: string;
  eventInfo?: string;
}

export default function GatePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id_pengguna?: string; nama_lengkap?: string; email?: string; peran?: string } | null>(null);
  const [kode, setKode] = useState('');
  const [res, setRes] = useState<ScanResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [soundOn, setSoundOn] = useState(true);
  const [camErr, setCamErr] = useState('');
  const [logs, setLogs] = useState<ScanLogItem[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const soundOnRef = useRef(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isBusyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  function ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }

  function playScanSound(isValid: boolean) {
    if (!soundOnRef.current) return;
    const ctx = ensureAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (isValid) {
      [
        { freq: 880, start: 0, dur: 0.12 },
        { freq: 1318.5, start: 0.11, dur: 0.22 },
      ].forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0.001, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.28, now + n.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
      });
    } else {
      [
        { freq: 240, start: 0, dur: 0.14 },
        { freq: 175, start: 0.17, dur: 0.22 },
      ].forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        gain.gain.setValueAtTime(0.001, now + n.start);
        gain.gain.exponentialRampToValueAtTime(0.22, now + n.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.start + n.dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur + 0.02);
      });
    }
  }

  async function validateCode(qrText: string) {
    const clean = qrText.trim();
    if (!clean) return;
    ensureAudioContext();
    setKode(clean);
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('tiketkita_user') : null;
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    const r = await fetch('/api/gate/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode_qr: clean, id_petugas: parsedUser?.id_pengguna || 'USR-GAT-01' }),
    });
    const data: ScanResponse = await r.json();
    setRes(data);
    playScanSound(Boolean(data.valid));

    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: timeStr,
        kode: clean,
        valid: Boolean(data.valid),
        message: data.message || (data.valid ? 'Check-In Berhasil' : 'Tiket Tidak Valid'),
        holder: data.ticket?.nama_pemegang,
        eventInfo: data.ticket ? `${data.ticket.nama_event} (${data.ticket.nama_kategori})` : undefined,
      },
      ...prev.slice(0, 14),
    ]);
  }

  async function startCamera(mode: 'environment' | 'user' = facingMode) {
    setCamErr('');
    ensureAudioContext();
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: mode },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          const clean = decodedText.trim();
          const now = Date.now();
          if (isBusyRef.current) return;
          if (lastScanRef.current.code === clean && now - lastScanRef.current.at < 3000) {
            return;
          }
          isBusyRef.current = true;
          lastScanRef.current = { code: clean, at: now };
          try {
            await validateCode(clean);
          } finally {
            setTimeout(() => {
              isBusyRef.current = false;
            }, 900);
          }
        },
        () => {}
      );
    } catch {
      setScanning(false);
      setCamErr('Kamera tidak tersedia atau izin kamera ditolak. Gunakan Upload Gambar QR atau input manual.');
    }
  }

  async function stopCamera() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function switchCamera() {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (scanning) {
      await stopCamera();
      await startCamera(nextMode);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCamErr('');
    ensureAudioContext();
    try {
      const scanner = new Html5Qrcode('qr-file-reader');
      const decoded = await scanner.scanFile(file, true);
      scanner.clear();
      await validateCode(decoded);
    } catch {
      setCamErr('Gagal membaca kode QR dari gambar tersebut.');
      playScanSound(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('tiketkita_user');
    if (saved) setUser(JSON.parse(saved));
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  function logout() {
    localStorage.removeItem('tiketkita_user');
    router.push('/login');
  }

  const validCount = logs.filter((l) => l.valid).length;
  const invalidCount = logs.filter((l) => !l.valid).length;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 md:flex-row">
      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div>
            <img src="/brand/logo-horizontal.png" alt="TiketKita" className="h-7 w-auto object-contain" />
            <div className="text-[10px] font-semibold text-slate-400">Gate Check-In</div>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-3.5 w-3.5" /> Keluar
        </button>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <div>
          <Link href="/" className="block border-b border-slate-100 px-2 pb-5">
            <img src="/brand/logo-horizontal.png" alt="TiketKita" className="h-8 w-auto object-contain" />
            <div className="mt-1 text-[11px] font-semibold text-slate-400">Gate Check-In</div>
          </Link>
          <div className="mt-5 space-y-1">
            <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700">
              <QrCode className="h-4 w-4" /> Validasi Scan QR
            </div>
            {user?.peran === 'admin' && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600"
              >
                <LayoutDashboard className="h-4 w-4" /> Dashboard Admin
              </Link>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <div className="mb-3 px-1">
            <div className="truncate text-xs font-bold text-slate-900">{user?.nama_lengkap || 'Petugas Gate'}</div>
            <div className="truncate text-[11px] text-slate-400">{user?.email || 'gate@tiketkita.id'}</div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-3.5 w-3.5" /> Keluar Akun
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-3xl space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Scanner Validasi Tiket Pintu Masuk
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Mode scan berkelanjutan: kamera tetap aktif setelah validasi disertai efek suara dan riwayat check-in.
            </p>
          </div>

          {/* SESSION COUNTERS */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Berhasil Masuk</div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-emerald-600">{validCount}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Ditolak / Duplikat</div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-rose-600">{invalidCount}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">Total Scan Sesi</div>
              <div className="mt-1 font-mono text-2xl font-extrabold text-blue-600">{logs.length}</div>
            </div>
          </div>

          {/* SCANNER CARD */}
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              {!scanning ? (
                <button
                  onClick={() => startCamera()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4" /> Aktifkan Kamera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <CameraOff className="h-4 w-4" /> Matikan Kamera
                </button>
              )}

              <button
                type="button"
                onClick={switchCamera}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              >
                <SwitchCamera className="h-4 w-4 text-blue-600" />
                {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
                <Upload className="h-4 w-4 text-blue-600" /> Scan Gambar
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => {
                  ensureAudioContext();
                  setSoundOn((v) => !v);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                  soundOn
                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {soundOn ? 'Suara Aktif' : 'Bisu'}
              </button>
            </div>

            <div
              id="qr-reader"
              className={scanning ? 'overflow-hidden rounded-xl border border-blue-200' : 'hidden'}
            />
            <div id="qr-file-reader" className="hidden" />

            {camErr && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
                {camErr}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                validateCode(kode);
              }}
              className="flex gap-2.5 border-t border-slate-100 pt-4"
            >
              <input
                required
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="Atau ketik kode QR (contoh: TKT-2611-002)"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
              >
                Validasi
              </button>
            </form>

            {!res ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                Menunggu pemindaian kode QR E-Ticket...
              </div>
            ) : res.valid ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <div className="flex items-center gap-1.5 text-sm font-extrabold">
                  <CheckCircle2 className="h-4 w-4" /> {res.message}
                </div>
                {res.ticket && (
                  <div className="mt-1">
                    Pemegang: <b>{res.ticket.nama_pemegang}</b> &bull; {res.ticket.nama_event} (
                    {res.ticket.nama_kategori})
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                <div className="flex items-center gap-1.5 text-sm font-extrabold">
                  <XCircle className="h-4 w-4" /> {res.message || 'Tiket tidak valid.'}
                </div>
                {res.ticket && (
                  <div className="mt-1">
                    Pemegang: <b>{res.ticket.nama_pemegang}</b> &bull; {res.ticket.nama_event}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LIVE CHECK-IN LOG */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Clock className="h-4 w-4 text-blue-600" /> Riwayat Scan Terakhir (Sesi Ini)
              </div>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setLogs([])}
                  className="text-[11px] font-bold text-slate-400 hover:text-rose-600"
                >
                  Bersihkan
                </button>
              )}
            </div>
            {logs.length === 0 ? (
              <div className="px-5 py-6 text-center text-xs text-slate-400">
                Belum ada riwayat pemindaian pada sesi ini.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{item.kode}</span>
                        <span className="text-[11px] text-slate-400">{item.time}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {item.holder ? `${item.holder} • ${item.eventInfo}` : item.message}
                      </div>
                    </div>
                    {item.valid ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        Masuk
                      </span>
                    ) : (
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                        Ditolak
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
