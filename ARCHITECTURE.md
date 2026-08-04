# 🏗️ ARCHITECTURE — Ayam Bakar Nusantara

> Acuan teknis: bagaimana sistem bekerja. Baca `MVP.md` dulu jika belum.
> Dokumen ini dipakai agen AI / pengembang sebagai **peta sistem** sebelum menyentuh kode.

---

## 1. Ringkasan arsitektur

```
┌─────────────────────┐        HTTPS/JSON         ┌──────────────────────────────┐
│  Frontend (React)   │ ────────────────────────▶ │  Backend (Express 5)         │
│  Vite + Bootstrap   │ ◀──────────────────────── │  port 5000                   │
│  port 3000          │   { success, message,     │  src/index.js                │
└─────────────────────┘   data }                  └──────────────┬───────────────┘
                                                               │ (firebase-admin SDK)
                                        ┌──────────────────────┼──────────────────────┐
                                        ▼                      ▼                      ▼
                                 ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
                                 │ Firestore    │      │ Firebase Auth│      │ Firebase     │
                                 │ (database)   │      │ (login)      │      │ Storage      │
                                 └──────────────┘      └──────────────┘      │ (gambar)     │
                                                                             └──────────────┘
                                        ┌──────────────────────────────────────────────────┐
                                        │ Integrasi eksternal:                              │
                                        │  • Midtrans Snap (pembayaran online)              │
                                        │  • Rasa server (chatbot, localhost:5005)          │
                                        │  • FCM (notifikasi push)                          │
                                        └──────────────────────────────────────────────────┘
```

- **Backend** = satu-satunya pintu ke database (frontend TIDAK pernah langsung menyentuh Firestore).
- **Frontend** = React SPA yang bicara ke backend via Axios (`withCredentials: true`).
- Semua respons API memakai format: `{ success, message, data }`.

---

## 2. Teknologi & versi

### Backend (`backend-ayambakarnusantara/`)
| Paket | Fungsi |
|---|---|
| `express` ^5.1.0 | Framework HTTP |
| `firebase-admin` ^13.4.0 | Auth, Firestore, Storage (akses server) |
| `firebase` ^11.8.1 | Client SDK (dipakai backend utk REST sign-in & reset password) |
| `midtrans-client` ^1.4.2 | Pembayaran Snap |
| `multer` ^2.0.0 | Upload file (memoryStorage, gambar ≤5MB) |
| `cookie-parser` | Baca cookie `authToken` |
| `cors` | Whitelist origin (dari env `CLIENT_URL`) |
| `@google/generative-ai` | SDK Gemini — **terpasang, BELUM dipakai** |
| `axios` | HTTP client (proxy ke Rasa) |
| `dotenv` | Variabel lingkungan |

### Frontend (`frontend-ayambakarnusantara/`)
| Paket | Fungsi |
|---|---|
| `react` 18 + `react-dom` | UI |
| `vite` 6 | Build & dev server |
| `react-router-dom` 7 | Routing SPA |
| `react-bootstrap` + `react-bootstrap-icons` | Komponen UI |
| `axios` | HTTP client (base `/api`, fallback env `REACT_APP_API_BASE_URL`) |
| `bootstrap-icons` | Ikon |
| `uuid` | ID sementara (item cart, dsb.) |

---

## 3. Struktur folder backend

```
src/
├── index.js                # app Express: CORS → cookie-parser → json → routes
├── config/
│   ├── firebaseConfig.js   # inisialisasi admin (Firestore, Storage, Auth) + client SDK
│   ├── midtransConfig.js   # Snap: server key, isProduction dari env
│   └── geminiConfig.js     # model Gemini 2.5 Flash (cadangan, belum dipakai)
├── middlewares/
│   ├── authMiddleware.js   # authenticateToken (verifyIdToken + checkRevoked) & isSeller
│   └── multerConfig.js     # upload: memoryStorage, mime image/*, max 5MB
├── controllers/            # 12 controller — SEMUA logika bisnis di sini
│   ├── authController.js       # register, login, logout, forgotPassword, deleteUser
│   ├── profileController.js    # get, update, deletePhoto, addFcmToken
│   ├── shopController.js       # create, update, delete, getMyShop, list, detail, statistics
│   ├── productController.js    # CRUD produk, getAll (filter/sort/pagination), recommendations
│   ├── cartController.js       # add, get, updateQuantity, remove, clear
│   ├── orderController.js      # create, cancel, status, confirmPayment, getOrders (3 varian)
│   ├── paymentController.js    # createMidtransTransaction, retry, getStatus
│   ├── ratingController.js     # add, update, delete, getForProduct, getAll
│   ├── chatController.js       # conversations, messages, markRead
│   ├── chatbotController.js    # forwardToRasa, getHistory, clearHistory
│   ├── notificationController.js # send, get (30), markRead
│   └── feedbackController.js   # createFeedback
├── routes/                 # 12 file — pemetaan URL → controller + middleware
└── utils/
    └── responseHandler.js  # handleSuccess / handleError (format respons konsisten)
```

---

## 4. Struktur folder frontend

