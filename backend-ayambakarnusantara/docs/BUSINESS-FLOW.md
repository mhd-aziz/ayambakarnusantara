# BUSINESS FLOW — Ayam Bakar Nusantara

Aturan bisnis detail: state machine, alur penting, dan skenario yang harus tetap benar. Dokumen ini menjawab pertanyaan "kenapa sistem berperilaku begini?" Baca sebelum mengubah logika.

## 1. Siklus hidup pengguna

```
Register (customer)
   |
   +-- Belanja, rating, chat (tetap customer)
   |
   +-- Buka Toko (POST /shop)
   |      role jadi seller, shopId dibuat, nama toko = displayName
   |      v
   |   Seller: kelola produk, proses pesanan, konfirmasi bayar
   |      v
   +-- Hapus Toko (DELETE /shop/my-shop)
          produk + toko dihapus, role kembali customer
```

Aturan penting:

- Satu akun maksimal satu toko.
- Nama toko selalu sama dengan `displayName` profil. Mengubah salah satu menyinkronkan yang lain.
- Hapus akun = hapus semuanya (toko, produk, gambar, chat). Tidak bisa dipulihkan.

## 2. Alur belanja

```
Lihat menu (/menu)
   filter kategori, cari nama, urutkan, paginasi 10
   v
Detail produk (/menu/:productId)
   kuantitas (maks = stok), produk terkait, rating, info toko
   v
Tambah keranjang
   harus login, stok > 0
   backend validasi stok lagi + salin name/price/shopId ke cart
   v
Keranjang (/keranjang)
   ubah kuantitas (0 = hapus), hapus, kosongkan
   v
Checkout -> pilih metode bayar -> catatan opsional -> Buat Pesanan
```

## 3. State machine pesanan

```
AWAITING_PAYMENT (online, menunggu bayar) -> PAYMENT_FAILED (deny/expire/cancel)
       | bayar lunas (webhook / cek status)
       v
PENDING_CONFIRMATION (bayar di tempat) -> CANCELLED (pembeli, stok kembali)
       | seller: CONFIRMED
       v
CONFIRMED -> CANCELLED (pembeli, stok kembali)
       | seller: PROCESSING
       v
PROCESSING
       | seller: READY_FOR_PICKUP
       v
READY_FOR_PICKUP
       | seller: COMPLETED
       v
COMPLETED (final, baru bisa rating)
```

Transisi yang diizinkan untuk seller (backend menolak selain ini):

| Dari | Ke |
|---|---|
| PENDING_CONFIRMATION | CONFIRMED |
| CONFIRMED | PROCESSING |
| PROCESSING | READY_FOR_PICKUP |
| READY_FOR_PICKUP | COMPLETED |

Aturan:

- Cancel hanya oleh pembeli, hanya di dua status awal. Stok otomatis kembali.
- COMPLETED dan CANCELLED adalah status final.
- Order online langsung `AWAITING_PAYMENT`. Begitu Midtrans settlement (lewat webhook atau cek status), status jadi `PROCESSING` (melewati CONFIRMED).
- Bayar di tempat: penjual menandai lunas lewat `confirm-payment` (wajib bukti foto atau catatan). Status tetap lanjut sesuai alur, `paymentDetails.status = paid`.

## 4. Alur pembayaran online (Midtrans)

1. Checkout `ONLINE_PAYMENT` -> order `AWAITING_PAYMENT`.
2. Halaman pesanan -> "Bayar Sekarang" -> `POST /payment/charge/:orderId`.
3. Backend membuat transaksi Snap (atau pakai token lama yang masih berlaku) -> `redirect_url`.
4. Frontend buka tab baru -> user bayar di halaman Midtrans.
5. Status disinkron dua jalur:
   - Webhook `POST /payment/notification` dari Midtrans (verifikasi signature sha512, idempoten). Settlement -> `PROCESSING` + notifikasi customer.
   - Manual: "Cek Status Pembayaran" -> `GET /payment/status/:orderId`.
6. Kalau transaksi expire/cancel -> "Bayar Ulang" (`retry`) -> token baru.

## 5. Alur rating

```
Order COMPLETED -> halaman detail pesanan -> "Beri Rating" per produk
   v
Modal: bintang 1-5 (wajib) + ulasan (opsional)
   v
Backend validasi:
   orderStatus = COMPLETED
   belum ada rating untuk (userId + productId + orderId)
   v
Simpan rating + update rata-rata produk dan toko (transaksi atomik RPC)
   v
Rating tampil di halaman produk, beranda, dan bisa diedit/dihapus
```

