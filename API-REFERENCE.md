# 🔌 API REFERENCE — Ayam Bakar Nusantara

> Daftar lengkap endpoint backend. Base URL: `http://localhost:5000/api` (dev).
> Semua respons: `{ success: boolean, message: string, data: any }`.
> Error: HTTP 4xx/5xx + `{ success: false, message }`.
> Autentikasi: cookie `authToken` (httpOnly) — dikirim otomatis oleh browser (withCredentials).

**Legend:** 🔓 publik · 🔐 perlu login · 🏪 perlu role seller

---

## Auth & Akun

| Method | Endpoint | Akses | Body / Keterangan |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | `{ email, password, displayName, phoneNumber?, address? }` → set cookie |
| POST | `/auth/login` | 🔓 | `{ email, password }` → set cookie |
| POST | `/auth/logout` | 🔐 | Hapus cookie |
| POST | `/auth/forgot-password` | 🔓 | `{ email }` → kirim email reset (client SDK) |
| DELETE | `/auth/account/delete` | 🔐 | Hapus akun + SEMUA data terkait (toko, produk, gambar, order, rating, chat, cart, history chatbot) |

## Profil

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/profile` | 🔐 | Data profil (foto via signed URL) |
| PUT | `/profile/update` | 🔐 | multipart: `displayName, phoneNumber, address, profileImage?` |
| DELETE | `/profile/photo` | 🔐 | Hapus foto profil + file Storage |
| POST | `/profile/fcm-token` | 🔐 | `{ token }` → tambah token FCM (array unik) |

## Toko (Seller)

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/shops` | 🔐 | multipart: `description, bannerImage?` → **role jadi seller**, shopName = displayName |
| GET | `/shops/my-shop` | 🏪 | Data toko sendiri |
| GET | `/shops/my-shop/statistics?period=daily\|weekly\|monthly\|all_time` | 🏪 | `totalProducts, newOrders, completedOrders, revenue` |
| PUT | `/shops/my-shop` | 🏪 | multipart: `shopName?, description?, shopAddress?, bannerImage?, removeBannerImage?` (sinkron displayName profil) |
| DELETE | `/shops/my-shop` | 🏪 | Hapus toko + produk (⚠️ gambar produk tidak ikut terhapus — lihat ROADMAP) |
| GET | `/shops?page=&limit=&search=` | 🔓 | Daftar toko (paginasi) |
| GET | `/shops/:shopId/detail` | 🔓 | `{ shop, owner, products (max 20) }` |

## Produk

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/products` | 🏪 | multipart: `name, description, price, stock, category, productImage` |
| GET | `/products/my-products` | 🏪 | Produk toko sendiri |
| PUT | `/products/:productId` | 🏪 | multipart: field sama + `removeProductImage?` |
| DELETE | `/products/:productId` | 🏪 | Hapus produk + gambar Storage |
| GET | `/products?category=&searchByName=&sortBy=&order=&page=&limit=` | 🔓 | Katalog (default sort `createdAt desc`, limit 10) |
| GET | `/products/recommendations` | 🔓 | Produk rating ≥ 4 |
| GET | `/products/:productId` | 🔓 | Detail produk |

## Keranjang

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/cart/items` | 🔐 | `{ productId, quantity }` → cek stok, denormalisasi item |
| GET | `/cart` | 🔐 | `{ items, totalPrice }` |
| PUT | `/cart/items/:productId` | 🔐 | `{ quantity }` (0 = hapus) |
| DELETE | `/cart/items/:productId` | 🔐 | Hapus item |
| DELETE | `/cart` | 🔐 | Kosongkan cart |

