# 🍗 MVP — Ayam Bakar Nusantara

> Dokumen ini sengaja dibuat **sangat sederhana**. Baca ini dulu — setelah paham, baru baca
> `ARCHITECTURE.md`, `DATA-MODEL.md`, `API-REFERENCE.md`, `BUSINESS-FLOW.md`, dan `ROADMAP.md`.

---

## Apa ini? 🤔

**Marketplace online jualan ayam bakar.** Mirip GoFood/Shopee versi sederhana, khusus makanan Nusantara.

Dua jenis pengguna:

| Peran | Bisa apa saja? |
|---|---|
| 🛒 **Pembeli (customer)** | Lihat menu, cari & filter produk, tambah ke keranjang, checkout, bayar, chat penjual, kasih rating & ulasan |
| 🏪 **Penjual (seller)** | Buka toko, upload produk (nama, harga, stok, gambar), proses pesanan, konfirmasi pembayaran, lihat statistik toko |

Satu orang bisa **jadi pembeli dulu, lalu buka toko** — tidak perlu akun terpisah.

---

## Fitur utama (sekali lihat) ⭐

1. **Akun** — register, login, lupa password, edit profil, hapus akun
2. **Katalog menu** — daftar produk semua toko, cari, filter kategori (Makanan/Minuman/Camilan), urutkan
3. **Toko penjual** — buka toko (otomatis jadi seller), kelola produk, kelola info toko, dashboard statistik
4. **Keranjang** — tambah/kurangi/hapus item, hitung total otomatis
5. **Pesanan** — checkout dengan 2 cara bayar (lihat di bawah), pantau status, batalkan
6. **Rating & ulasan** — bintang 1–5 + komentar, muncul di halaman produk & beranda
7. **Chat** — chat 1-ke-1 pembeli ↔ penjual (teks, gambar, lokasi)
8. **Chatbot** — asisten otomatis (server Rasa) untuk tanya jawab
9. **Notifikasi** — lonceng di navbar + push (FCM): pesanan baru, status update, pesan chat
10. **Feedback** — formulir saran di halaman beranda

---

## 2 cara pembayaran 💳

| Metode | Cara kerja |
|---|---|
| **Bayar di Tempat** | Pesan → penjual proses → ambil & bayar tunai di toko → penjual konfirmasi + upload bukti |
| **Pembayaran Online** | Pesan → pilih "Bayar Sekarang" → dibuka halaman **Midtrans** (transfer/QR/VA) → lunas otomatis terdeteksi saat cek status |

---

## Status pesanan 🔄

```
Menunggu Pembayaran / Menunggu Konfirmasi
        │
        ▼
   Terkonfirmasi (CONFIRMED)
        │
        ▼
   Sedang Diproses (PROCESSING)
        │
        ▼
   Siap Diambil (READY_FOR_PICKUP)
        │
        ▼
   Selesai (COMPLETED)  ← baru bisa kasih rating
```

Pesanan bisa **dibatalkan** hanya di 2 status awal (belum diproses). Stok otomatis kembali.

---

## Teknologi 🛠️

| Bagian | Teknologi |
|---|---|
| Backend (server) | Node.js + Express 5 |
| Database | Firebase Firestore (NoSQL) |
| Login | Firebase Authentication (token via cookie) |
| Upload gambar | Firebase Storage |
| Pembayaran | Midtrans Snap |
| Chatbot | Server Rasa (webhook) |
| Frontend (tampilan) | React 18 + Vite + React Bootstrap |

---

## Cara menjalankan 🚀

```bash
# Backend (port 5000)
cd backend-ayambakarnusantara
npm install
cp .env.example .env   # isi kredensial Firebase & Midtrans
npm run dev

# Frontend (port 3000)
cd frontend-ayambakarnusantara
npm install
cp .env.example .env   # isi REACT_APP_API_BASE_URL
npm start
```

Buka `http://localhost:3000`.

---

## Struktur folder (singkat) 📁

```
ayam-bakar-nusantara/
├── backend-ayambakarnusantara/
│   └── src/
│       ├── config/        # Firebase, Midtrans, Gemini
│       ├── controllers/   # logika bisnis (12 file)
│       ├── middleware/    # cek login, cek role seller, upload
│       ├── routes/        # daftar endpoint (12 file)
│       └── index.js       # titik masuk server
└── frontend-ayambakarnusantara/
    └── src/
        ├── pages/         # halaman (menu, keranjang, pesanan, toko-saya, dll)
        ├── components/    # komponen UI (navbar, chat, modal, dll)
        ├── context/       # state login & keranjang
        └── services/      # pemanggilan API
```

---

## Bacaan lanjutan 📚

- `ARCHITECTURE.md` — bagaimana sistem bekerja (alur request, sesi, desain)
- `DATA-MODEL.md` — struktur database
- `API-REFERENCE.md` — daftar lengkap endpoint
- `BUSINESS-FLOW.md` — alur bisnis detail + aturan
- `ROADMAP.md` — masalah yang ditemukan & rencana perbaikan
