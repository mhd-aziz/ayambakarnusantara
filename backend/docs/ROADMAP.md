# ROADMAP — Ayam Bakar Nusantara

Acuan kerja untuk agen AI atau pengembang saat akan memperbaiki atau mengembangkan project ini. Berisi kondisi sekarang, masalah yang ditemukan, prioritas, dan rencana ke depan. Perbarui dokumen ini setiap ada perubahan besar.

## Status sekarang

- Semua alur utama jalan: akun, toko, produk, keranjang, pesanan, bayar, rating, chat, notifikasi.
- Kode adalah sumber kebenaran. Dokumen dibuat dari pembacaan kode.
- Audit menyeluruh terakhir: 5 Agustus 2026 (lihat `REVIEW-2026-08-05.md`).
- 11 Agustus 2026: QA audit + fix menengah — M1 (filter SQL `shop_ids` di `getSellerOrders`), M3 (RLS `profiles_select` own-only + file migrasi), M4 (ekstraksi `app.js` + suite test backend Vitest/Supertest 14/14), notifikasi pembatalan order multi-toko ke semua seller, reset DB + seed data demo real (`@example.com`), E2E 12/12 PASS + frontend 37/37 PASS.
- 7 Agustus 2026: QA menyeluruh + fix prioritas 1&2 & 4&5 (lihat `REVIEW-2026-08-07.md` dan Log perubahan).
- 6 Agustus 2026: alur reset password diaktifkan (backend + halaman frontend), chatbot diperluas + kolom query diperbaiki, kolom `status` ditambahkan ke tabel `feedback`, dan `PRD.md` dibuat. Detail di Log perubahan.

## Prioritas 1 - Bug yang bisa crash atau memblokir alur

| # | Masalah | Lokasi | Status |
|---|---|---|---|
| 1 | ReferenceError TDZ: `fetchedOrders` dipakai sebelum dideklarasi | `orderController.js` | Selesai (migrasi Supabase) |
| 2 | `where("uid", "in", ...)` lebih dari 10 nilai | `ratingController.js` | Selesai (chunk query) |
| 3 | Order multi-toko tidak didukung tapi tidak dicegah | `orderController.js` | Selesai (7 Agu 2026). Kepemilikan seller diganti dari `items.every()` (memblokir order multi-toko) menjadi `items.some()` di **4 titik**: `getOrderDetailsForSeller`, `getSellerOrders`, `updateOrderStatusBySeller`, `confirmPayAtStorePaymentBySeller`. `getOrders` difilter di SQL `shop_ids @> {shopId}` sebelum limit |
| 4 | Hapus toko meninggalkan gambar produk di storage | `shopController.js` | Selesai |
| 5 | Tidak ada webhook Midtrans | `paymentController.js` | Selesai. Webhook `POST /payment/notification` aktif: verifikasi signature sha512, idempoten, sinkron status, notif customer |
| 6 | **Race condition double-restore stok di cancel_order** | `order-functions.sql` | **Selesai (23 Agu 2026)**. Migration `20260823_cancel_order_race_fix.sql`: tambah `FOR UPDATE` saat restore stok + idempotensi (jika sudah CANCELLED, skip restore). Disamakan dengan fix T3 di `create_order` (18 Agu 2026). |

## Prioritas 2 - Keamanan

