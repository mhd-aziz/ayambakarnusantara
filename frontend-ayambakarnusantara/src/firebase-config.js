// ============================================================
// firebase-config.js — DIMIGRASI ke Supabase (2026-08-04)
// ------------------------------------------------------------
// Firebase Auth/Storage/FCM sudah tidak dipakai.
// Semua auth, data, dan upload ditangani backend (Express + Supabase)
// lewat API (axios, withCredentials — cookie session).
// Notifikasi: FCM push diganti notifikasi in-app (tabel notifications,
// dibaca frontend via GET /notification).
// File ini dipertahankan hanya agar import App.js tidak berubah
// (getFCMToken kini no-op — tidak ada permission prompt lagi).
// ============================================================

/**
 * @deprecated FCM sudah tidak dipakai. Selalu mengembalikan null
 * sehingga pemanggil (App.js) melewati registrasi token.
 */
export const getFCMToken = async () => {
  return null;
};