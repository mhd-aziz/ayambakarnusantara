# Ayam Bakar Nusantara

Marketplace web sederhana untuk jualan ayam bakar dan makanan Nusantara. Pembeli bisa lihat menu, pesan, bayar (tunai di tempat atau online), chat penjual, dan kasih rating. Penjual bisa buka toko gratis, kelola menu, dan proses pesanan dari satu dashboard.

## Struktur repo

| Folder | Isi |
|---|---|
| `backend-ayambakarnusantara/` | Server Node.js + Express 5, database Supabase (PostgreSQL), integrasi Midtrans |
| `frontend-ayambakarnusantara/` | Aplikasi React (Vite + React Bootstrap) |

Dokumentasi lengkap ada di `backend-ayambakarnusantara/docs/`. Urutan bacaan yang disarankan:

1. `docs/MVP.md` — gambaran singkat produk, fitur, dan cara pakai
2. `docs/IDEA.md` — visi dan alasan project ini dibuat
3. `docs/ARCHITECTURE.md` — bagaimana sistem bekerja dari atas ke bawah
4. `docs/DATA-MODEL.md` — struktur tabel database
5. `docs/API-REFERENCE.md` — daftar lengkap endpoint backend
6. `docs/BUSINESS-FLOW.md` — aturan bisnis dan alur pesanan
7. `docs/ROADMAP.md` — masalah yang sudah/belum diperbaiki
8. `docs/REVIEW-2026-08-05.md` — hasil audit menyeluruh kode (backend + frontend)

## Menjalankan di lokal

Backend (port 5000):

```bash
cd backend-ayambakarnusantara
npm install
cp .env.example .env.dev   # isi kredensial Supabase & Midtrans
npm run dev
```

Frontend (port 3000):

```bash
cd frontend-ayambakarnusantara
npm install
cp .env.example .env.dev   # atur VITE_API_BASE_URL (default http://localhost:5000)
npm run dev
```

Buka `http://localhost:3000`. Catatan: environment frontend memakai pola 3 file seperti backend, yaitu `.env` (dasar), `.env.dev` (developer), dan `.env.prod` (produksi). Script `npm run dev` otomatis memakai `.env.dev`, `npm run build` memakai `.env.prod`.
