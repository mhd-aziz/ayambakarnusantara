/**
 * Unit tests for new fixes (2026-08-23).
 *  - #10 magic-bytes image validation (imageValidation.js)
 *  - #14 chat validation (chatValidation.js)
 * Pure modules — no env vars or DB required, always runs in CI.
 */
const {
  validateImageMagicBytes,
  ALLOWED_IMAGE_FORMATS,
} = require("../src/utils/imageValidation");
const {
  validateChatText,
  validateCoordinates,
  validateMessageContent,
} = require("../src/utils/chatValidation");

describe("Fix #10 — magic-byte image validation", () => {
  it("accepts a real PNG by signature", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(validateImageMagicBytes(png)).toBe(true);
  });

  it("accepts a real JPEG by signature", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(validateImageMagicBytes(jpeg)).toBe(true);
  });

  it("accepts a real GIF87a by signature", () => {
    const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
    expect(validateImageMagicBytes(gif)).toBe(true);
  });

  it("accepts a real WEBP by signature", () => {
    const webp = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(validateImageMagicBytes(webp)).toBe(true);
  });

  it("rejects a fake image (HTML content)", () => {
    const html = Buffer.from("<!DOCTYPE html><html>");
    expect(validateImageMagicBytes(html)).toBe(false);
  });

  it("rejects a renamed .png with text content", () => {
    const text = Buffer.from("i am not an image".repeat(10));
    expect(validateImageMagicBytes(text)).toBe(false);
  });

  it("rejects non-buffer input", () => {
    expect(validateImageMagicBytes(null)).toBe(false);
    expect(validateImageMagicBytes("string")).toBe(false);
    expect(validateImageMagicBytes(undefined)).toBe(false);
  });

  it("defines 4 allowed formats", () => {
    expect(ALLOWED_IMAGE_FORMATS).toHaveLength(4);
  });
});

describe("Fix #14 — chat message validation", () => {
  it("accepts normal text", () => {
    expect(validateChatText("Halo, pesannya").valid).toBe(true);
  });

  it("accepts empty / null text", () => {
    expect(validateChatText(null).valid).toBe(true);
    expect(validateChatText("").valid).toBe(true);
    expect(validateChatText(undefined).valid).toBe(true);
  });

  it("rejects text longer than 2000 chars", () => {
    const long = "a".repeat(2001);
    const r = validateChatText(long);
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/2000/);
  });

  it("accepts boundary text of exactly 2000 chars", () => {
    expect(validateChatText("a".repeat(2000)).valid).toBe(true);
  });

  it("accepts valid coordinates", () => {
    expect(validateCoordinates(-6.2, 106.8).valid).toBe(true);
    expect(validateCoordinates(0, 0).valid).toBe(true);
    expect(validateCoordinates(90, 180).valid).toBe(true);
    expect(validateCoordinates(-90, -180).valid).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    const r = validateCoordinates(91, 0);
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/valid/);
  });

  it("rejects out-of-range longitude", () => {
    const r = validateCoordinates(0, 200);
    expect(r.valid).toBe(false);
  });

  it("rejects non-numeric coordinates", () => {
    expect(validateCoordinates("abc", "def").valid).toBe(false);
  });

  it("accepts when no coordinates provided", () => {
    expect(validateCoordinates(null, null).valid).toBe(true);
  });

  it("requires at least one content type", () => {
    expect(
      validateMessageContent({ hasText: false, hasImage: false, hasLocation: false }).valid
    ).toBe(false);
    expect(
      validateMessageContent({ hasText: true, hasImage: false, hasLocation: false }).valid
    ).toBe(true);
    expect(
      validateMessageContent({ hasText: false, hasImage: true, hasLocation: false }).valid
    ).toBe(true);
    expect(
      validateMessageContent({ hasText: false, hasImage: false, hasLocation: true }).valid
    ).toBe(true);
  });
});
