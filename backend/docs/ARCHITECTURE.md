# ARCHITECTURE — Ayam Bakar Nusantara

Peta teknis sistem. Baca `MVP.md` dulu kalau belum. Dokumen ini dipakai agen AI atau pengembang sebagai acuan sebelum menyentuh kode.

## 1. Gambaran arsitektur

```
Frontend (React + Vite + Bootstrap)
        port 3000
          |
          |  JSON { success, message, data }
          v
Backend (Express 5) ------------> Supabase (PostgreSQL)
        port 5000                 - Auth (JWT, cookie httpOnly)
        src/index.js              - Data (tabel + RLS)
                                  - Storage (gambar)
                                  - Fungsi RPC atomik (order, rating)
          |
          +--> Midtrans Snap (pembayaran online + webhook)
          +--> OmniRoute (chatbot, via env OMNIROUTE_API_URL / OMNIROUTE_API_KEY / OMNIROUTE_MODEL)
```

Aturan dasar:

- Backend satu-satunya pintu ke database. Frontend tidak pernah menyentuh Supabase langsung.
- Semua respons API memakai format `{ success, message, data }`.
- Login memakai cookie `authToken` (httpOnly) yang dikirim otomatis browser lewat `withCredentials`.

## 2. Teknologi

Backend (`backend/`):

| Paket | Fungsi |
|---|---|
| express 5 | Framework HTTP |
| @supabase/supabase-js | Admin + anon client (auth, DB, storage) |
| midtrans-client | Pembayaran Snap |
| multer | Upload gambar (memory, maks 5MB, validasi MIME) |
| cookie-parser | Membaca cookie auth |
| cors | Whitelist origin dari env `CORS_ALLOWED_ORIGINS` |
| axios | Proxy ke chatbot |
| dotenv | Variabel lingkungan |

Frontend (`frontend/`):

| Paket | Fungsi |
|---|---|
| react 19 + react-dom | UI |
| vite + @vitejs/plugin-react | Build dan dev server |
| react-router-dom | Routing SPA |
| react-bootstrap + react-bootstrap-icons | Komponen UI |
| axios | HTTP client, base dari `import.meta.env.VITE_API_BASE_URL` |

## 3. Struktur backend

```
src/
├── index.js                  # entry server: listen (memuat app dari app.js)
├── app.js                    # app Express: CORS, cookie-parser, json, routes (dipisah agar bisa dites supertest)
├── config/
│   ├── supabaseConfig.js     # admin + anon client
│   └── midtransConfig.js     # Snap, isProduction dari env
├── middlewares/
│   ├── authMiddleware.js     # authenticateToken (JWT + auto-refresh) & isSeller
│   ├── multerConfig.js       # upload gambar (MIME, 5MB)
│   └── rateLimiter.js        # pembatas permintaan per IP (in-memory)
├── controllers/              # 12 controller, semua logika bisnis di sini
├── routes/                   # 12 file pemetaan URL ke controller
├── utils/
│   ├── responseHandler.js    # format respons konsisten
│   └── storageHelper.js      # upload, hapus, signed URL
└── (tests/ di level project: tests/api.integration.test.js — Vitest + Supertest)
```

## 4. Struktur frontend

```
src/
├── index.js                  # mount React + BrowserRouter
├── App.js                    # semua route + layout (Navbar, Footer, GlobalChat)
├── firebase-config.js        # no-op (FCM sudah tidak dipakai)
├── context/
│   ├── AuthContext.js        # state user, login/logout, interceptor 401
│   └── CartContext.js        # state keranjang global
├── services/                 # 13 wrapper Axios (Auth, Cart, Menu, Shop, dll.)
├── pages/                    # halaman publik + /Seller
├── components/               # Auth, Chat, Layout, Menu, Order, Profile, Seller
├── css/                      # stylesheet per halaman
├── utils/                    # imageFallback, ScrollToAnchor
└── tests/                    # tes komponen (Vitest)
```

Route utama:

