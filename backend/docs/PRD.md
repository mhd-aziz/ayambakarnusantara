# PRD — Ayam Bakar Nusantara

Marketplace kuliner Nusantara berbasis web yang menghubungkan penjual ayam bakar (dan makanan Nusantara lain) dengan pembeli di sekitarnya. Pembeli mencari menu, memesan, membayar (tunai di tempat atau online via Midtrans), dan memberi rating; penjual membuka toko gratis, mengunggah produk, dan memproses pesanan dari satu dashboard.

## 1. Ringkasan produk

- **Apa:** Aplikasi web marketplace multi-vendor khusus ayam bakar dan makanan Nusantara. Mirip GoFood atau Shopee versi sederhana, tanpa aplikasi mobile.
- **Untuk siapa:** Penjual rumahan/UMKM yang ingin menjangkau pembeli tanpa masuk aplikasi besar, dan pembeli yang ingin menemukan menu ayam bakar dari banyak toko dalam satu tempat.
- **Nilai utama:**
  - *Mudah* — buka toko cukup satu formulir, langsung bisa jualan.
  - *Terpercaya* — rating hanya dari pembeli yang pesanannya sudah selesai.
  - *Fleksibel* — bayar tunai di tempat atau online via Midtrans.
  - *Terhubung* — chat langsung ke penjual dan chatbot bantuan.
- **Model bisnis:** tanpa biaya platform. Pembayaran langsung ke penjual, tidak ada potongan aplikasi.

## 2. Tujuan dan metrik sukses

| Tujuan | Metrik sukses |
|---|---|
| Penjual mudah memulai jualan online | Jumlah toko aktif; waktu buka toko (satu formulir) |
| Pembeli menemukan dan memesan menu dengan cepat | Jumlah pesanan selesai; tingkat penyelesaian checkout |
| Transaksi tercatat lengkap dan terpercaya | Semua order punya status jelas; tidak ada stok minus; rating konsisten |
| Komunikasi pembeli–penjual berjalan | Jumlah percakapan chat aktif; balasan chatbot yang relevan |

Metrik teknis (dipantau saat evaluasi): rata-rata rating produk/toko, waktu pemrosesan order (dibuat → COMPLETED), jumlah order dibatalkan vs selesai, dan tidak ada error di endpoint utama.

## 3. Persona pengguna

### Pembeli (customer)

- Kebutuhan: lihat menu, pesan cepat, bayar fleksibel (tunai atau online), yakin dengan kualitas dari rating, tanya penjual langsung.
- Perjalanan: daftar → cari menu → keranjang → checkout → bayar → pantau status → ambil → rating.
- Bisa sekaligus menjadi penjual (satu akun, dua peran).

### Penjual / seller (UMKM)

- Kebutuhan: jualan online tanpa ribet dan tanpa biaya besar, pesanan masuk rapi, produk mudah dikelola.
- Perjalanan: buka toko → unggah produk → terima notifikasi order → proses status → konfirmasi pembayaran → lihat statistik.

## 4. Fitur dan prioritas

| Fitur | Prioritas | Deskripsi | Status di MVP |
|---|---|---|---|
| Akun (daftar, login, lupa/reset password, edit profil, hapus akun) | P0 | Auth Supabase, cookie httpOnly, auto-refresh token | Ada |
| Katalog produk + pencarian/filter/sortir | P0 | Kategori (Makanan, Minuman, Camilan), paginasi 10, rekomendasi rating ≥ 4 | Ada |
| Keranjang | P0 | Tambah/kurang/hapus, total otomatis, validasi stok | Ada |
| Checkout dua metode bayar | P0 | Bayar di tempat / online Midtrans, catatan opsional | Ada |
| Pesanan + state machine | P0 | Buat, lihat, batalkan, update status seller, konfirmasi bayar | Ada |
| Rating dan ulasan | P0 | Bintang 1–5 + komentar, sekali per order+produk, hanya setelah COMPLETED | Ada |
| Chat 1-1 | P0 | Teks, gambar (maks 5MB), lokasi; polling (bukan websocket) | Ada |
| Notifikasi | P0 | In-app: order baru, status, pembayaran, chat | Ada |
| Toko (buka/edit/hapus/statistik) | P0 | Satu akun satu toko; nama toko = displayName | Ada |
| Produk (CRUD + stok + gambar) | P0 | Upload storage Supabase, validasi MIME & 5MB | Ada |
| Chatbot customer service | P1 | Proxy OmniRoute, konteks pesanan/menu/toko, riwayat 20 pesan | Ada |
| Feedback publik | P1 | Form saran, rate limit 5/10 menit per IP | Ada |
| Halaman syarat & privasi | P1 | Syarat & Ketentuan, Kebijakan Privasi | Ada |
| Profil | P1 | Edit nama, telepon, alamat, foto | Ada |
| Pengiriman & ongkir | P2 | Di luar MVP — sekarang pickup only | Belum |
| Varian produk (level pedas, bagian ayam, ukuran) | P2 | Di luar MVP | Belum |
| Promo & voucher | P2 | Di luar MVP | Belum |
| Admin platform | P2 | Moderasi toko/produk, laporan, komisi | Belum |
| Aplikasi mobile | P2 | Sekarang web responsif | Belum |
| Realtime chat (WebSocket) | P2 | Sekarang polling | Belum |

