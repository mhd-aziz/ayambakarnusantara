# 🔄 BUSINESS FLOW — Ayam Bakar Nusantara

> Alur bisnis detail: aturan, state machine, dan skenario penting.
> Dokumen ini menjawab **"kenapa sistem berperilaku begini?"** — baca sebelum mengubah logika.

---

## 1. Siklus hidup pengguna

```
Register (customer)
   │
   ├── Belanja, rating, chat  (tetap customer)
   │
   └── Buka Toko (POST /shops)
          │  role → seller, shopId dibuat, shopName = displayName
          ▼
      Seller: kelola produk → terima pesanan → proses → konfirmasi bayar → selesai
          │
          └── Hapus Toko (DELETE /shops/my-shop)
                 │  produk + toko dihapus, role → customer
                 ▼
              Kembali jadi pembeli biasa
```

**Aturan penting:**
- Satu akun = satu toko maksimal.
- Nama toko SELALU sama dengan `displayName` profil — mengubah salah satu menyinkronkan yang lain.
- Hapus akun = hapus semuanya (termasuk toko, produk, gambar, chat). Tidak ada pemulihan.

---

## 2. Alur belanja

```
Lihat menu (/menu)
   │  filter kategori · cari nama · sort (terbaru/termurah/termahal/rating) · paginasi 10
   ▼
Detail produk (/menu/:id)
   │  kuantitas (max = stok) · related products · rating & ulasan · info toko
   ▼
Tambah keranjang
   │  cek: harus login · stok > 0
   │  backend: validasi stok lagi + salin name/price/shopId ke cart
   ▼
Keranjang (/keranjang)
   │  ubah kuantitas (0 = hapus, konfirmasi) · hapus · kosongkan (konfirmasi)
   ▼
Checkout → pilih metode bayar → catatan opsional → Buat Pesanan
```

---

## 3. Alur pesanan — state machine ⚙️

```
                    ┌────────────────────────────┐
                    │       AWAITING_PAYMENT     │◀── ONLINE_PAYMENT dibuat
                    │   (Menunggu Pembayaran)    │
                    └──────────┬─────────────────┘
                               │ bayar sukses (polling status)
                    ┌──────────▼─────────────────┐
                    │       PENDING_CONFIRMATION │◀── PAY_AT_STORE dibuat
                    │   (Menunggu Konfirmasi)    │
                    └──────────┬─────────────────┘
                               │ seller: CONFIRMED
                    ┌──────────▼─────────────────┐
                    │          CONFIRMED         │
                    └──────────┬─────────────────┘
                               │ seller: PROCESSING
                    ┌──────────▼─────────────────┐
                    │         PROCESSING         │
                    └──────────┬─────────────────┘
                               │ seller: READY_FOR_PICKUP
                    ┌──────────▼─────────────────┐
                    │     READY_FOR_PICKUP       │
                    └──────────┬─────────────────┘
                               │ seller: COMPLETED
                    ┌──────────▼─────────────────┐
                    │         COMPLETED          │──▶ boleh rating
                    └────────────────────────────┘

        AWAITING_PAYMENT / PENDING_CONFIRMATION ──▶ CANCELLED (pembeli, stok kembali)
        AWAITING_PAYMENT ──▶ PAYMENT_FAILED (deny/expire/cancel dari Midtrans)
```

**Transisi yang diizinkan seller (backend menolak selain ini):**

| Dari | Ke |
|---|---|
| PENDING_CONFIRMATION | CONFIRMED |
| CONFIRMED | PROCESSING |
| PROCESSING | READY_FOR_PICKUP |
| READY_FOR_PICKUP | COMPLETED |

**Aturan:**
- Cancel hanya oleh pembeli, hanya di 2 status awal → stok otomatis dikembalikan (batch).
- COMPLETED & CANCELLED = status final.
- Online payment: order dibuat langsung `AWAITING_PAYMENT`; begitu Midtrans `capture/settlement`, status jadi `PROCESSING` (skip CONFIRMED).
- Bayar di tempat: seller yang menandai lunas via `confirm-payment` (wajib bukti foto ATAU catatan) — status tetap lanjut sesuai alur, `paymentDetails.status = paid (pay_on_pickup)`.

---

## 4. Alur pembayaran online (Midtrans) 💳

