# 🗺️ ROADMAP — Ayam Bakar Nusantara

> **Acuan kerja untuk agen AI / pengembang** saat akan membangun, memperbaiki, atau mengembangkan project ini.
> Berisi: kondisi saat ini, masalah yang ditemukan (dari review kode), prioritas perbaikan, dan ide masa depan.
> Update dokumen ini setiap kali ada perubahan besar.

---

## Status saat ini

- ✅ **Fungsional**: seluruh alur utama (auth, toko, produk, cart, order, bayar, rating, chat, notifikasi) sudah berjalan.
- 📌 Kode = sumber kebenaran. Dokumen `ARCHITECTURE.md`, `DATA-MODEL.md`, `API-REFERENCE.md`, `BUSINESS-FLOW.md` dibuat dari pembacaan kode.
- 🔍 Review kode menyeluruh sudah dilakukan (backend 100%, frontend fungsional 100%).

---

## 🔴 Prioritas 1 — Bug yang bisa crash / blokir alur

| # | Masalah | Lokasi | Dampak | Perbaikan yang disarankan |
|---|---|---|---|---|
| 1 | ✅ **SELESAI** — ReferenceError (TDZ): `fetchedOrders` dipakai sebelum dideklarasikan | `orderController.js` `getOrders` | Dulu: seller memanggil `GET /orders/all` tanpa pesanan → error 500 | Sudah diperbaiki saat migrasi Supabase (handler + deklarasi dibenahi, teruji batch API) |
| 2 | ✅ **SELESAI** — `where("uid", "in", userIds)` bisa >10 nilai | `ratingController.js` `getRatingsForProduct` | Dulu: produk dengan >10 pemberi rating → error 500 (batas Firestore `in` = 10) | Sudah diperbaiki (chunk query, teruji batch API) |

## 🟠 Prioritas 2 — Gap alur bisnis

| # | Masalah | Lokasi | Dampak | Perbaikan yang disarankan |
|---|---|---|---|---|
| 3 | 🟡 **SEBAGIAN** — Order multi-toko tidak didukung tapi tidak dicegah | `orderController.js` `createOrder` + `updateOrderStatusBySeller` | Cart berisi produk 2+ toko → seller lain tak bisa update status → order nyangkut; statistik revenue double-count | Notifikasi kini dikirim ke SEMUA seller yang terlibat (Agu 2026). Sisa: update status seller & statistik untuk order multi-toko — keputusan desain (blokir vs sub-order) menunggu diskusi karena menyentuh alur bisnis |
| 4 | ✅ **SELESAI** — `deleteShop` meninggalkan file gambar produk di Storage | `shopController.js` `deleteShop` | Dulu: file orphan menumpuk | Sudah diperbaiki: hapus gambar produk + banner dari Storage saat hapus toko (teruji batch API) |
| 5 | ✅ **SELESAI** — Tidak ada webhook Midtrans | `paymentController.js` + `paymentRoutes.js` | Dulu: user bayar lalu tutup tab → order tetap `AWAITING_PAYMENT` | Webhook `POST /payment/notification` diimplementasikan ulang (hilang saat migrasi): verifikasi `signature_key` sha512, sinkron status (settlement→PROCESSING/paid, deny/expire/cancel→PAYMENT_FAILED), kirim notifikasi customer, idempoten — teruji end-to-end |

## 🟡 Prioritas 3 — Keamanan & kualitas

| # | Masalah | Lokasi | Dampak | Perbaikan yang disarankan |
|---|---|---|---|---|
| 6 | **Stored XSS di chat** | `chatController.sendMessage` (tanpa sanitasi) + `GlobalChat.js`/`ChatbotPane.js` (`dangerouslySetInnerHTML`) | Pengguna bisa mengirim HTML/`<img onerror>` yang jalan di browser pengguna lain | Sanitasi di backend (escape HTML) + jangan pakai `dangerouslySetInnerHTML` (render teks polos, ganti `\n` dengan komponen `<br/>`) |
| 7 | **Feedback publik tanpa proteksi** | `feedbackController.js` | Spam formulir | Rate limit sederhana (per IP/email) atau minimal validasi honeypot |
| 8 | **Cookie 24 jam vs ID token 1 jam** | `authController.login` + `authMiddleware` | User "logout" paksa tiap 1 jam (401 → interceptor logout) | Perpendek cookie ke 1 jam, atau tambah refresh-token flow (Firebase session cookie / custom refresh) |

## 🟢 Prioritas 4 — Kebersihan & kecil

| # | Masalah | Lokasi | Keterangan |
|---|---|---|---|
| 9 | `Gemini SDK` terpasang tapi tak dipakai | `config/geminiConfig.js` | Chatbot proxy ke Rasa. Pilih salah satu: pakai Gemini (ganti Rasa) atau hapus config |
| 10 | `getAllRatings` tanpa limit | `ratingController.js` | Beranda memuat SEMUA rating → lambat seiring data tumbuh; tambah limit + pagination |
| 11 | `useEffect(() => {}, ...)` kosong | `CartPage.js` baris 55 | Sisa refactor, hapus |
| 12 | `dangerouslySetInnerHTML` di chatbot (parsing markdown) | `ChatbotPane.js` | Parsing gambar Rasa rapuh; lebih baik format respons Rasa distandarkan |
| 13 | URL `localhost:5005` (Rasa) hardcoded | `chatbotController.js` | Pindah ke env `RASA_WEBHOOK_URL` (sudah ada fallback, pastikan .env diisi) |

---

## Urutan kerja yang disarankan (jika mulai membangun)

1. **Baca dokumen**: `MVP.md` → `ARCHITECTURE.md` → `DATA-MODEL.md` → `API-REFERENCE.md` → `BUSINESS-FLOW.md`.
2. **Setup env** (backend): `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_API_KEY`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `CLIENT_URL`, `RASA_WEBHOOK_URL`. (frontend): `REACT_APP_API_BASE_URL`, `REACT_APP_Maps_API_KEY` (opsional).
3. **Perbaiki Prioritas 1** (bug crash) → lalu Prioritas 2 (gap bisnis) → 3 (keamanan) → 4 (bersih-bersih).
4. **Test tiap perubahan**: jalankan backend (`npm run dev`) + frontend (`npm start`), ikuti alur di `BUSINESS-FLOW.md` §9.

---

## Ide masa depan (di luar MVP)

- 🗺️ **Lokasi & jarak**: auto-detect lokasi pembeli, hitung jarak ke toko, peta.
- 🛵 **Pengiriman**: ongkir, kurir, atau ambil sendiri (saat ini pickup-only).
- 🍗 **Varian produk**: level pedas, bagian ayam (dada/paha), ukuran porsi; multi-foto.
- 🎟️ **Promo & voucher**: diskon, minimal belanja, kode promo.
- 👑 **Admin platform**: moderasi toko/produk, laporan, pengaturan komisi.
- 📱 **Aplikasi mobile** (Flutter/React Native) — saat ini web responsif.
- 🔔 **Webhook Midtrans** (sudah masuk Prioritas 2 #5).
- 💬 **Realtime chat** (ganti polling dengan WebSocket/Firestore onSnapshot).

---

## Log perubahan

| Tanggal | Perubahan |
|---|---|
| 2026-08-04 | Analisis kode menyeluruh; dokumen `MVP`, `IDEA`, `ARCHITECTURE`, `DATA-MODEL`, `API-REFERENCE`, `BUSINESS-FLOW`, `ROADMAP` dibuat |