## 5. Kebutuhan fungsional

### Auth
- Register dengan email, password, nama tampilan (telepon & alamat opsional); langsung login setelah daftar.
- Login/logout dengan cookie httpOnly; token diperbarui otomatis saat kedaluwarsa.
- Lupa password: email berisi tautan recovery → halaman `/reset-password` → set password baru (min 6 karakter, konfirmasi harus sama).
- Hapus akun menghapus semua data terkait (profil, toko, produk, gambar, chat, cart, order, rating, riwayat chatbot).

### Profil
- Lihat dan ubah displayName, telepon, alamat, foto profil (foto lama dihapus dari storage saat diganti).
- Mengubah displayName menyinkronkan nama toko (jika sudah buka toko).

### Toko
- Buka toko: satu formulir (deskripsi + banner opsional), role otomatis jadi seller, nama toko = displayName.
- Edit info toko (nama, deskripsi, alamat, banner); hapus toko menghapus produk + gambar + mengembalikan role ke customer.
- Statistik toko per periode: harian, mingguan, bulanan, semua waktu (total produk, order baru, order selesai, pendapatan).

### Produk
- Tambah/ubah/hapus produk: nama, deskripsi, harga, stok, kategori, gambar (MIME valid, maks 5MB).
- Katalog publik: cari berdasarkan nama, filter kategori, sortir, paginasi 10.
- Harga dan stok divalidasi ulang di server saat checkout; stok tidak boleh minus.

### Keranjang
- Tambah item (wajib login, stok > 0), ubah kuantitas (0 = hapus), hapus item, kosongkan keranjang.
- Total dihitung ulang di server saat dibaca, bukan disimpan.

### Pesanan
- Buat order dengan metode bayar + catatan opsional; stok dikurangi atomik; keranjang dikosongkan; notifikasi dikirim ke semua seller yang tokonya ada di order.
- Pembeli: lihat daftar/detail order, batalkan hanya di dua status awal (stok kembali), lihat bukti pembayaran.
- Seller: lihat order yang memuat produk tokonya, update status (hanya transisi valid), konfirmasi pembayaran di tempat dengan bukti foto/catatan.

### Pembayaran (Midtrans)
- Checkout online → "Bayar Sekarang" → Snap redirect → bayar (transfer, QRIS, VA).
- Status disinkron via webhook `POST /payment/notification` (verifikasi signature sha512, idempoten) dan polling manual.
- Transaksi expired/cancel → "Bayar Ulang" dengan token baru.

### Rating
- Hanya dari order COMPLETED, sekali per (user, product, order); validasi server memastikan produk ada di order.
- Update/hapus rating menghitung ulang rata-rata produk dan toko (RPC atomik).
- Rating tampil di halaman produk, beranda, dan detail toko.

### Chat
- Satu lawan satu, ID percakapan deterministik dari dua UID yang diurutkan.
- Kirim teks / gambar (maks 5MB) / lokasi; pesan dirender teks polos (anti-XSS).
- Paginasi pesan, tanda terbaca, polling berkala.

### Notifikasi
- Event: NEW_ORDER (semua seller terkait), ORDER_CANCELLED, ORDER_STATUS_UPDATE, PAYMENT_CONFIRMED, NEW_MESSAGE.
- Badge di navbar polling tiap 60 detik; halaman notifikasi menampilkan 30 terbaru.

### Chatbot
- Jawab pertanyaan seputar marketplace: produk & menu, toko, cara pemesanan, pembayaran, status pesanan, rating, chat penjual.
- Konteks dinamis per intent: data pesanan user (jika bertanya pesanan), menu unggulan (8 produk + nama toko), daftar toko (10 toko + alamat), atau pengetahuan statis di system prompt.
- Proxy ke OmniRoute; riwayat 20 pesan terakhir; respons gagal → error "chatbot tidak tersedia".

### Feedback
- Form publik (nama, email, subjek, pesan) dengan rate limit 5/10 menit per IP; tersimpan dengan status default `new`.

## 6. Kebutuhan non-fungsional