## 6. Alur chat pembeli - penjual

```
Halaman toko -> "Chat Penjual" (tidak bisa chat diri sendiri)
   v
POST /chat/conversations { recipientUID }
   conversationId = dua UID diurutkan lalu digabung (deterministik)
   v
Kirim pesan: teks / gambar (maks 5MB) / lokasi
   v
Backend simpan pesan + update lastMessage + unreadCounts + notifikasi
   v
Frontend polling tiap beberapa detik (bukan websocket)
   v
Baca pesan -> PATCH /read -> unread reset
```

Pesan dirender sebagai teks polos di frontend (tanpa innerHTML). Ini sengaja, supaya HTML yang diketik user tidak bisa jalan di browser lawan bicara.

## 7. Alur notifikasi

| Event | Penerima | Type |
|---|---|---|
| Order baru dibuat | Semua seller yang tokonya ada di order | NEW_ORDER |
| Pembeli batalkan order | Seller | ORDER_CANCELLED |
| Seller update status | Pembeli | ORDER_STATUS_UPDATE |
| Pembayaran online lunas | Pembeli | PAYMENT_CONFIRMED |
| Pesan chat baru | Lawan bicara | NEW_MESSAGE |

- Tersimpan di tabel `notifications` (in-app).
- Badge di navbar polling tiap 60 detik.

## 8. Alur lupa / reset password

```
ForgotPasswordForm (/forgot-password) -> email
   v
POST /auth/forgot-password { email }
   v
Supabase kirim email berisi tautan:
   frontend /reset-password#access_token=...&refresh_token=...&type=recovery
   v
ResetPasswordPage (/reset-password) baca token dari hash URL
   v
User isi password baru + konfirmasi (min 6 karakter, harus sama)
   v
POST /auth/reset-password { accessToken, refreshToken, newPassword }
   v
Backend bangun sesi dari token recovery, update password di Supabase,
hapus cookie sesi -> sukses -> redirect /login
```

- Tautan yang kedaluwarsa/tidak valid => halaman menampilkan "Minta Tautan Baru".
- Password baru minimal 6 karakter; backend memvalidasi di server (bukan hanya di client).

## 9. Alur chatbot

```
Pane chatbot (tab di GlobalChat)
   v
POST /chatbot/ask { message }
   v
Backend pilih konteks sesuai intent user:
   - soal pesanan            -> DATA PESANAN USER (ambil order milik user, terbaru / by ID)
   - soal produk / menu      -> DATA MENU UNGGULAN (8 produk terbaru + nama toko)
   - soal toko / penjual     -> DATA TOKO TERSEDIA (10 toko terbaru + alamat)
   - lainnya                 -> pengetahuan statis di SYSTEM_PROMPT (aturan marketplace)
   v
Backend proxy ke OmniRoute (env OMNIROUTE_API_URL / OMNIROUTE_API_KEY / OMNIROUTE_MODEL)
   + simpan riwayat
   v
Riwayat dimuat saat buka pane (20 terakhir)
```

Chatbot tidak selalu tersedia. Kalau server chatbot mati, muncul error "chatbot tidak tersedia".

## 10. Skenario yang harus tetap benar

1. Stok tidak boleh minus. Buat order memvalidasi dan mengurangi stok atomik; cancel mengembalikan.
2. Harga tidak bisa dimanipulasi client (berasal dari harga DB saat item dimasukkan ke keranjang). Stok selalu divalidasi dan dikurangi dari database saat membuat order.
3. Rating tidak bisa spam. Satu order dikali satu produk = satu rating, hanya setelah COMPLETED.
4. Seller hanya memproses pesanan yang memuat produk tokonya.
5. Hapus = tuntas. Hapus produk ikut menghapus gambar; hapus akun menghapus semuanya.
6. Transisi status tidak bisa melompat. Backend menolak transisi yang tidak valid.

## 11. Batasan yang diketahui

- Order multi-toko belum tuntas (lihat ROADMAP #3). Keranjang bisa berisi produk dari toko berbeda, notifikasi sudah ke semua seller, tapi seller belum bisa mengakses/mengupdate order multi-toko. Keputusan desain (blokir di checkout vs sub-order) masih terbuka.
- Tidak ada pengiriman. Hanya ambil di tempat.
- Satu toko = satu user. Belum ada admin platform.
- Belum ada mekanisme refund pembayaran online.
