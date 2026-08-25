// Pure image validation helpers (ROADMAP #10) — no external dependencies,
// safe to import in unit tests without env vars.
//
// Allowed container formats: key = mime type, value = list of magic-byte
// prefixes (first bytes of file content) that must match.
// Ref: https://en.wikipedia.org/wiki/List_of_file_signatures
const ALLOWED_IMAGE_FORMATS = [
  { mime: "image/jpeg", signatures: [[0xff, 0xd8, 0xff]] },
  {
    mime: "image/png",
    signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  {
    mime: "image/gif",
    signatures: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
  },
  {
    mime: "image/webp",
    // RIFF....WEBP
    signatures: [
      [0x52, 0x49, 0x46, 0x46, undefined, undefined, undefined, undefined, 0x57, 0x45, 0x42, 0x50],
    ],
  },
];

function matchesSignature(buffer, signature) {
  if (!buffer || buffer.length < signature.length) return false;
  return signature.every(
    (expected, i) => expected === undefined || buffer[i] === expected
  );
}

/**
 * Validate the real file content (magic bytes), not just the declared mime.
 * @param {Buffer} buffer - file content
 * @returns {boolean} true if buffer matches a known image signature
 */
function validateImageMagicBytes(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return false;
  return ALLOWED_IMAGE_FORMATS.some((fmt) =>
    fmt.signatures.some((sig) => matchesSignature(buffer, sig))
  );
}

/**
 * Validate a buffer and throw a client-facing 400 error when it is not a
 * recognized image. Used by storage helpers so every upload path enforces
 * magic-byte checks (REVIEW-2026-08-25 H2), not just chat.
 * @param {Buffer} buffer - file content
 * @throws {Error} with statusCode 400 when the buffer is not a recognized image
 */
function assertValidImageBuffer(buffer) {
  if (!validateImageMagicBytes(buffer)) {
    const error = new Error("Isi file bukan gambar yang valid (JPEG, PNG, GIF, WEBP).");
    error.statusCode = 400;
    throw error;
  }
}

module.exports = {
  ALLOWED_IMAGE_FORMATS,
  matchesSignature,
  validateImageMagicBytes,
  assertValidImageBuffer,
};