| Route | Halaman | Akses |
|---|---|---|
| `/` | Beranda | Publik |
| `/menu` | Katalog produk | Publik |
| `/menu/:productId` | Detail produk + rating | Publik |
| `/toko` | Daftar toko | Publik |
| `/toko/:shopId` | Detail toko + chat penjual | Publik |
| `/keranjang` | Keranjang + checkout | Login |
| `/pesanan` | Daftar pesanan | Login |
| `/pesanan/:orderId` | Detail pesanan + bayar + rating | Login |
| `/profil` | Profil | Login |
| `/notifikasi` | Notifikasi | Login |
| `/toko-saya/*` | Dashboard seller | Seller |
| `/login`, `/register`, `/forgot-password` | Auth | Publik |
| `/reset-password` | Atur ulang password (token dari URL hash) | Publik |

## 5. Sesi dan autentikasi

```
Login:
  1. Frontend -> POST /auth/login (email + password)
  2. Backend -> signInWithPassword ke Supabase, dapat sesi
  3. Backend -> set cookie httpOnly authToken (24 jam) + authRefreshToken (7 hari)
  4. Frontend -> simpan user di context

Setiap request terproteksi:
  1. Browser kirim cookie otomatis (withCredentials)
  2. authMiddleware -> getUser(token); kalau JWT expired, auto-refresh
     pakai authRefreshToken, lalu cookie diperbarui
  3. req.user = { uid, email, role } -> controller pakai req.user.uid

Logout:
  - POST /auth/logout -> cookie dihapus
  - Interceptor axios: respons 401 -> auto-logout ke /login
```

Role seller disimpan di tabel `profiles.role`. Middleware `isSeller` cek role dari database (bukan cuma klaim JWT). Buka toko mengubah role jadi `seller`.

## 6. Pola penting di kode

1. Denormalisasi disengaja. Cart dan order menyimpan salinan `name`, `price`, `shopId` produk supaya checkout tidak membaca produk satu per satu dan perubahan harga tidak mengubah transaksi lama.
2. Stok selalu divalidasi dan dikurangi dari database saat membuat order. Harga memakai snapshot dari keranjang (ditetapkan dari harga DB saat item dimasukkan ke keranjang). Nilai dari client tidak dipercaya.
3. Operasi multi-tulis memakai fungsi RPC atomik di Postgres (`create_order`, `cancel_order`, `add_rating`, dan seterusnya), bukan batch manual.
4. Upload gambar lewat Supabase Storage. File yang dihapus dari database ikut dihapus dari storage.
5. Polling, bukan websocket: chat (interval di GlobalChat), notifikasi (60 detik di Navbar), status pembayaran (tombol cek manual).
6. Chat satu lawan satu: ID percakapan = dua UID yang diurutkan lalu digabung. Deterministik, tanpa pencarian.

## 7. Integrasi eksternal

| Layanan | Cara dipakai | Kalau gagal |
|---|---|---|
| Midtrans Snap | `POST /payment/charge/:orderId` -> `redirect_url` -> buka tab baru. Status disinkron lewat webhook `POST /payment/notification` (verifikasi signature sha512, idempoten) + polling manual | Order tetap menunggu pembayaran |
| OmniRoute (chatbot) | `POST /chatbot/ask` -> backend proxy ke `OMNIROUTE_API_URL` (env `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL`) | 503 "chatbot tidak tersedia" |
| Supabase | Admin + anon client; RLS melindungi tabel; fungsi RPC untuk transaksi | 500 dari handleError |

## 8. Aturan main saat mengubah kode

1. Format respons selalu `{ success, message, data }` lewat `responseHandler`.
2. Controller hanya percaya `req.user.uid` sebagai identitas. Jangan pernah percaya UID dari body.
3. Operasi multi-tulis wajib lewat fungsi RPC atomik atau transaksi.
4. Gambar yang dihapus dari database harus dihapus juga dari storage.
5. Cek `ROADMAP.md` sebelum menyentuh modul yang punya masalah tercatat.
