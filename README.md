# Ayam Bakar Nusantara

Marketplace web multi-vendor untuk jualan ayam bakar dan makanan Nusantara. Pembeli bisa lihat menu, pesan, bayar (tunai di tempat atau online), chat penjual, dan kasih rating. Penjual bisa buka toko gratis, kelola menu, dan proses pesanan dari satu dashboard.

## Stack

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | React 19, Vite 6, Bootstrap 5, React Router, Axios |
| Backend | Node.js, Express 5, Supabase (PostgreSQL), Midtrans |
| AI Chatbot | OmniRoute Gateway |
| Deploy | Docker, Cloudflare Tunnel, GitHub Actions |

## Struktur repo

| Folder | Isi |
|--------|-----|
| `backend/` | Server Node.js + Express 5, database Supabase, integrasi Midtrans & Resend |
| `frontend/` | Aplikasi React (Vite + React Bootstrap) |
| `review/` | Riwayat laporan audit & QA (tidak di-push ke GitHub) |

Dokumentasi teknis ada di `backend/docs/`. Urutan bacaan:

1. `docs/MVP.md` — gambaran singkat produk, fitur, dan cara pakai
2. `docs/ARCHITECTURE.md` — bagaimana sistem bekerja
3. `docs/DATA-MODEL.md` — struktur tabel database
4. `docs/API-REFERENCE.md` — daftar endpoint backend
5. `docs/BUSINESS-FLOW.md` — aturan bisnis dan alur pesanan
6. `docs/ROADMAP.md` — masalah yang sudah/belum diperbaiki

## Menjalankan di lokal

**Backend** (port 5000):
```bash
cd backend
npm install
cp .env.example .env.dev   # isi kredensial Supabase & Midtrans
npm run dev
```

**Frontend** (port 3000):
```bash
cd frontend
npm install
cp .env.example .env.dev   # atur VITE_API_BASE_URL (default http://localhost:5000)
npm run dev
```

Buka `http://localhost:3000`. Frontend memakai pola 3 file environment: `.env` (dasar), `.env.dev` (dev), `.env.prod` (produksi). `npm run dev` otomatis memakai `.env.dev`, `npm run build` memakai `.env.prod`.

## CI/CD

Empat workflow GitHub Actions:

| Workflow | Pemicu | Isi |
|----------|--------|-----|
| Backend CI | Push/PR ke `main` (backend/) | Syntax check, unit test, docker build |
| Frontend CI | Push/PR ke `main` (frontend/) | Build, test, docker build |
| Backend Deploy | Push ke `main` (backend/) | Deploy ke VPS via self-hosted runner |
| Frontend Deploy | Push ke `main` (frontend/) | Deploy ke VPS via self-hosted runner |

## Deployment

Akses publik:
- Frontend: `https://ayambakarnusantara.zisaltech.site`
- API: `https://abn-api.zisaltech.site`

Keduanya di belakang Cloudflare Tunnel. Backend berjalan di container Docker dengan Supabase sebagai database. Semua file `.env` di-ignore Git — kredensial tidak ikut di-repo publik.