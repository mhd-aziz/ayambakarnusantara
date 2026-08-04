/**
 * Utility untuk fallback gambar Ayam Bakar Nusantara.
 * Menggunakan SVG data URI agar 100% offline dan tidak bergantung
 * pada layanan eksternal (via.placeholder.com, ui-avatars.com, placehold.co, dll).
 */

// ─── Fallback untuk gambar PRODUK (400x300) ──────────────────────────────────
export const FALLBACK_PRODUCT_IMAGE =
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E` +
  `%3Crect width='400' height='300' fill='%23FFF3E0'/%3E` +
  `%3Ccircle cx='200' cy='115' r='48' fill='%23FFCC80'/%3E` +
  `%3Ccircle cx='183' cy='103' r='9' fill='%23FF7043'/%3E` +
  `%3Ccircle cx='217' cy='103' r='9' fill='%23FF7043'/%3E` +
  `%3Crect x='158' y='150' width='84' height='10' rx='5' fill='%23FFCC80'/%3E` +
  `%3Ctext x='200' y='200' font-family='Arial,sans-serif' font-size='15' fill='%23E65100' text-anchor='middle' font-weight='bold'%3EAyam Bakar Nusantara%3C/text%3E` +
  `%3Ctext x='200' y='222' font-family='Arial,sans-serif' font-size='11' fill='%23BF360C' text-anchor='middle'%3EGambar tidak tersedia%3C/text%3E` +
  `%3C/svg%3E`;

// ─── Fallback untuk gambar PRODUK KECIL (100x100, untuk cart/order) ──────────
export const FALLBACK_PRODUCT_SMALL =
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E` +
  `%3Crect width='100' height='100' fill='%23FFF3E0'/%3E` +
  `%3Ccircle cx='50' cy='38' r='20' fill='%23FFCC80'/%3E` +
  `%3Ccircle cx='43' cy='33' r='4' fill='%23FF7043'/%3E` +
  `%3Ccircle cx='57' cy='33' r='4' fill='%23FF7043'/%3E` +
  `%3Crect x='35' y='55' width='30' height='5' rx='2' fill='%23FFCC80'/%3E` +
  `%3Ctext x='50' y='80' font-family='Arial,sans-serif' font-size='7' fill='%23E65100' text-anchor='middle' font-weight='bold'%3EAyam Nusantara%3C/text%3E` +
  `%3C/svg%3E`;

// ─── Fallback untuk BANNER TOKO (600x200) ────────────────────────────────────
export const FALLBACK_SHOP_IMAGE =
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='200' viewBox='0 0 600 200'%3E` +
  `%3Crect width='600' height='200' fill='%23FFF8E1'/%3E` +
  `%3Crect x='0' y='0' width='600' height='6' fill='%23E65100'/%3E` +
  `%3Crect x='0' y='194' width='600' height='6' fill='%23E65100'/%3E` +
  `%3Ccircle cx='300' cy='75' r='32' fill='%23FFCC80'/%3E` +
  `%3Ccircle cx='288' cy='68' r='7' fill='%23FF7043'/%3E` +
  `%3Ccircle cx='312' cy='68' r='7' fill='%23FF7043'/%3E` +
  `%3Ctext x='300' y='135' font-family='Arial,sans-serif' font-size='22' fill='%23E65100' text-anchor='middle' font-weight='bold'%3EAyam Bakar Nusantara%3C/text%3E` +
  `%3Ctext x='300' y='160' font-family='Arial,sans-serif' font-size='13' fill='%23BF360C' text-anchor='middle'%3EBanner toko tidak tersedia%3C/text%3E` +
  `%3C/svg%3E`;

// ─── Fallback untuk AVATAR pengguna (100x100) ─────────────────────────────────
export const FALLBACK_AVATAR_IMAGE =
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E` +
  `%3Crect width='100' height='100' fill='%23FFF3E0'/%3E` +
  `%3Ccircle cx='50' cy='38' r='22' fill='%23FFCC80'/%3E` +
  `%3Cellipse cx='50' cy='82' rx='30' ry='20' fill='%23FFCC80'/%3E` +
  `%3C/svg%3E`;

// ─── Handler functions ────────────────────────────────────────────────────────

/** Gunakan untuk gambar produk berukuran besar */
export const handleProductImageError = (e) => {
  e.target.onerror = null;
  e.target.src = FALLBACK_PRODUCT_IMAGE;
};

/** Gunakan untuk gambar produk kecil (di cart, order, dll) */
export const handleProductSmallImageError = (e) => {
  e.target.onerror = null;
  e.target.src = FALLBACK_PRODUCT_SMALL;
};

/** Gunakan untuk banner/gambar toko */
export const handleShopImageError = (e) => {
  e.target.onerror = null;
  e.target.src = FALLBACK_SHOP_IMAGE;
};

/** Gunakan untuk avatar pengguna */
export const handleAvatarError = (e) => {
  e.target.onerror = null;
  e.target.src = FALLBACK_AVATAR_IMAGE;
};