```
1. Checkout ONLINE_PAYMENT → order AWAITING_PAYMENT
2. Halaman pesanan → "Bayar Sekarang" → POST /payment/charge/:orderId
3. Backend: buat Snap transaction (atau pakai token lama yang masih valid)
   → return redirect_url
4. Frontend: window.open(redirect_url, "_blank") → user bayar di Midtrans
5. User kembali → klik "Cek Status Pembayaran" → POST /payment/status/:orderId
6. Backend polling Midtrans:
     capture/settlement → orderStatus=PROCESSING, paymentDetails.status=paid
     pending           → tetap AWAITING_PAYMENT
     deny/cancel/expire→ orderStatus=PAYMENT_FAILED
7. Jika transaksi expire/cancel → "Bayar Ulang" (retry) → token baru
```

⚠️ **Tidak ada webhook** — kalau user bayar tapi tidak klik "Cek Status", order tidak berubah status otomatis. (Rencana perbaikan di ROADMAP #5.)

---

## 5. Alur rating ⭐

```
Order COMPLETED → halaman detail pesanan → tombol "Beri Rating" per produk
   ▼
Modal: bintang 1–5 (wajib) + ulasan teks (opsional)
   ▼
Backend validasi:
   • orderStatus === COMPLETED (atau DELIVERED)
   • belum ada rating untuk (userId + productId + orderId) → 1x per order
   ▼
Simpan rating + update (transaksi):
   • produk: sumOfRatings += v, totalRatings += 1, averageRating = sum/total
   • toko:   sama
   ▼
Rating tampil di: halaman produk, beranda (testimoni), bisa diedit/dihapus
```

---

## 6. Alur chat pembeli ↔ penjual 💬

```
Pembeli di halaman toko → "Chat Penjual" (tidak bisa chat diri sendiri)
   ▼
POST /chat/conversations { recipientUID }
   ▼
Backend: conversationId = sorted(uid1, uid2).join("_")
   • deterministik → percakapan yang sama selalu ketemu, tanpa query ganda
   ▼
Kirim pesan: teks / gambar (≤5MB) / lokasi
   ▼
Backend: simpan message + update lastMessage + unreadCounts + notif FCM
   ▼
Frontend: polling tiap beberapa detik (bukan websocket)
   ▼
Baca pesan → PATCH /read → unreadCount reset
```

---

## 7. Alur notifikasi 🔔

| Event | Penerima | Type |
|---|---|---|
| Order baru dibuat | Seller (semua toko di order) | `NEW_ORDER` |
| Pembeli batalkan order | Seller | `ORDER_CANCELLED` |
| Seller update status | Pembeli | `ORDER_STATUS_UPDATE` |
| Pembayaran online lunas | Pembeli | `PAYMENT_CONFIRMED` |
| Pesan chat baru | Lawan bicara | `NEW_MESSAGE` |

- Selalu disimpan ke Firestore (in-app) **dan** dikirim via FCM (jika ada token).
- Badge unread di navbar: polling 60 detik.
- Klik notifikasi → navigasi: seller → `/toko-saya/pesanan`; pembeli → `/pesanan/:orderId`; pesan → buka chat.

---

## 8. Alur chatbot 🤖

```
Pane chatbot (tab di GlobalChat)
   ▼
POST /chatbot/ask { message }   ← frontend menambah userId sendiri
   ▼
Backend: proxy ke Rasa webhook (localhost:5005)
   ▼
Jawaban Rasa disimpan ke userChatHistories/{uid}.chats[]
   ▼
Riwayat dimuat saat buka pane (20 terakhir) + parsing gambar markdown
```

⚠️ Chatbot Rasa tidak selalu aktif → error "chatbot tidak tersedia" (503). Gemini SDK terpasang sebagai cadangan tapi belum dipakai.

---

## 9. Skenario penting yang harus tetap benar ✅

1. **Stok tidak boleh minus** — createOrder memvalidasi & mengurangi stok atomik; cancel mengembalikan.
2. **Harga tidak bisa dimanipulasi client** — total selalu dihitung ulang dari DB.
3. **Rating tidak bisa spam** — 1 order × 1 produk = 1 rating, hanya setelah COMPLETED.
4. **Seller hanya bisa memproses pesanannya sendiri** — filter `item.shopId === user.shopId`.
5. **Hapus = tuntas** — hapus produk → gambar ikut terhapus; hapus akun → semua terhapus.
6. **Transisi status tidak bisa lompat** — backend menolak transisi invalid.

---

## 10. Batasan yang diketahui (kondisi sekarang) ⚠️

- **Order multi-toko rusak** (lihat ROADMAP #3) — cart bisa berisi produk dari toko berbeda, tapi alur notifikasi/status hanya mendukung 1 toko. UI belum mencegah.
- Pesanan tidak mendukung **pengiriman** — hanya ambil di tempat (pickup).
- Satu toko = satu user; tidak ada admin platform (moderasi).
- Status pembayaran online tidak otomatis (perlu klik "Cek Status").