```
src/
├── index.js               # mount React + BrowserRouter
├── App.js                 # SEMUA route + layout (Navbar/Footer/GlobalChat)
├── firebase-config.js     # config client Firebase (untuk forgot password)
├── context/
│   ├── AuthContext.js     # user state, login/logout, interceptor 401 → auto-logout
│   └── CartContext.js     # state keranjang global + jumlah badge navbar
├── services/              # 12 file wrapper Axios (Auth, Cart, Menu, Shop, Order,
│                          #   Payment, Rating, Chat, Profile, Notification, Feedback)
├── pages/                 # halaman publik + /Seller (5 halaman)
├── components/            # Auth, Cart, Chat (GlobalChat, ChatbotPane), Layout,
│                          #   Menu (rating), Order (kartu & modal), Profile, Seller
├── utils/imageFallback.js # fallback gambar produk/avatar
├── assets/                # logo
├── css/                   # stylesheet per halaman
└── tests/                 # tes komponen (CheckoutFlow, LoginForm, RegisterForm, dll.)
```

**Route utama (App.js):**

| Route | Halaman | Akses |
|---|---|---|
| `/` | Beranda (hero, rekomendasi, testimoni, feedback) | Publik |
| `/menu` | Katalog produk (filter/sort/pagination) | Publik |
| `/menu/:productId` | Detail produk + rating + related | Publik |
| `/toko` | Daftar toko | Publik |
| `/toko/:shopId` | Detail toko + menu toko + chat penjual | Publik |
| `/keranjang` | Keranjang + checkout | Login |
| `/pesanan` | Daftar pesanan saya | Login |
| `/pesanan/:orderId` | Detail pesanan + bayar + rating | Login |
| `/profil` | Profil + edit + hapus akun | Login |
| `/notifikasi` | Notifikasi in-app | Login |
| `/toko-saya` | **Layout seller** (sidebar) | Login |
| `/toko-saya/*` | Dashboard, produk, pesanan, info toko | Seller |
| `/login` `/register` `/forgot-password` | Auth | Publik |
| `/syarat-ketentuan` `/kebijakan-privasi` | Statis | Publik |

---

## 5. Alur sesi & autentikasi 🔐

```
Login:
  1. Frontend → POST /api/auth/login (email+password)
  2. Backend  → client SDK REST sign-in ke Firebase → dapat ID token
  3. Backend  → set cookie httpOnly "authToken" (24 jam) + kirim data user
  4. Frontend → simpan user di context + localStorage

Setiap request terproteksi:
  1. Browser kirim cookie otomatis (withCredentials)
  2. authMiddleware → firebase admin verifyIdToken(cookie, {checkRevoked:true})
  3. req.user = { uid, email, role? } → controller pakai req.user.uid

Logout:
  - POST /api/auth/logout → cookie dihapus
  - Interceptor axios: respons 401/403 → auto-logout + redirect /login
```

⚠️ **Catatan penting**: ID token Firebase berlaku **1 jam**, cookie diset **24 jam**.
Setelah 1 jam request akan 401 → frontend auto-logout. Belum ada refresh-token flow.

**Role seller:** field `role` di dokumen `users/{uid}`. Middleware `isSeller` menolak jika bukan `seller`. Buka toko → role otomatis jadi `seller` + `shopId` tersimpan di user.

---

## 6. Pola penting di kode

1. **Denormalisasi Firestore** — data salinan disimpan di tempat pemakaian:
   - Cart item membawa `name, price, shopId` (supaya checkout tanpa baca produk satu-satu).
   - Order item membawa `name, price` (snapshot harga saat beli).
   - Chat conversation membawa `participantInfo` (nama/foto lawan bicara).
2. **Harga & stok SELALU dihitung ulang dari DB saat createOrder** — tidak pernah percaya nilai dari client.
3. **Batch transaksional** (`firestore.batch()`) untuk operasi multi-dokumen:
   - createOrder: kurangi stok semua produk + buat order + kosongkan cart.
   - addRating: simpan rating + update sumOfRatings/averageRating produk & toko.
4. **Signed URL** untuk gambar Storage (bukan public URL permanen) — di-generate saat baca profil/toko.
5. **Polling**, bukan websocket: chat (interval di GlobalChat), notifikasi (60 detik di Navbar), status pembayaran (tombol manual).
6. **Chat 1-ke-1**: ID percakapan = gabungan 2 UID yang diurutkan (deterministik, tanpa pencarian).

---

## 7. Integrasi eksternal

| Layanan | Cara dipakai | Gagal = |
|---|---|---|
| **Midtrans Snap** | POST `/api/payment/charge/:orderId` → dapat `redirect_url` → buka tab baru. Status disinkron via GET `/status/:orderId` (polling manual). **Tidak ada webhook** | Order tetap AWAITING_PAYMENT sampai user cek status |
| **Rasa (chatbot)** | POST `/api/chatbot/ask` → backend proxy ke `RASA_WEBHOOK_URL` (default `http://localhost:5005/webhooks/rest/webhook`) | 503 "chatbot tidak tersedia" |
| **FCM** | Token disimpan di `users/{uid}.fcmTokens[]` → kirim via `admin.messaging()` saat order/chat/status | Notifikasi hanya in-app (tersimpan di Firestore) |
| **Gemini** | SDK terpasang (`geminiConfig.js`) — **belum dihubungkan ke mana pun** | — |

---

## 8. Aturan main saat mengubah kode 🚧

1. Format respons selalu `{ success, message, data }` via `responseHandler`.
2. Controller hanya menerima `req.user.uid` sebagai identitas — jangan pernah percaya UID dari body.
3. Setiap operasi multi-tulis wajib `firestore.batch()`.
4. Gambar yang dihapus dari DB harus dihapus juga dari Storage (lihat `ROADMAP.md` item orphan file).
5. Cek `ROADMAP.md` untuk bug & batasan yang sudah diketahui sebelum menyentuh modul terkait.
