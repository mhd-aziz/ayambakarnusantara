# 🗄️ DATA MODEL — Ayam Bakar Nusantara

> Skema database Firestore (NoSQL). Dibuat dari pembacaan kode backend — **sumber kebenaran adalah kode**.
> Aturan emas Firestore: dokumen tidak bisa berisi array yang query-able; data disalin (denormalisasi) ke tempat pemakaian.

---

## Koleksi & field

### 👤 `users/{uid}`
| Field | Tipe | Keterangan |
|---|---|---|
| `uid` | string | = ID dokumen (sama dengan Firebase Auth UID) |
| `email` | string | |
| `displayName` | string | Nama tampilan; **nama toko mengikuti ini** |
| `role` | string | `customer` (default) / `seller` |
| `shopId` | string? | Ada jika sudah buka toko |
| `phoneNumber` | string? | |
| `address` | string? | |
| `photoURL` | string? | Foto profil |
| `fcmTokens[]` | array string | Token FCM untuk push notif |
| `createdAt` / `updatedAt` | timestamp | |

### 🏪 `shops/{shopId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `ownerUID` | string | Pemilik (dipakai utk chat & otorisasi) |
| `shopName` | string | = `displayName` pemilik (sinkron saat update profil/toko) |
| `description` | string | |
| `shopAddress` | string? | Fallback ke alamat profil |
| `bannerImageURL` | string? | Banner toko |
| `sumOfRatings` / `averageRating` / `totalRatings` | number | Statistik rating toko |
| `createdAt` | timestamp | |

### 🍗 `products/{productId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `shopId` | string | Toko pemilik |
| `name` | string | |
| `description` | string | |
| `price` | number | Rupiah |
| `stock` | number | ≥ 0 |
| `category` | string | `Makanan` / `Minuman` / `Camilan` |
| `productImageURL` | string | |
| `sumOfRatings` / `averageRating` / `totalRatings` | number | Statistik rating produk |
| `createdAt` / `updatedAt` | timestamp | |

### 🛒 `carts/{userId}` (1 dokumen per user)
| Field | Tipe | Keterangan |
|---|---|---|
| `userId` | string | |
| `items[]` | array | Lihat di bawah |
| `updatedAt` | timestamp | |

`items[]` — tiap item:
| Field | Keterangan |
|---|---|
| `productId`, `shopId` | referensi |
| `name`, `price` | **salinan** dari produk (denormalisasi) |
| `quantity` | jumlah |
| `subtotal` | `price × quantity` (disimpan) |

> Total cart = jumlah `subtotal` (dihitung ulang saat baca).

### 📦 `orders/{orderId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `userId` | string | Pembeli |
| `items[]` | array | **snapshot** produk saat checkout: `productId, shopId, name, price, quantity` |
| `totalPrice` | number | Dihitung server dari DB, bukan dari client |
| `paymentMethod` | string | `PAY_AT_STORE` / `ONLINE_PAYMENT` |
| `orderStatus` | string | Lihat state machine di `BUSINESS-FLOW.md` |
| `paymentDetails` | object | `method`, `status`, `gatewayTransactionId`, `transactionId`, `paymentType` |
| `notes` | string? | Catatan pembeli |
| `paymentConfirmationNotes` | string? | Catatan penjual saat konfirmasi bayar |
| `paymentProofs[]` | array string? | URL bukti bayar (upload penjual) |
| `shopIds[]` | array | Semua toko dalam order |
| `createdAt` / `updatedAt` | timestamp | |

### ⭐ `ratings/{ratingId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `userId` | string | Pemberi rating |
| `productId` | string | Produk yang dinilai |
| `shopId` | string | Toko produk |
| `orderId` | string | Order asal (anti-rating dobel: 1 order × 1 produk = 1 rating) |
| `ratingValue` | number | 1–5 |
| `reviewText` | string? | Ulasan |
| `createdAt` / `updatedAt` | timestamp | |

### 💬 `conversations/{conversationId}`
> `conversationId` = 2 UID diurutkan lalu digabung (deterministik — tidak perlu pencarian).

| Field | Tipe | Keterangan |
|---|---|---|
| `participantUIDs[]` | array string | 2 UID |
| `participantInfo` | map | `{ [uid]: { displayName, photoURL } }` |
| `lastMessage` | object | `{ text, senderUID, timestamp, type }` |
| `unreadCounts` | map | `{ [uid]: number }` |
| `createdAt` / `updatedAt` | timestamp | |

### ✉️ `messages/{messageId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `conversationId` | string | Induk |
| `senderUID` | string | |
| `type` | string | `text` / `image` / `location` |
| `text` | string? | Isi pesan (mentah, **tanpa sanitasi**) |
| `imageUrl` | string? | |
| `location` | object? | `{ latitude, longitude }` |
| `timestamp` | timestamp | |

### 🔔 `notifications/{notificationId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `userId` | string | Penerima |
| `title` | string | |
| `body` | string | |
| `data` | object | `{ type: NEW_ORDER | ORDER_STATUS_UPDATE | ORDER_CANCELLED | PAYMENT_CONFIRMED | NEW_MESSAGE, orderId?, conversationId? }` |
| `isRead` | boolean | |
| `createdAt` | timestamp | |

### 🤖 `userChatHistories/{userId}` (riwayat chatbot)
| Field | Tipe | Keterangan |
|---|---|---|
| `chats[]` | array | `{ role: user|assistant, text, createdAt }` |

### 💌 `feedback/{docId}`
| Field | Tipe | Keterangan |
|---|---|---|
| `name`, `email`, `subject`, `message` | string | Dari form beranda |
| `createdAt` | timestamp | |

---

## Relasi (ringkas)

```
users ──1:N── shops (ownerUID, satu seller = satu toko)
shops ──1:N── products (shopId)
users ──1:1── carts (userId)
users ──1:N── orders (userId)
users ──1:N── ratings (userId)
products ──1:N── ratings (productId)
orders ──1:N── ratings (orderId; unik per produk)
users ──N:N── users via conversations (participantUIDs)
conversations ──1:N── messages
users ──1:N── notifications
```

---

## Catatan penting ⚠️

1. **Denormalisasi disengaja**: harga produk di cart/order adalah salinan. Kalau penjual ubah harga, cart lama tetap pakai harga lama sampai di-refetch.
2. **Firestore `in` maksimal 10 nilai** — lihat bug rating di `ROADMAP.md` item #2.
3. **Tidak ada koleksi transaksi Midtrans** terpisah — semua di dalam `orders/{id}.paymentDetails`.
4. **Tidak ada koleksi `productHistory` / log stok** — stok langsung dikurangi di produk.
5. Hapus akun seller = hapus user + shop + semua produk + gambar + orders + ratings + conversations + carts + history chatbot (lihat `authController.deleteUser`).
