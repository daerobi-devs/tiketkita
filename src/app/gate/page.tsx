'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import { Ticket, QrCode, LayoutDashboard, Camera, CameraOff, Upload } from 'lucide-react';

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

export default function GatePage() {
  const [kode, setKode] = useState('');
  const [res, setRes] = useState<ScanResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camErr, setCamErr] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  async function validateCode(qrText: string) {
    const clean = qrText.trim();
    if (!clean) return;
    setKode(clean);
    const r = await fetch('/api/gate/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kode_qr: clean }),
    });
    const data = await r.json();
    setRes(data);
  }

  async function startCamera() {
    setCamErr('');
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopCamera();
          await validateCode(decodedText);
        },
        () => {}
      );
    } catch (e) {
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCamErr('');
    try {
      const scanner = new Html5Qrcode('qr-file-reader');
      const decoded = await scanner.scanFile(file, true);
      scanner.clear();
      await validateCode(decoded);
    } catch {
      setCamErr('Gagal membaca kode QR dari gambar tersebut.');
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-4 py-5 md:flex">
        <div>
          <Link href="/" className="flex items-center gap-2.5 border-b border-slate-100 px-2 pb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight">Tiket<span className="text-blue-600">Kita</span></div>
              <div className="text-[11px] text-slate-400">Gate Check-In</div>
            </div>
          </Link>
          <div className="mt-5 space-y-1">
            <div className="flex items-center gap-2.5 rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-bold text-blue-700">
              <QrCode className="h-4 w-4" /> Validasi Scan QR
            </div>
            <Link href="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600">
              <LayoutDashboard className="h-4 w-4" /> Dashboard Admin
            </Link>
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <Link href="/login" className="block rounded-xl border border-slate-200 py-2 text-center text-xs font-bold text-slate-600 hover:bg-slate-50">Ganti Akun</Link>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-2xl space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Scanner Validasi Tiket Pintu Masuk</h1>
            <p className="mt-1 text-xs text-slate-500">Gunakan kamera langsung, unggah gambar QR E-Ticket, atau ketik kode tiket manual.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            {/* Camera & Upload Controls */}
            <div className="flex flex-wrap gap-3">
              {!scanning ? (
                <button onClick={startCamera} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700">
                  <Camera className="h-4 w-4" /> Aktifkan Kamera Scanner
                </button>
              ) : (
                <button onClick={stopCamera} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700">
                  <CameraOff className="h-4 w-4" /> Matikan Kamera
                </button>
              )}

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-blue-300 hover:bg-blue-50">
                <Upload className="h-4 w-4 text-blue-600" /> Scan dari Gambar QR
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div id="qr-reader" className={scanning ? 'overflow-hidden rounded-xl border border-blue-200' : 'hidden'} />
            <div id="qr-file-reader" className="hidden" />

            {camErr && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
                {camErr}
              </div>
            )}

            {/* Manual Input */}
            <form onSubmit={(e) => { e.preventDefault(); validateCode(kode); }} className="flex gap-3 border-t border-slate-100 pt-4">
              <input
                required
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                placeholder="Atau ketik kode QR (contoh: TKT-2611-002)"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
              <button type="submit" className="shrink-0 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800">
                Validasi
              </button>
            </form>

            {/* Result Box */}
            {!res ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-medium text-slate-600">
                Menunggu pemindaian kode QR E-Ticket...
              </div>
            ) : res.valid ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <div className="text-sm font-extrabold">{res.message}</div>
                {res.ticket && (
                  <div className="mt-1">
                    Pemegang: <b>{res.ticket.nama_pemegang}</b> &bull; {res.ticket.nama_event} ({res.ticket.nama_kategori})
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
                <div className="text-sm font-extrabold">DITOLAK</div>
                <div className="mt-1">{res.message}</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
