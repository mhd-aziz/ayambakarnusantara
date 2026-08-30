/**
 * validationFixes.test.js — Regression for image magic-byte & chat validation fixes.
 * Pure modules, no DB required. Runs in CI.
 */
import { describe, it, expect } from "vitest";
const { validateImageMagicBytes, ALLOWED_IMAGE_FORMATS } = require("../src/utils/imageValidation");
const { validateChatText, validateCoordinates, validateMessageContent } = require("../src/utils/chatValidation");

describe("validationFixes — imageValidation: validateImageMagicBytes", () => {
  it("accepts a valid PNG signature", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(validateImageMagicBytes(png)).toBe(true);
  });
  it("accepts a valid JPEG signature", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(validateImageMagicBytes(jpeg)).toBe(true);
  });
  it("accepts GIF87a signature", () => {
    const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]);
    expect(validateImageMagicBytes(gif)).toBe(true);
  });
  it("accepts WEBP RIFF....WEBP signature", () => {
    const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    expect(validateImageMagicBytes(webp)).toBe(true);
  });
  it("rejects HTML content masquerading as image", () => {
    expect(validateImageMagicBytes(Buffer.from("<!DOCTYPE html><html>"))).toBe(false);
  });
  it("rejects plain text buffer", () => {
    expect(validateImageMagicBytes(Buffer.from("i am not an image".repeat(10)))).toBe(false);
  });
  it("rejects non-Buffer inputs (null, string, undefined)", () => {
    expect(validateImageMagicBytes(null)).toBe(false);
    expect(validateImageMagicBytes("string")).toBe(false);
    expect(validateImageMagicBytes(undefined)).toBe(false);
  });
  it("exposes exactly 4 allowed image formats", () => {
    expect(ALLOWED_IMAGE_FORMATS).toHaveLength(4);
  });
});

describe("validationFixes — chatValidation: text, coordinates, content", () => {
  it("accepts normal chat text", () => {
    expect(validateChatText("Hello, how are you?").valid).toBe(true);
  });
  it("accepts null/undefined/empty text (text is optional)", () => {
    expect(validateChatText(null).valid).toBe(true);
    expect(validateChatText("").valid).toBe(true);
    expect(validateChatText(undefined).valid).toBe(true);
  });
  it("rejects text exceeding 2000 characters", () => {
    const r = validateChatText("a".repeat(2001));
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/2000/);
  });
  it("accepts exactly 2000 characters (boundary)", () => {
    expect(validateChatText("a".repeat(2000)).valid).toBe(true);
  });
  it("accepts valid coordinates (Jakarta, origin, extremes)", () => {
    expect(validateCoordinates(-6.2, 106.8).valid).toBe(true);
    expect(validateCoordinates(0, 0).valid).toBe(true);
    expect(validateCoordinates(90, 180).valid).toBe(true);
    expect(validateCoordinates(-90, -180).valid).toBe(true);
  });
  it("rejects latitude out of range", () => {
    expect(validateCoordinates(91, 0).valid).toBe(false);
  });
  it("rejects longitude out of range", () => {
    expect(validateCoordinates(0, 200).valid).toBe(false);
  });
  it("rejects non-numeric coordinates", () => {
    expect(validateCoordinates("abc", "def").valid).toBe(false);
  });
  it("accepts missing coordinates (no location)", () => {
    expect(validateCoordinates(null, null).valid).toBe(true);
  });
  it("requires at least one content type (text | image | location)", () => {
    expect(validateMessageContent({ hasText: false, hasImage: false, hasLocation: false }).valid).toBe(false);
    expect(validateMessageContent({ hasText: true, hasImage: false, hasLocation: false }).valid).toBe(true);
    expect(validateMessageContent({ hasText: false, hasImage: true, hasLocation: false }).valid).toBe(true);
    expect(validateMessageContent({ hasText: false, hasImage: false, hasLocation: true }).valid).toBe(true);
  });
});
