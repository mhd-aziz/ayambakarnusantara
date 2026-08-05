# ROADMAP — Ayam Bakar Nusantara

Acuan kerja untuk agen AI atau pengembang saat akan memperbaiki atau mengembangkan project ini. Berisi kondisi sekarang, masalah yang ditemukan, prioritas, dan rencana ke depan. Perbarui dokumen ini setiap ada perubahan besar.

## Status sekarang

- Semua alur utama jalan: akun, toko, produk, keranjang, pesanan, bayar, rating, chat, notifikasi.
- Kode adalah sumber kebenaran. Dokumen dibuat dari pembacaan kode.
- Audit menyeluruh terakhir: 5 Agustus 2026 (lihat `REVIEW-2026-08-05.md`).

## Prioritas 1 - Bug yang bisa crash atau memblokir alur

| # | Masalah | Lokasi | Status |
|---|---|---|---|
| 1 | ReferenceError TDZ: `fetchedOrders` dipakai sebelum dideklarasi | `orderController.js` | Selesai (migrasi Supabase) |
| 2 | `where("uid", "in", ...)` lebih dari 10 nilai | `ratingController.js` | Selesai (chunk query) |
| 3 | Order multi-toko tidak didukung tapi tidak dicegah | `orderController.js` | Sebagian. Notifikasi sudah ke semua seller. Sisa: seller belum bisa lihat/update order multi-toko (`items.every()` di `getOrderDetailsForSeller` dan `updateOrderStatusBySeller`) dan `getSellerOrders` fetch semua lalu filter di JS. Keputusan desain: blokir di checkout atau sub-order |
| 4 | Hapus toko meninggalkan gambar produk di storage | `shopController.js` | Selesai |
| 5 | Tidak ada webhook Midtrans | `paymentController.js` | Selesai. Webhook `POST /payment/notification` aktif: verifikasi signature sha512, idempoten, sinkron status, notif customer |

## Prioritas 2 - Keamanan

| # | Masalah | Lokasi | Status |
|---|---|---|---|
| 6 | Stored XSS di chat | `GlobalChat.js`, `ChatbotPane.js` | Selesai. Pesan dirender teks polos, tanpa `dangerouslySetInnerHTML` |
| 7 | Feedback publik tanpa proteksi | `feedbackRoutes.js` | Selesai. Rate limit in-memory 5/10 menit per IP (429) |
| 8 | Cookie 24 jam vs token 1 jam | `authMiddleware.js` | Teratasi. Auto-refresh via cookie `authRefreshToken` (7 hari) |
| 9 | Harga/stok tanpa batas atas | `productController.js` (create + update) | Belum. Tambah batas atas harga dan stok |
| 10 | Upload cek MIME saja, tanpa magic bytes | `multerConfig.js` | Belum. Tambah validasi signature file |
| 11 | Path traversal di `extractPathFromPublicUrl` | `storageHelper.js` | Belum. Tolak path berisi `..` |
| 12 | Secret key Midtrans dan API key chatbot ter-log | `midtransConfig.js`, `chatbotController.js` | Belum. Jangan log credential |
| 13 | Rating: konsistensi productId dan orderId tidak dicek | `ratingController.js` + `rating-functions.sql` | Belum. Pastikan order milik user dan memuat produk yang di-rate |
| 14 | Chat tanpa validasi teks/lokasi | `chatController.js` | Belum. Batas panjang teks, range lat/long |

## Prioritas 3 - Kualitas dan konsistensi

| # | Masalah | Lokasi | Status |
|---|---|---|---|
| 15 | `getSellerOrders` memuat semua order lalu filter di JS | `orderController.js` | Belum. Pakai filter `shop_ids @> {shopId}` (index GIN sudah ada) |
| 16 | Tanpa refund dan audit trail pembayaran | `paymentController.js` | Belum. Tambah riwayat status pembayaran dan endpoint refund |
| 17 | `useEffect` kosong | `CartPage.js` | Belum, hapus |
| 18 | Dependency array useEffect redundan | `CartContext.js`, `AuthContext.js`, `GlobalChat.js`, `NotificationPage.js` | Belum. Bukan loop fatal, tapi rapikan |
| 19 | Param `userId` di ChatService tidak terpakai | `ChatService.js` | Belum, hapus |
| 20 | Notifikasi polling tanpa jeda saat tab tidak aktif | `NavigationBar.js` | Belum. Tambah cek visibility |
| 21 | `GlobalChat.js` (910 baris) dan `OrderDetailPage` (610 baris) terlalu besar | komponen | Belum. Pecah ke sub-komponen |

## Ide masa depan (di luar MVP)

- Lokasi otomatis dan jarak ke toko.
- Pengiriman dan ongkir (sekarang pickup only).
- Varian produk: level pedas, bagian ayam, ukuran porsi, multi-foto.
- Promo dan voucher.
- Admin platform: moderasi toko/produk, laporan, komisi.
- Aplikasi mobile (sekarang web responsif).
- Realtime chat (ganti polling dengan WebSocket).

## Log perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-04 | Analisis kode menyeluruh; semua dokumen dibuat |
| 2026-08-05 | Migrasi frontend ke Vite + Tailwind lalu dikembalikan ke source original Bootstrap di atas Vite (user memilih tampilan original). Keamanan: XSS chat, rate limit feedback, webhook. Audit menyeluruh pertama (REVIEW-2026-08-05.md). Dokumen dipindah ke `backend-ayambakarnusantara/docs/`, skema SQL ke `backend-ayambakarnusantara/supabase/`, README dibuat di root |
