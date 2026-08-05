# MVP — Ayam Bakar Nusantara

Dokumen ini sengaja dibuat ringkas. Baca ini dulu, lalu lanjut ke `ARCHITECTURE.md`, `DATA-MODEL.md`, `API-REFERENCE.md`, `BUSINESS-FLOW.md`, dan `ROADMAP.md`.

## Apa ini?

Marketplace online jualan ayam bakar. Mirip GoFood atau Shopee versi sederhana, khusus makanan Nusantara.

Dua jenis pengguna:

| Peran | Bisa apa |
|---|---|
| Pembeli (customer) | Lihat menu, cari dan filter produk, tambah ke keranjang, checkout, bayar, chat penjual, kasih rating dan ulasan |
| Penjual (seller) | Buka toko, upload produk (nama, harga, stok, gambar), proses pesanan, konfirmasi pembayaran, lihat statistik toko |

Satu orang bisa jadi pembeli dulu, lalu buka toko. Tidak perlu akun terpisah.

## Fitur utama

1. Akun: daftar, masuk, lupa password, edit profil, hapus akun.
2. Katalog menu: daftar produk semua toko, cari, filter kategori (Makanan, Minuman, Camilan), urutkan.
3. Toko penjual: buka toko (otomatis jadi seller), kelola produk dan info toko, dashboard statistik.
4. Keranjang: tambah, kurangi, hapus item, total otomatis.
5. Pesanan: checkout dua cara bayar, pantau status, batalkan.
6. Rating dan ulasan: bintang 1-5 plus komentar, muncul di halaman produk dan beranda.
7. Chat satu lawan satu pembeli dan penjual (teks, gambar, lokasi).
8. Chatbot asisten otomatis untuk tanya jawab.
9. Notifikasi: lonceng di navbar untuk pesanan baru, update status, dan pesan chat.
10. Feedback: formulir saran di halaman beranda.

## Dua cara pembayaran

| Metode | Cara kerja |
|---|---|
| Bayar di tempat | Pesan, penjual proses, ambil dan bayar tunai di toko, penjual konfirmasi dan unggah bukti |
| Pembayaran online | Pesan, pilih Bayar Sekarang, dibuka halaman Midtrans (transfer, QR, VA), lunas terdeteksi otomatis lewat webhook atau cek status |

## Status pesanan

```
Menunggu Pembayaran / Menunggu Konfirmasi
        |
        v
   Terkonfirmasi (CONFIRMED)
        |
        v
   Sedang Diproses (PROCESSING)
        |
        v
   Siap Diambil (READY_FOR_PICKUP)
        |
        v
   Selesai (COMPLETED)   <- baru bisa kasih rating
```

Pesanan bisa dibatalkan hanya di dua status awal. Stok otomatis kembali.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Backend | Node.js + Express 5 |
| Database | Supabase (PostgreSQL) dengan RLS dan fungsi RPC atomik |
| Login | Supabase Auth, token JWT lewat cookie httpOnly (auto-refresh) |
| Upload gambar | Supabase Storage |
| Pembayaran | Midtrans Snap + webhook notifikasi |
| Chatbot | OmniRoute (proxy lewat env `RASA_WEBHOOK_URL`) |
| Frontend | React 19 + Vite + React Bootstrap |

## Menjalankan di lokal

```bash
# Backend (port 5000)
cd backend-ayambakarnusantara
npm install
cp .env.example .env.dev   # isi kredensial Supabase & Midtrans
npm run dev

# Frontend (port 3000)
cd frontend-ayambakarnusantara
npm install
cp .env.example .env.dev   # atur VITE_API_BASE_URL
npm run dev
```

Buka `http://localhost:3000`.

## Struktur folder singkat

```
ayam-bakar-nusantara/
├── README.md                     # pintu masuk project ini
├── backend-ayambakarnusantara/
│   ├── docs/                     # semua dokumentasi (.md)
│   ├── supabase/                 # skema SQL dan fungsi RPC
│   └── src/
│       ├── config/               # Supabase, Midtrans
│       ├── controllers/          # logika bisnis
│       ├── middlewares/          # cek login, cek role, upload, rate limit
│       ├── routes/               # daftar endpoint
│       └── index.js              # titik masuk server
└── frontend-ayambakarnusantara/
    └── src/
        ├── pages/                # halaman (menu, keranjang, pesanan, toko-saya, dll.)
        ├── components/           # komponen UI (navbar, chat, modal, dll.)
        ├── context/              # state login dan keranjang
        ├── css/                  # stylesheet per halaman
        └── services/             # pemanggilan API
```

## Bacaan lanjutan

- `ARCHITECTURE.md` — bagaimana sistem bekerja (alur request, sesi, desain)
- `DATA-MODEL.md` — struktur database
- `API-REFERENCE.md` — daftar lengkap endpoint
- `BUSINESS-FLOW.md` — alur bisnis detail dan aturan
- `ROADMAP.md` — masalah yang ditemukan dan rencana perbaikan