## Pesanan

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/orders` | 🔐 | `{ paymentMethod: PAY_AT_STORE\|ONLINE_PAYMENT, notes? }` → validasi stok+harga dari DB, batch kurangi stok, kosongkan cart, notif seller |
| GET | `/orders` | 🔐 | Daftar order pembeli |
| GET | `/orders/customer/:orderId` | 🔐 | Detail order (pembeli) + `shopDetails` |
| PATCH | `/orders/:orderId/cancel` | 🔐 | Batal (hanya AWAITING_PAYMENT / PENDING_CONFIRMATION) → stok kembali |
| GET | `/orders/seller/all` | 🏪 | Order yang berisi produk toko sendiri (customerDetails ikut) |
| GET | `/orders/seller/:orderId` | 🏪 | Detail order untuk seller |
| PATCH | `/orders/:orderId/seller/status` | 🏪 | `{ newStatus }` — hanya transisi valid (state machine) |
| PATCH | `/orders/:orderId/seller/confirm-payment` | 🏪 | multipart: `paymentProofs[]` (max 10, ≤5MB), `paymentConfirmationNotes?` → bayar di tempat lunas |
| GET | `/orders/:orderId/payment-proofs` | 🔐 | Bukti bayar (signed URLs) |
| GET | `/orders/all?status=&limit=&offset=` | 🔐 | Gabungan daftar order (⚠️ bug TDZ — lihat ROADMAP #1) |

## Pembayaran (Midtrans)

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/payment/charge/:orderId` | 🔐 | Buat/ambil transaksi Snap → `{ redirect_url, ... }` (reuse token jika belum expire) |
| POST | `/payment/retry/:orderId` | 🔐 | Buat token baru (transaksi lama expire/cancel) |
| GET | `/payment/status/:orderId` | 🔐 | Polling Midtrans → sinkron `orderStatus` + `paymentDetails` |
| | | | `capture/settlement` → PAID + PROCESSING · `pending` → AWAITING_PAYMENT · `deny/cancel/expire` → PAYMENT_FAILED |

## Rating

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/ratings/:productId` | 🔐 | `{ orderId, ratingValue (1-5), reviewText? }` — hanya order COMPLETED, 1x per order+produk |
| GET | `/ratings/:productId` | 🔓 | Rating produk + info user |
| PUT | `/ratings/:ratingId` | 🔐 | `{ ratingValue?, reviewText? }` → update rata-rata |
| DELETE | `/ratings/:ratingId` | 🔐 | Hapus → hitung ulang rata-rata |
| GET | `/ratings?sortBy=&order=&limit=` | 🔓 | Semua rating (dipakai beranda) |

## Chat

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/chat/conversations` | 🔐 | `{ recipientUID }` → buat/ambil percakapan (ID = UID terurut) |
| GET | `/chat/conversations` | 🔐 | Daftar percakapan + participantInfo + lastMessage |
| POST | `/chat/conversations/:conversationId/messages` | 🔐 | multipart `chatImage?` + `text?` atau `{ latitude, longitude }` |
| GET | `/chat/conversations/:conversationId/messages?limit=&beforeTimestamp=` | 🔐 | Pesan (pagination timestamp) |
| PATCH | `/chat/conversations/:conversationId/read` | 🔐 | Tandai terbaca |

## Chatbot

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/chatbot/ask` | 🔐 | `{ message }` → proxy ke Rasa webhook + simpan riwayat |
| GET | `/chatbot/history` | 🔐 | 20 pesan terakhir |
| DELETE | `/chatbot/history/clear` | 🔐 | Kosongkan riwayat |

## Notifikasi & Feedback

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/notifications` | 🔐 | 30 notif terbaru |
| PATCH | `/notifications/:notificationId/read` | 🔐 | Tandai terbaca |
| POST | `/feedback` | 🔓 | `{ name, email, subject, message }` (tanpa rate limit — lihat ROADMAP) |

---

## Kode status yang sering muncul

| Kode | Arti |
|---|---|
| 200 | Sukses (format `{ success: true, ... }`) |
| 400 | Input tidak valid / aturan bisnis dilanggar (stok habis, rating dobel, status transisi invalid) |
| 401 | Token tidak ada / kedaluwarsa / revoked |
| 403 | Bukan seller / bukan pemilik |
| 404 | Data tidak ditemukan |
| 500 | Error server (lihat `ROADMAP.md` untuk yang sudah diketahui) |

> ⚠️ Catatan: GET `/orders/all` belum dipakai frontend dan memiliki bug (ROADMAP #1).
> POST `/chatbot/ask` butuh server Rasa aktif (`localhost:5005`).
