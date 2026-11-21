# tiketkita

Sistem Informasi Manajemen Penjualan Tiket Event dan Konser Lokal berbasis Next.js App Router, PostgreSQL, MinIO S3, QRIS Dinamis Mandiri Private Gateway (MPG), dan Portal Scan QR Gatekeeper.

## Menjalankan Lokal

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Build & Deploy (Docker)

```bash
docker build -t tiketkita .
docker run -p 3000:3000 --env-file .env.local tiketkita
```