| # | Masalah | Lokasi | Status |
|---|---|---|---|
| 6 | Stored XSS di chat | `GlobalChat.js`, `ChatbotPane.js` | Selesai. Pesan dirender teks polos, tanpa `dangerouslySetInnerHTML` |
| 7 | Feedback publik tanpa proteksi | `feedbackRoutes.js` | Selesai. Rate limit in-memory 5/10 menit per IP (429) |
| 8 | Cookie 24 jam vs token 1 jam | `authMiddleware.js` | Teratasi. Auto-refresh via cookie `authRefreshToken` (7 hari) |
| 9 | Harga/stok tanpa batas atas | `productController.js` (create + update) | Selesai (7 Agu 2026). Batas atas harga (9.999.999.999,99) & stok (999.999.999) + whitelist kategori (`Makanan`/`Minuman`/`Camilan`, di-trim) di create & update — input ekstrem jadi 400 yang ramah, bukan error DB 500 |
| 10 | Upload cek MIME saja, tanpa magic bytes | `multerConfig.js` | **Selesai (25 Agu 2026)**. `validateImageMagicBytes` di `utils/imageValidation.js` (cek signature PNG/JPEG/GIF/WEBP asli) kini dipanggil via `assertValidImageBuffer` di `storageHelper.uploadImage` & `uploadPrivateImage` — menutup SEMUA titik upload (produk, banner, profil, chat, bukti bayar), bukan hanya chat. Unit test `tests/qa-audit-fix-2026-08-25.test.js` (H2). |
| 11 | Path traversal di `extractPathFromPublicUrl` | `storageHelper.js` | **Selesai (23 Agu 2026)**. Tolak path berisi `..`, `//`, skema absolut, dan path diawali `/`. Unit test di `tests/security-fixes.test.js` (4 test PASS). |
| 12 | Secret key Midtrans dan API key chatbot ter-log | `midtransConfig.js`, `chatbotController.js` | **Selesai (23 Agu 2026)**. `midtransConfig.js`: hapus semua `console.log` key (substring). `chatbotController.js`: hapus log `Authorization: *** ${OMNIROUTE_API_KEY}`, ganti `Authorization: \`Bearer ${OMNIROUTE_API_KEY}\`` tanpa log. Unit test `tests/security-fixes.test.js` (2 test PASS). |
| 13 | Rating: konsistensi productId dan orderId tidak dicek | `ratingController.js` + `rating-functions.sql` | Selesai (terverifikasi 7 Agu 2026 — sudah beres sejak migrasi Supabase). RPC `add_rating` memastikan order milik user (`v_order.user_id = p_user_id`) dan produk yang di-rate ada di dalam order tersebut; ROADMAP sebelumnya belum diperbarui |
| 14 | Chat tanpa validasi teks/lokasi | `chatController.js` | **Selesai (23 Agu 2026)**. Helper `utils/chatValidation.js`: batas 2000 char + range lat/long (-90..90, -180..180) + wajib ada konten. Diterapkan di `sendMessage`. Unit test `tests/new-fixes.test.js` (11 test PASS). |

## Prioritas 3 - Kualitas dan konsistensi

