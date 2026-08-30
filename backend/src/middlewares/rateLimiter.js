// Rate limiter sederhana berbasis memori (per IP).
// Dipakai untuk endpoint publik yang rawan spam (mis. form feedback).
// Tidak menambah dependency — cukup untuk skala kecil/menengah.
// Cleanup periodik mencegah Map membengkak tanpa batas.

const { handleError } = require("../utils/responseHandler");

const DEFAULT_WINDOW_MS = 10 * 60 * 1000; // 10 menit
const DEFAULT_MAX = 5;

function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = DEFAULT_MAX,
  message = "Terlalu banyak permintaan. Silakan coba lagi beberapa saat lagi.",
} = {}) {
  // Bucket per-instance (per-route) — jangan global agar /auth tidak memakan kuota /feedback
  const buckets = new Map(); // key: IP -> { start: timestamp, count: number }
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of buckets) {
      if (now - entry.start >= windowMs) {
        buckets.delete(ip);
      }
    }
  }, windowMs);
  if (cleanupTimer.unref) cleanupTimer.unref();

  return function rateLimitMiddleware(req, res, next) {
    const ip =
      req.ip ||
      req.socket?.remoteAddress ||
      (req.connection && req.connection.remoteAddress) ||
      "unknown";
    const now = Date.now();

    let entry = buckets.get(ip);
    if (!entry || now - entry.start >= windowMs) {
      buckets.set(ip, { start: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      return handleError(res, {
        statusCode: 429,
        message,
        errorCode: "RATE_LIMIT_EXCEEDED",
      });
    }
    return next();
  };
}

module.exports = { createRateLimiter };
