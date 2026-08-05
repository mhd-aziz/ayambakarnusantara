# IDEA — Ayam Bakar Nusantara

Dokumen ini adalah acuan keputusan: kenapa project ini dibuat, untuk siapa, dan apa saja yang masuk dalam cakupan. Detail teknis ada di dokumen lain (`MVP.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `API-REFERENCE.md`, `BUSINESS-FLOW.md`, `ROADMAP.md`).

## Visi

Marketplace kuliner Nusantara yang menghubungkan penjual ayam bakar (dan makanan Nusantara lain) dengan pembeli di sekitarnya. Sederhana, tanpa biaya platform yang rumit, dan mudah dipakai siapa saja.

## Masalah yang ingin dipecahkan

1. Penjual rumahan atau UMKM sulit menjangkau pembeli tanpa masuk aplikasi besar.
2. Pembeli sulit menemukan menu ayam bakar dari banyak toko dalam satu tempat.
3. Pesanan lewat chat atau WhatsApp tidak terstruktur: tidak ada status, tidak ada bukti, mudah hilang.

## Solusi

Satu aplikasi web yang bisa dibuka dari HP maupun komputer, tempat:

- Penjual buka toko gratis, upload menu, dan mengelola pesanan.
- Pembeli mencari, memesan, membayar, dan memberi rating dalam satu alur.
- Transaksi tercatat lengkap: status pesanan, bukti pembayaran, dan riwayat chat.

## Target pengguna

| Peran | Kebutuhan |
|---|---|
| Pembeli | Lihat menu, pesan cepat, bayar fleksibel (tunai atau online), yakin dengan kualitas dari rating |
| Penjual (UMKM) | Jualan online tanpa ribet dan tanpa biaya besar, pesanan masuk rapi |

## Nilai utama

- Mudah. Buka toko cukup satu formulir, langsung bisa jualan.
- Terpercaya. Rating hanya dari pembeli yang pesanannya sudah selesai.
- Fleksibel. Bayar tunai di tempat atau online via Midtrans.
- Terhubung. Ada chat langsung ke penjual dan chatbot bantuan.

## Ruang lingkup MVP (yang sudah ada)

- Akun: daftar, masuk, lupa password, edit profil, hapus akun.
- Toko: buka, edit, hapus, lihat statistik (harian, mingguan, bulanan, semua).
- Produk: tambah, ubah, hapus, gambar, stok, kategori, cari, filter, urutkan.
- Keranjang dan checkout dengan dua metode bayar.
- Pesanan: buat, lihat, batalkan, update status oleh penjual, konfirmasi bayar di tempat.
- Pembayaran online Midtrans (Snap, bayar ulang, cek status, webhook otomatis).
- Rating dan ulasan (sekali per order dan produk, hanya setelah pesanan selesai).
- Chat satu lawan satu (teks, gambar, lokasi) dan chatbot.
- Notifikasi in-app, feedback publik, halaman syarat dan privasi.

## Di luar MVP (ide masa depan)

- Deteksi lokasi otomatis dan jarak ke toko.
- Pengiriman dan ongkir (sekarang hanya ambil di tempat).
- Foto produk banyak, varian (level pedas, bagian ayam, ukuran).
- Promo dan voucher.
- Admin platform untuk moderasi toko dan produk.
- Aplikasi mobile (sekarang web responsif).

## Prinsip desain

1. Sederhana. Satu alur yang jelas, tanpa fitur membingungkan.
2. Tanpa biaya platform. Pembayaran langsung ke penjual, tidak ada potongan aplikasi.
3. Data aman dan konsisten. Stok dikurangi hanya saat order valid, harga selalu dihitung ulang dari database.
4. Satu sumber kebenaran. Keputusan penting dicatat di dokumen ini dan `ROADMAP.md`.
