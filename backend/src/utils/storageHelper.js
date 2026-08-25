// --- Magic-bytes validation (ROADMAP #10) ---
// Delegated to imageValidation.js (pure module, safe to unit-test).
const {
  validateImageMagicBytes,
  assertValidImageBuffer,
  ALLOWED_IMAGE_FORMATS,
} = require("./imageValidation");

const { supabaseAdmin, supabaseUrl } = require("../config/supabaseConfig");

/**
 * Upload buffer gambar ke Supabase Storage (bucket publik).
 * @param {string} bucket - nama bucket (product-images, shop-banners, profile-images, chat-images)
 * @param {string} filePath - path dalam bucket, mis. `product-images/${shopId}/${uuid}.png`
 * @param {Buffer} buffer - isi file
 * @param {string} contentType - mime type
 * @returns {Promise<string>} URL publik permanen
 */
async function uploadImage(bucket, filePath, buffer, contentType) {
  assertValidImageBuffer(buffer);
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw error;
  return getPublicUrl(bucket, filePath);
}

/**
 * Upload bukti pembayaran ke bucket PRIVAT "orders".
 * Menyimpan path relatif; akses via signed URL (lihat getSignedUrl).
 * @returns {Promise<string>} path relatif dalam bucket (bukan URL penuh)
 */
async function uploadPrivateImage(bucket, filePath, buffer, contentType) {
  assertValidImageBuffer(buffer);
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, buffer, { contentType, upsert: true });
  if (error) throw error;
  return filePath;
}

/** URL publik permanen untuk bucket publik */
function getPublicUrl(bucket, filePath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${filePath}`;
}

/**
 * Signed URL sementara (default 1 jam) untuk file di bucket privat.
 * @returns {Promise<string|null>} URL dengan token akses, null jika path kosong
 */
async function getSignedUrl(bucket, filePath, expiresIn = 3600) {
  if (!filePath) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn);
  if (error) {
    console.error("Error membuat signed URL:", error.message);
    return null;
  }
  return data?.signedUrl || null;
}

/**
 * Ekstrak path relatif dari URL publik Supabase.
 * Contoh: https://.../object/public/product-images/abc/x.png -> abc/x.png
 * @returns {string|null}
 */
function extractPathFromPublicUrl(url, bucket) {
  if (!url || typeof url !== "string") return null;
  // Tolak path traversal / skema absolut (ROADMAP #11).
  if (url.includes("..") || url.includes("//") || /^[a-zA-Z]+:/.test(url)) {
    return null;
  }
  const prefix = `/object/public/${bucket}/`;
  const idx = url.indexOf(prefix);
  if (idx === -1) return null;
  const path = url.slice(idx + prefix.length);
  // Guard tambahan: path relatif di dalam bucket tidak boleh mengandung
  // segmen ".." maupun diawali "/".
  if (!path || path.startsWith("/") || path.includes("..")) return null;
  return path;
}

/**
 * Konversi daftar path bukti bayar (bucket privat "orders") menjadi signed URL.
 * URL publik lama (Firebase / sudah berupa http) dibiarkan apa adanya.
 */
async function mapPaymentProofUrls(urls) {
  if (!Array.isArray(urls) || urls.length === 0) return urls;
  return Promise.all(
    urls.map(async (url) => {
      if (typeof url !== "string") return url;
      if (url.startsWith("http")) return url; // URL publik lama
      const signed = await getSignedUrl("orders", url);
      return signed || url;
    })
  );
}

/** Hapus satu file dari bucket (jika path valid) */
async function deleteFile(bucket, filePath) {
  if (!filePath) return;
  const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
  if (error) {
    console.warn(`Gagal menghapus ${bucket}/${filePath}:`, error.message);
  }
}

module.exports = {
  uploadImage,
  uploadPrivateImage,
  getPublicUrl,
  getSignedUrl,
  extractPathFromPublicUrl,
  mapPaymentProofUrls,
  deleteFile,
  validateImageMagicBytes,
  ALLOWED_IMAGE_FORMATS,
};
