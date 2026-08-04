# 💡 IDEA — Ayam Bakar Nusantara

> Dokumen ini adalah **acuan keputusan**: visi, masalah, target pengguna, dan ruang lingkup MVP.
> Detail teknis ada di dokumen lain (`MVP.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `API-REFERENCE.md`, `BUSINESS-FLOW.md`, `ROADMAP.md`).

---

## Visi 🎯

Menjadi **marketplace kuliner Nusantara** yang menghubungkan penjual ayam bakar (dan makanan Nusantara lainnya) dengan pembeli di sekitar — sederhana, tanpa biaya platform yang rumit, dan mudah dipakai siapa saja.

## Masalah yang dipecahkan ❓

1. Penjual kuliner rumahan/UMKM sulit **menjangkau pembeli** tanpa aplikasi besar.
2. Pembeli sulit **menemukan menu ayam bakar** dari banyak toko dalam satu tempat.
3. Proses pesanan manual (chat/WA) **tidak terstruktur**: tidak ada status, tidak ada bukti, mudah hilang.

## Solusi ✅

Satu aplikasi web (bisa diakses HP & komputer) tempat:
- Penjual **buka toko gratis**, upload menu, kelola pesanan.
- Pembeli **cari, pesan, bayar, dan rating** dalam satu alur.
- Transaksi **tercatat** (status + bukti pembayaran + chat).

## Target pengguna 👥

| Peran | Kebutuhan |
|---|---|
| **Pembeli** | Melihat menu, pesan cepat, bayar fleksibel (tunai/online), yakin dengan kualitas (rating) |
| **Penjual (UMKM)** | Jualan online tanpa ribet, tanpa biaya besar, pesanan masuk rapi |

## Nilai utama (value proposition) 🌟

- **Mudah** — buka toko cukup 1 formulir, langsung jualan.
- **Terpercaya** — rating & ulasan asli (hanya pembeli yang order selesai).
- **Fleksibel** — bayar tunai di tempat ATAU online via Midtrans.
- **Terhubung** — chat langsung ke penjual + chatbot bantuan.

## Ruang lingkup MVP ✅ (yang SUDAH ada)

- Auth (register/login/lupa password/hapus akun) + profil + foto
- Toko: buka, edit, hapus, statistik (harian/mingguan/bulanan/selamanya)
- Produk: CRUD, gambar, stok, kategori (Makanan/Minuman/Camilan), cari, filter, sort
- Keranjang + checkout (2 metode bayar)
- Pesanan: buat, lihat, batalkan, update status oleh penjual, konfirmasi bayar di tempat + bukti
- Pembayaran online Midtrans (Snap, retry, cek status)
- Rating & ulasan (1x per order+produk, hanya setelah selesai)
- Chat 1-ke-1 (teks/gambar/lokasi) + chatbot Rasa
- Notifikasi in-app + FCM push
- Feedback publik + halaman syarat & privasi

## Di luar MVP (ide masa depan) 🚀

- Lokasi otomatis & jarak toko (maps)
- Ongkir / pengiriman (saat ini hanya ambil di tempat)
- Multi-foto produk, varian (pedas/tidak, paha/dada)
- Promo & voucher
- Admin platform (moderasi toko & produk)
- Aplikasi mobile (saat ini web responsif)
- Webhook Midtrans agar status pembayaran otomatis

## Prinsip desain 📐

1. **Sederhana** — 1 alur jelas, tanpa fitur yang membingungkan.
2. **Tanpa biaya platform** — penjual tidak dipungut biaya (bayar langsung ke penjual).
3. **Data aman & konsisten** — stok dikurangi hanya saat order valid, harga dihitung dari database.
4. **Satu sumber kebenaran** — keputusan penting dicatat di dokumen ini & `ROADMAP.md`.