| Aspek | Kebutuhan |
|---|---|
| Keamanan | Backend satu-satunya pintu ke database (frontend tidak menyentuh Supabase langsung); RLS aktif di semua tabel; cookie httpOnly; verifikasi webhook sha512; rate limit feedback; pesan chat dirender teks polos; hanya percaya `req.user.uid` (bukan UID dari body) |
| Performa | Polling (bukan websocket) untuk chat/notifikasi; paginasi 10 untuk katalog; index `shop_ids` GIN untuk query order seller; operasi multi-tulis lewat RPC atomik Postgres |
| Ketersediaan | Chatbot boleh gagal (503) tanpa merusak alur lain; Midtrans gagal → order tetap menunggu pembayaran |
| Integritas data | Harga selalu dihitung ulang dari database; stok tidak minus; transisi status ketat; hapus data = hapus tuntas (termasuk file storage) |
| UX | Bahasa Indonesia; responsif di HP dan desktop; fallback gambar offline; state loading pada semua operasi async |
| Kepatuhan | Halaman Syarat & Ketentuan dan Kebijakan Privasi tersedia |

## 7. Aturan bisnis penting

- **State machine pesanan** (backend menolak transisi lain):

```
AWAITING_PAYMENT (online) -> PAYMENT_FAILED
       | lunas (webhook / cek status) -> PROCESSING
PENDING_CONFIRMATION (bayar di tempat) -> CANCELLED (pembeli)
       | seller: CONFIRMED -> PROCESSING -> READY_FOR_PICKUP -> COMPLETED
COMPLETED & CANCELLED = status final
```

- Cancel hanya oleh pembeli, hanya di dua status awal; stok otomatis kembali.
- Rating hanya setelah COMPLETED, sekali per (order, produk); validasi server memastikan konsistensi.
- Satu akun maksimal satu toko; nama toko selalu = displayName profil.
- Tanpa biaya platform; pembayaran langsung ke penjual.
- Pickup only — tidak ada pengiriman.
- Seller hanya memproses order yang memuat produk tokonya.

## 8. Batasan MVP dan keputusan terbuka

- **Order multi-toko belum tuntas** (ROADMAP #3): keranjang bisa berisi produk dari toko berbeda dan notifikasi sudah ke semua seller, tapi seller belum bisa mengakses/mengupdate order multi-toko. Keputusan desain masih terbuka: blokir di checkout vs sub-order per toko.
- Tidak ada mekanisme refund pembayaran online.
- Tidak ada admin platform untuk moderasi.
- Tidak ada pengiriman; hanya ambil di tempat.

## 9. Dependensi dan integrasi

| Layanan | Fungsi |
|---|---|
| Supabase | Auth (JWT, cookie), PostgreSQL + RLS, Storage (gambar produk/profil/banner/bukti), fungsi RPC atomik (order, rating) |
| Midtrans | Snap payment (transfer, QRIS, VA) + webhook notifikasi (verifikasi sha512) |
| OmniRoute | Chatbot LLM, lewat env `OMNIROUTE_API_URL`, `OMNIROUTE_API_KEY`, `OMNIROUTE_MODEL` |

## 10. Skenario pengujian utama

1. **Registrasi → buka toko → tambah produk:** user baru daftar, buka toko (role jadi seller), unggah produk dengan gambar, produk muncul di katalog publik.
2. **Pembeli pesan bayar di tempat:** pembeli tambah ke keranjang → checkout PAY_AT_STORE → order PENDING_CONFIRMATION → seller CONFIRMED → PROCESSING → READY_FOR_PICKUP → COMPLETED (dengan konfirmasi bayar + bukti).
3. **Pembeli pesan online:** checkout ONLINE_PAYMENT → AWAITING_PAYMENT → "Bayar Sekarang" → simulasi settlement (webhook) → status jadi PROCESSING.
4. **Pembeli batalkan pesanan:** order di dua status awal dibatalkan → stok kembali; cancel setelah CONFIRMED ditolak.
5. **Rating:** setelah COMPLETED, beri rating 1–5 + ulasan; rating dobel untuk order+produk yang sama ditolak; rata-rata produk/toko ter-update.
6. **Chat:** buka percakapan dengan penjual, kirim teks, gambar, dan lokasi; unread count reset setelah dibaca.
7. **Reset password:** lupa password → email berisi tautan → halaman `/reset-password` → set password baru → login dengan password baru; tautan invalid menampilkan "Minta Tautan Baru".
8. **Chatbot:** tanya "cara pesan", "menu apa saja", "di mana toko saya bisa ambil pesanan", dan "status pesanan saya" — jawaban memakai konteks nyata (menu/toko/order user).
