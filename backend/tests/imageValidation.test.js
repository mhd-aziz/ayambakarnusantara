/**
 * imageValidation.test.js
 * Unit tests for magic-byte image validation helpers — no DB required.
 */
import { describe, it, expect } from "vitest";
const {
  ALLOWED_IMAGE_FORMATS,
  matchesSignature,
  validateImageMagicBytes,
  assertValidImageBuffer,
} = require("../src/utils/imageValidation");

describe("imageValidation — ALLOWED_IMAGE_FORMATS", () => {
  it("defines exactly 4 allowed formats: jpeg, png, gif, webp", () => {
    const mimes = ALLOWED_IMAGE_FORMATS.map((f) => f.mime);
    expect(mimes).toEqual(["image/jpeg", "image/png", "image/gif", "image/webp"]);
  });

  it("jpeg has a single signature [ff d8 ff]", () => {
    const jpeg = ALLOWED_IMAGE_FORMATS.find((f) => f.mime === "image/jpeg");
    expect(jpeg.signatures[0]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("png has an 8-byte signature starting with 89 50 4E 47", () => {
    const png = ALLOWED_IMAGE_FORMATS.find((f) => f.mime === "image/png");
    expect(png.signatures[0][0]).toBe(0x89);
    expect(png.signatures[0].length).toBe(8);
  });

  it("gif has two signatures for GIF87a and GIF89a", () => {
    const gif = ALLOWED_IMAGE_FORMATS.find((f) => f.mime === "image/gif");
    expect(gif.signatures).toHaveLength(2);
    expect(String.fromCharCode(...gif.signatures[0].slice(0, 3))).toBe("GIF");
  });

  it("webp has a RIFF....WEBP signature with 4 wildcard bytes for file size", () => {
    const webp = ALLOWED_IMAGE_FORMATS.find((f) => f.mime === "image/webp");
    expect(webp.signatures[0][0]).toBe(0x52); // R
    expect(webp.signatures[0][4]).toBeUndefined(); // wildcard
    expect(webp.signatures[0][8]).toBe(0x57); // W
  });
});

describe("imageValidation — matchesSignature", () => {
  it("returns true when buffer matches the signature exactly", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(matchesSignature(buf, [0xff, 0xd8, 0xff])).toBe(true);
  });

  it("returns false when a byte differs", () => {
    const buf = Buffer.from([0xff, 0xd8, 0x00]);
    expect(matchesSignature(buf, [0xff, 0xd8, 0xff])).toBe(false);
  });

  it("returns false when buffer is shorter than the signature", () => {
    const buf = Buffer.from([0xff, 0xd8]);
    expect(matchesSignature(buf, [0xff, 0xd8, 0xff])).toBe(false);
  });

  it("treats undefined entries as wildcards (webp file-size bytes)", () => {
    const sig = [0x52, 0x49, 0x46, 0x46, undefined, undefined, undefined, undefined, 0x57, 0x45, 0x42, 0x50];
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0xab, 0xcd, 0x12, 0x34, 0x57, 0x45, 0x42, 0x50]);
    expect(matchesSignature(buf, sig)).toBe(true);
  });

  it("returns false for null or undefined buffer", () => {
    expect(matchesSignature(null, [0xff])).toBe(false);
    expect(matchesSignature(undefined, [0xff])).toBe(false);
  });
});

describe("imageValidation — validateImageMagicBytes", () => {
  it("accepts a real PNG buffer", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(validateImageMagicBytes(png)).toBe(true);
  });

  it("accepts a real JPEG buffer", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(validateImageMagicBytes(jpeg)).toBe(true);
  });

  it("accepts GIF87a and GIF89a buffers", () => {
    expect(validateImageMagicBytes(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]))).toBe(true);
    expect(validateImageMagicBytes(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe(true);
  });

  it("accepts a WEBP buffer with arbitrary file-size bytes", () => {
    const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x11, 0x22, 0x33, 0x44, 0x57, 0x45, 0x42, 0x50]);
    expect(validateImageMagicBytes(webp)).toBe(true);
  });

  it("rejects HTML, plain text, and JSON buffers", () => {
    expect(validateImageMagicBytes(Buffer.from("<html>"))).toBe(false);
    expect(validateImageMagicBytes(Buffer.from("not an image"))).toBe(false);
    expect(validateImageMagicBytes(Buffer.from('{"key":"value"}'))).toBe(false);
  });

  it("rejects empty buffers", () => {
    expect(validateImageMagicBytes(Buffer.from([]))).toBe(false);
    expect(validateImageMagicBytes(Buffer.alloc(0))).toBe(false);
  });

  it("rejects non-Buffer inputs (string, null, number, object)", () => {
    expect(validateImageMagicBytes(null)).toBe(false);
    expect(validateImageMagicBytes(undefined)).toBe(false);
    expect(validateImageMagicBytes("string")).toBe(false);
    expect(validateImageMagicBytes(123)).toBe(false);
    expect(validateImageMagicBytes({})).toBe(false);
  });

  it("rejects a buffer that is almost PNG but has one wrong trailing byte", () => {
    const almostPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b]);
    expect(validateImageMagicBytes(almostPng)).toBe(false);
  });
});

describe("imageValidation — assertValidImageBuffer", () => {
  it("does not throw for valid PNG, JPEG, GIF, and WEBP buffers", () => {
    expect(() => assertValidImageBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).not.toThrow();
    expect(() => assertValidImageBuffer(Buffer.from([0xff, 0xd8, 0xff]))).not.toThrow();
    expect(() => assertValidImageBuffer(Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).not.toThrow();
    expect(() => assertValidImageBuffer(Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]))).not.toThrow();
  });

  it("throws a 400 error for a plain-text buffer", () => {
    let err = null;
    try {
      assertValidImageBuffer(Buffer.from("hello world"));
    } catch (e) {
      err = e;
    }
    expect(err).not.toBeNull();
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/valid/i);
  });

  it("throws 400 for null and undefined", () => {
    expect(() => assertValidImageBuffer(null)).toThrow();
    expect(() => assertValidImageBuffer(undefined)).toThrow();
    try {
      assertValidImageBuffer(null);
    } catch (e) {
      expect(e.statusCode).toBe(400);
    }
  });

  it("throws 400 for an empty buffer", () => {
    expect(() => assertValidImageBuffer(Buffer.alloc(0))).toThrow();
  });

  it("throws an instance of Error", () => {
    let err = null;
    try {
      assertValidImageBuffer(Buffer.from("x"));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
  });
});