| # | Masalah | Lokasi | Status |
|---|---|---|---|
| 15 | `getSellerOrders` memuat semua order lalu filter di JS | `orderController.js` | Selesai (7 Agu 2026). Filter dipindah ke SQL `contains("shop_ids", [shopId])` (index GIN) sebelum limit 50 |
| 16 | Tanpa refund dan audit trail pembayaran | `paymentController.js`, `supabase/migrations/20260823_payment_audit_refund.sql` | **Selesai (23 Agu 2026)**. Migration: tabel `payment_status_history` + kolom `refunded_at/refund_reason/refund_amount` di `orders` + fungsi `log_payment_status_change()`. Endpoint `POST /payment/refund` (seller/admin, status COMPLETED/PAID) & `GET /payment/audit/:orderId`. RLS aktif. |
| 17 | `useEffect` kosong | `CartPage.js` | **Selesai (23 Agu 2026)**. Dihapus / diisi logika nyata. |
| 18 | Dependency array useEffect redundan | `CartContext.js`, `AuthContext.js`, `GlobalChat.js`, `NotificationPage.js` | **Selesai (23 Agu 2026)**. Dibersihkan. |
| 19 | Param `userId` di ChatService tidak terpakai | `ChatService.js` | **Selesai (23 Agu 2026)**. Dihapus. |
| 20 | Notifikasi polling tanpa jeda saat tab tidak aktif | `NavigationBar.js` | **Selesai (23 Agu 2026)**. Tambah `if (document.hidden) return;` di interval. |
| 21 | `GlobalChat.js` (910 baris) dan `OrderDetailPage` (610 baris) terlalu besar | komponen | **Selesai (23 Agu 2026)**. Dipecah ke sub-komponen (`/components/chat/*`, `/components/order/*`) tanpa ubah UX. |

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
| 2026-08-05 | Migrasi frontend ke Vite + Tailwind lalu dikembalikan ke source original Bootstrap di atas Vite (user memilih tampilan original). Keamanan: XSS chat, rate limit feedback, webhook. Audit menyeluruh pertama (REVIEW-2026-08-05.md). Dokumen dipindah ke `backend/docs/`, skema SQL ke `backend/supabase/`, README dibuat di root |
| 2026-08-06 | Fix alur reset password: backend `POST /auth/reset-password` (validasi token recovery Supabase + password min 6 karakter) dan halaman frontend `/reset-password` (`ResetPasswordPage`) yang membaca token dari hash URL. Chatbot: query daftar toko diperbaiki dari kolom `name` (tidak ada) menjadi `shop_name`, SYSTEM_PROMPT diperluas dengan pengetahuan lengkap marketplace (untuk cara pesan, metode bayar, status, rating, pickup only), konteks dinamis dipilih per intent (pesanan/menu/toko). Schema: kolom `status text not null default 'new'` ditambahkan ke tabel `feedback` (selaras dengan kode). Dokumen `PRD.md` dibuat |
| 2026-08-07 | QA menyeluruh read-only (hasil: `REVIEW-2026-08-07.md`) → fix: webhook Midtrans mapping retry (`-RETRY-` dipotong benar) + penjaga "sudah paid" (order lunas tidak bisa diturunkan status oleh notifikasi/polling telat); seller order multi-toko (`items.every()`→`some()` + filter SQL `shop_ids`); single-flight refresh token di backend + retry 1× 401 di frontend (anti logout paksa saat token kedaluwarsa paralel); param `shopId` di `GET /product` (blok produk terkait cocok); batas atas harga/stok + whitelist kategori di `productController`; hapus `reset-password.js` (script Firebase legacy bocorkan password); type notifikasi pembayaran diseragamkan ke `PAYMENT_CONFIRMED` (kode↔docs↔frontend sinkron). Rencana berikut di ROADMAP #10,#11,#12,#14,#15→17-21 (Rendah) |
| 2026-08-11 | QA audit + fix menengah: M1 filter SQL `shop_ids` di `getSellerOrders` (endpoint `/order/seller/all`); M3 RLS `profiles_select` own-only (schema + migration `supabase/migrations/20260811_rls_profiles_own_only.sql`); M4 ekstraksi `src/app.js` (Express tanpa listen) + suite test backend Vitest/Supertest (`tests/api.integration.test.js`, 14/14); notifikasi pembatalan order multi-toko dikirim ke SEMUA seller; reset data DB + storage + seed data demo real via API (`scripts/reset-db.js`, `scripts/seed-demo.js`); verifikasi E2E 12/12 PASS, frontend unit test 37/37 PASS, build sukses. |
| 2026-08-18 | Fix 2 temuan REVIEW-2026-08-17: **T3** race stok `create_order` (tambah `FOR UPDATE` saat validasi + decrement ber-guard `AND stock >= qty` dgn `NOT FOUND → RAISE`) di `supabase/order-functions.sql` — wajib diaplikasikan manual ke Supabase (SQL Editor); **T2** enumerasi `forgot-password` (pesan respons identik & netral untuk email terdaftar/tidak + jeda 400ms di jalur tak terdaftar anti timing-based enum) di `authController.js`. |
| 2026-08-23 | QA menyeluruh (REVIEW-2026-08-23.md) + fix 4 HIGH/MEDIUM: **A** race `cancel_order` (migration `20260823_cancel_order_race_fix.sql` + `FOR UPDATE`), **B** hapus log Midtrans key (`midtransConfig.js`), **C** hapus log OMNIROUTE_API_KEY (`chatbotController.js`), **D** path traversal guard (`storageHelper.js`). Test regression `tests/security-fixes.test.js` (6 test PASS). Frontend 37/37 PASS. ROADMAP #6,#11,#12 → Selesai. |
| 2026-08-23 | QA lanjutan (REVIEW-2026-08-23-part2.md) + fix sisa ROADMAP: **#10** magic-bytes validation (`utils/imageValidation.js` + `chatController`/`storageHelper`), **#14** chat validation (`utils/chatValidation.js`: 2000 char + range lat/long), **#16** refund + audit trail (`paymentController.refundPayment`/`getPaymentAudit` + migration `20260823_payment_audit_refund.sql`), **#17-21** frontend quality (useEffect kosong, dep array, param mati, visibility guard, split file besar). Test `tests/new-fixes.test.js` (18 test PASS) + `tests/security-fixes.test.js` (6) = backend 24/24. CI/CD dipecah jadi 4 workflow granular (backend-ci, frontend-ci, backend-deploy, frontend-deploy) berbahasa Inggris. |
| 2026-08-25 | Validasi ulang REVIEW-2026-08-25.md (read-only, semua temuan H/M/L/Seksi-4 terkonfirmasi) + fix HIGH/MEDIUM: **H1** logout revoke refresh token via `supabaseAdmin.auth.admin.signOut` (`authController`), **H2** magic-bytes di semua upload via `assertValidImageBuffer` di `storageHelper` (uploadImage & uploadPrivateImage), **H3** rate limiter di auth/login/register/forgot-password (`authRoutes`) & `/chatbot/ask` (`chatbotRoutes`), **M4** hapus `email` owner dari response publik detail toko (`shopController.getShopDetails`). Regression test `tests/qa-audit-fix-2026-08-25.test.js` (11 PASS). |
