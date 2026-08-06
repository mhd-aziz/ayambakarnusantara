# API REFERENCE — Ayam Bakar Nusantara

Daftar lengkap endpoint backend. Base URL dev: `http://localhost:5000`.

Semua respons memakai format `{ success: boolean, message: string, data: any }`. Error memakai HTTP 4xx/5xx dengan `{ success: false, message }`.

Autentikasi lewat cookie `authToken` (httpOnly) yang dikirim otomatis browser dengan `withCredentials`.

Legend: publik = tanpa login, login = perlu akun, seller = perlu role seller.

## Auth dan akun

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/auth/register` | publik | `{ email, password, displayName, phoneNumber?, address? }`, set cookie |
| POST | `/auth/login` | publik | `{ email, password }`, set cookie |
| POST | `/auth/logout` | login | Hapus cookie |
| POST | `/auth/forgot-password` | publik | `{ email }`, kirim email reset |
| POST | `/auth/reset-password` | publik | `{ accessToken, refreshToken, newPassword }`, setel ulang password (token recovery dari email) |
| DELETE | `/auth/account/delete` | login | Hapus akun dan semua data terkait |

## Profil

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/profile` | login | Data profil |
| PUT | `/profile/update` | login | multipart: `displayName, phoneNumber, address, profileImage?` |
| DELETE | `/profile/photo` | login | Hapus foto profil + file storage |
| POST | `/profile/fcm-token` | login | `{ token }`, tambah token FCM |

## Toko (seller)

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/shop` | login | multipart: `description, bannerImage?`, role jadi seller, nama toko = displayName |
| GET | `/shop/my-shop` | seller | Data toko sendiri |
| GET | `/shop/my-shop/statistics?period=daily\|weekly\|monthly\|all_time` | seller | `totalProducts, newOrders, completedOrders, revenue` |
| PUT | `/shop/my-shop` | seller | multipart: `shopName?, description?, shopAddress?, bannerImage?` |
| DELETE | `/shop/my-shop` | seller | Hapus toko + produk + gambar |
| GET | `/shop?page=&limit=&search=` | publik | Daftar toko (paginasi) |
| GET | `/shop/:shopId/detail` | publik | `{ shop, owner, products }` |

## Produk

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/product` | seller | multipart: `name, description, price, stock, category, productImage` |
| GET | `/product/my-products` | seller | Produk toko sendiri |
| PUT | `/product/:productId` | seller | multipart, field sama + `removeProductImage?` |
| DELETE | `/product/:productId` | seller | Hapus produk + gambar storage |
| GET | `/product?category=&searchByName=&sortBy=&order=&page=&limit=` | publik | Katalog, default sort terbaru, limit 10 |
| GET | `/product/recommendations` | publik | Produk rating 4 ke atas |
| GET | `/product/:productId` | publik | Detail produk |

## Keranjang

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/cart/items` | login | `{ productId, quantity }`, cek stok, salin info item |
| GET | `/cart` | login | `{ items, totalPrice }` |
| PUT | `/cart/items/:productId` | login | `{ quantity }`, 0 = hapus |
| DELETE | `/cart/items/:productId` | login | Hapus item |
| DELETE | `/cart` | login | Kosongkan keranjang |

## Pesanan

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/order` | login | `{ paymentMethod, notes? }`. Validasi stok + harga dari DB, kurangi stok atomik, kosongkan cart, notif seller |
| GET | `/order` | login | Daftar order pembeli |
| GET | `/order/customer/:orderId` | login | Detail order pembeli + info toko |
| PATCH | `/order/:orderId/cancel` | login | Batalkan, hanya status awal, stok kembali |
| GET | `/order/seller/all` | seller | Order yang memuat produk toko sendiri |
| GET | `/order/seller/:orderId` | seller | Detail order untuk seller |
| PATCH | `/order/:orderId/seller/status` | seller | `{ newStatus }`, hanya transisi valid |
| PATCH | `/order/:orderId/seller/confirm-payment` | seller | multipart: `paymentProofs[]`, `paymentConfirmationNotes?` |
| GET | `/order/:orderId/payment-proofs` | login | Bukti bayar (signed URL) |

## Pembayaran (Midtrans)

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/payment/charge/:orderId` | login | Buat/ambil transaksi Snap, `{ redirect_url }`, reuse token yang belum expire |
| POST | `/payment/retry/:orderId` | login | Token baru setelah transaksi expire/cancel |
| GET | `/payment/status/:orderId` | login | Polling status Midtrans, sinkron status order |
| POST | `/payment/notification` | webhook | Notifikasi Midtrans. Verifikasi signature sha512, idempoten, sinkron status + notif customer |

## Rating

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/rating/:productId` | login | `{ orderId, ratingValue 1-5, reviewText? }`. Hanya order selesai, sekali per order+produk |
| GET | `/rating/:productId` | publik | Rating produk + info user |
| PUT | `/rating/:ratingId` | login | `{ ratingValue?, reviewText? }`, hitung ulang rata-rata |
| DELETE | `/rating/:ratingId` | login | Hapus, hitung ulang rata-rata |
| GET | `/rating?sortBy=&order=&limit=` | publik | Semua rating (dipakai beranda) |

## Chat

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/chat/conversations` | login | `{ recipientUID }`, buat/ambil percakapan |
| GET | `/chat/conversations` | login | Daftar percakapan |
| POST | `/chat/conversations/:conversationId/messages` | login | multipart `chatImage?` + `text?` atau `{ latitude, longitude }` |
| GET | `/chat/conversations/:conversationId/messages?limit=&beforeTimestamp=` | login | Pesan dengan paginasi |
| PATCH | `/chat/conversations/:conversationId/read` | login | Tandai terbaca |

## Chatbot

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/chatbot/ask` | login | `{ message }`, proxy ke OmniRoute + simpan riwayat |
| GET | `/chatbot/history` | login | 20 pesan terakhir |
| DELETE | `/chatbot/history/clear` | login | Kosongkan riwayat |

## Notifikasi dan feedback

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | `/notification` | login | 30 notifikasi terbaru |
| PATCH | `/notification/:notificationId/read` | login | Tandai terbaca |
| POST | `/feedback` | publik | `{ name, email, subject, message }`, rate limit 5/10 menit per IP |

## Kode status yang umum

| Kode | Arti |
|---|---|
| 200 | Sukses |
| 400 | Input tidak valid atau aturan bisnis dilanggar |
| 401 | Token tidak ada / kedaluwarsa |
| 403 | Bukan seller atau bukan pemilik |
| 404 | Data tidak ditemukan |
| 429 | Terlalu banyak permintaan (rate limit) |
| 500 | Error server |
