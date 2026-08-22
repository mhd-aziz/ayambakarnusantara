// Pure chat-message validation helpers (ROADMAP #14).
// No external deps — safe to unit-test without env/db.

const MAX_TEXT_LENGTH = 2000;

/**
 * Validate a chat text payload.
 * @param {string|null|undefined} text
 * @returns {{ valid: boolean, message?: string }}
 */
function validateChatText(text) {
  if (text == null) return { valid: true };
  const trimmed = String(text).trim();
  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      message: `Pesan terlalu panjang (maksimal ${MAX_TEXT_LENGTH} karakter).`,
    };
  }
  return { valid: true };
}

/**
 * Validate lat/long pair.
 * @param {number|string|null|undefined} latitude
 * @param {number|string|null|undefined} longitude
 * @returns {{ valid: boolean, message?: string }}
 */
function validateCoordinates(latitude, longitude) {
  if (latitude == null && longitude == null) return { valid: true };
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  if (
    isNaN(lat) ||
    isNaN(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return {
      valid: false,
      message: "Latitude/longitude di luar rentang valid (-90..90, -180..180).",
    };
  }
  return { valid: true };
}

/**
 * Ensure a message has at least one content type (text / image / location).
 * @returns {{ valid: boolean, message?: string }}
 */
function validateMessageContent({ hasText, hasImage, hasLocation }) {
  if (!hasText && !hasImage && !hasLocation) {
    return { valid: false, message: "Konten pesan tidak boleh kosong." };
  }
  return { valid: true };
}

module.exports = {
  MAX_TEXT_LENGTH,
  validateChatText,
  validateCoordinates,
  validateMessageContent,
};
