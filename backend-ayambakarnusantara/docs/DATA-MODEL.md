# DATA MODEL — Ayam Bakar Nusantara

Skema database Supabase (PostgreSQL). Sumber kebenaran adalah kode, tepatnya file `supabase/schema.sql` dan fungsi RPC di `supabase/`. Dokumen ini ringkasan dari file tersebut.

## Tabel dan field

### `profiles` (satu baris per user)

| Field | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | = auth.users.id, cascade saat hapus akun |
| email | text | |
| display_name | text | Nama tampilan. Nama toko mengikuti ini |
| role | text | `customer` (default) atau `seller` (check constraint) |
| phone_number | text? | |
| address | text? | |
| photo_url | text? | Foto profil |
| shop_id | uuid? | Terisi setelah buka toko |
| fcm_tokens | jsonb | Cadangan token push, default `[]` |

### `shops`

| Field | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Pemilik, cascade |
| shop_name | text | Sinkron dengan `display_name` profil |
| description | text? | |
| shop_address | text? | |
| banner_image_url | text? | |
| sum_of_ratings, average_rating, total_ratings | numeric | Statistik rating toko |

### `products`

| Field | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| shop_id | uuid | Toko pemilik, cascade |
| owner_uid | uuid? | Denormalisasi pemilik (pola lama) |
| name, description | text | |
| price | numeric(12,2) | Rupiah, check `>= 0` |
| stock | numeric | Check `>= 0` |
| category | text | `Makanan`, `Minuman`, `Camilan` |
| product_image_url | text? | |
| sum_of_ratings, average_rating, total_ratings | numeric | Statistik rating produk |

### `carts` (satu baris per user)

| Field | Tipe | Keterangan |
|---|---|---|
| user_id | uuid (PK) | Cascade |
| items | jsonb | `[{productId, shopId, name, price, quantity, subtotal}]` |
| updated_at | timestamptz | |

Total keranjang dihitung ulang saat dibaca, bukan disimpan.

### `orders`

| Field | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Pembeli, cascade |
| items | jsonb | Snapshot produk: `[{productId, shopId, name, price, quantity}]` |
| total_price | numeric(12,2) | Dihitung server dari DB, bukan client |
| payment_method | text | `ONLINE_PAYMENT` atau `PAY_AT_STORE` (check) |
| order_status | text | State machine, check constraint di SQL |
| payment_details | jsonb | `{snapToken?, redirectUrl?, status?, paidAt?}` |
| notes | text? | Catatan pembeli |
| shop_ids | uuid[] | Semua toko yang terlibat (dipakai notifikasi multi-seller + index GIN) |

### `ratings`

| Field | Tipe | Keterangan |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Pemberi rating |
| product_id | uuid | Produk yang dinilai |
| shop_id | uuid? | Toko produk |
| order_id | uuid | Order asal. Kunci anti-rating dobel |
| rating_value | integer | 1-5 |
| review_text | text? | |
| user_display_name, user_photo_url | text? | Denormalisasi profil pemberi rating |

Unik: satu `(user_id, product_id, order_id)` hanya boleh satu rating.

### `conversations` dan `messages`

| Field | Tipe | Keterangan |
|---|---|---|
| conversations.id | text (PK) | Dua UID diurutkan lalu digabung |
| participant_uids | uuid[] | Dua partisipan |
| participant_info | jsonb | `[{uid, displayName, photoURL, role}]` |
| last_message | jsonb | `{text, senderUID, timestamp, type}` |
| unread_counts | jsonb | `{uid: jumlah_belum_dibaca}` |
| messages.conversation_id | uuid | Induk percakapan, cascade |
| messages.sender_uid | uuid | |
| messages.type | text | `text`, `image`, `location` |
| messages.text, image_url, location | | Isi pesan |

### `notifications`, `chatbot_histories`, `feedback`

| Tabel | Field penting |
|---|---|
| notifications | `user_id` (penerima), `title`, `body`, `data` (type: NEW_ORDER, ORDER_STATUS_UPDATE, dst.), `is_read` |
| chatbot_histories | `user_id`, `chats` jsonb `[{role, text, createdAt}]` |
| feedback | `name`, `email`, `subject`, `message`, `status` |

## Relasi

```
profiles 1:N shops (user_id)
shops 1:N products (shop_id)
profiles 1:1 carts (user_id)
profiles 1:N orders (user_id)
profiles 1:N ratings (user_id)
products 1:N ratings (product_id)
orders 1:N ratings (order_id)
profiles N:N profiles lewat conversations (participant_uids)
conversations 1:N messages
profiles 1:N notifications
```

## Keamanan

- RLS aktif di semua tabel. User hanya bisa mengakses data miliknya.
- Akses seller ke order diatur lewat `shop_ids` (query `@>`).
- Transaksi yang butuh atomik (buat order + kurangi stok + kosongkan cart, rating + update rata-rata) dipindah ke fungsi RPC di `supabase/order-functions.sql` dan `supabase/rating-functions.sql`. Backend memanggilnya lewat `supabaseAdmin.rpc(...)`, bukan insert manual.

## Catatan

1. Denormalisasi disengaja. Harga di cart dan order adalah salinan; kalau penjual ubah harga, transaksi lama tidak ikut berubah.
2. Tidak ada tabel transaksi Midtrans terpisah. Semua ada di `orders.payment_details`.
3. Tidak ada tabel log stok. Stok langsung dikurangi di produk.
4. Hapus akun seller = hapus user, toko, produk, gambar, order, rating, chat, cart, riwayat chatbot (cascade + cleanup manual di `authController.deleteUser`).
