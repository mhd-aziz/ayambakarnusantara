/**
 * chatValidation.test.js
 * Unit tests for pure chat-message validation helpers — no DB required.
 */
import { describe, it, expect } from "vitest";
const {
  MAX_TEXT_LENGTH,
  validateChatText,
  validateCoordinates,
  validateMessageContent,
} = require("../src/utils/chatValidation");

describe("chatValidation — MAX_TEXT_LENGTH", () => {
  it("is 2000", () => {
    expect(MAX_TEXT_LENGTH).toBe(2000);
  });
});

describe("chatValidation — validateChatText", () => {
  it("accepts null and undefined (text is optional)", () => {
    expect(validateChatText(null).valid).toBe(true);
    expect(validateChatText(undefined).valid).toBe(true);
  });

  it("accepts empty string and whitespace-only strings", () => {
    expect(validateChatText("").valid).toBe(true);
    expect(validateChatText("   ").valid).toBe(true);
    expect(validateChatText("\n\t ").valid).toBe(true);
  });

  it("accepts a short normal message and emoji", () => {
    expect(validateChatText("Halo").valid).toBe(true);
    expect(validateChatText("Message with emoji 😀").valid).toBe(true);
  });

  it("accepts exactly 2000 characters (upper boundary)", () => {
    expect(validateChatText("a".repeat(2000)).valid).toBe(true);
  });

  it("accepts 2000 chars after trimming surrounding spaces", () => {
    const padded = "  " + "a".repeat(2000) + "  ";
    expect(validateChatText(padded).valid).toBe(true);
  });

  it("rejects 2001 characters", () => {
    const r = validateChatText("a".repeat(2001));
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/2000/);
  });

  it("rejects 5000 characters with a limit hint", () => {
    const r = validateChatText("x".repeat(5000));
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/maksimal/i);
  });

  it("counts after trim — 2001 chars surrounded by spaces is still invalid", () => {
    const r = validateChatText(" " + "a".repeat(2001) + " ");
    expect(r.valid).toBe(false);
  });

  it("coerces numbers to string and validates", () => {
    expect(validateChatText(12345).valid).toBe(true);
  });

  it("coerces booleans to string and validates", () => {
    expect(validateChatText(true).valid).toBe(true);
    expect(validateChatText(false).valid).toBe(true);
  });
});

describe("chatValidation — validateCoordinates", () => {
  it("accepts null/null (no location sent)", () => {
    expect(validateCoordinates(null, null).valid).toBe(true);
    expect(validateCoordinates(undefined, undefined).valid).toBe(true);
  });

  it("accepts Jakarta coordinates (-6.2, 106.8)", () => {
    expect(validateCoordinates(-6.2, 106.8).valid).toBe(true);
  });

  it("accepts 0,0 (Null Island)", () => {
    expect(validateCoordinates(0, 0).valid).toBe(true);
  });

  it("accepts extreme boundaries -90/-180 and 90/180", () => {
    expect(validateCoordinates(-90, -180).valid).toBe(true);
    expect(validateCoordinates(90, 180).valid).toBe(true);
    expect(validateCoordinates(-90, 180).valid).toBe(true);
    expect(validateCoordinates(90, -180).valid).toBe(true);
  });

  it("accepts numeric strings with surrounding spaces", () => {
    expect(validateCoordinates(" -6.2 ", "106.8").valid).toBe(true);
    expect(validateCoordinates("-90", "-180").valid).toBe(true);
  });

  it("rejects latitude greater than 90", () => {
    const r = validateCoordinates(90.0001, 0);
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/rentang valid/i);
  });

  it("rejects latitude less than -90", () => {
    expect(validateCoordinates(-90.1, 0).valid).toBe(false);
  });

  it("rejects longitude greater than 180", () => {
    expect(validateCoordinates(0, 180.1).valid).toBe(false);
  });

  it("rejects longitude less than -180", () => {
    expect(validateCoordinates(0, -180.1).valid).toBe(false);
  });

  it("rejects NaN and non-numeric strings", () => {
    expect(validateCoordinates("abc", "def").valid).toBe(false);
    expect(validateCoordinates(NaN, NaN).valid).toBe(false);
    expect(validateCoordinates("lat", 106).valid).toBe(false);
    expect(validateCoordinates(-6, "lon").valid).toBe(false);
  });

  it("rejects partial coordinates (only one provided)", () => {
    expect(validateCoordinates(-6.2, null).valid).toBe(false);
    expect(validateCoordinates(null, 106.8).valid).toBe(false);
    expect(validateCoordinates(-6.2, undefined).valid).toBe(false);
  });

  it("includes the valid range in the error message", () => {
    const r = validateCoordinates(999, 999);
    expect(r.message).toContain("-90");
    expect(r.message).toContain("180");
  });
});

describe("chatValidation — validateMessageContent", () => {
  it("accepts text-only messages", () => {
    expect(validateMessageContent({ hasText: true, hasImage: false, hasLocation: false }).valid).toBe(true);
  });

  it("accepts image-only messages", () => {
    expect(validateMessageContent({ hasText: false, hasImage: true, hasLocation: false }).valid).toBe(true);
  });

  it("accepts location-only messages", () => {
    expect(validateMessageContent({ hasText: false, hasImage: false, hasLocation: true }).valid).toBe(true);
  });

  it("accepts combinations (text+image, text+location, image+location, all)", () => {
    expect(validateMessageContent({ hasText: true, hasImage: true, hasLocation: false }).valid).toBe(true);
    expect(validateMessageContent({ hasText: true, hasImage: false, hasLocation: true }).valid).toBe(true);
    expect(validateMessageContent({ hasText: false, hasImage: true, hasLocation: true }).valid).toBe(true);
    expect(validateMessageContent({ hasText: true, hasImage: true, hasLocation: true }).valid).toBe(true);
  });

  it("rejects when all flags are false", () => {
    const r = validateMessageContent({ hasText: false, hasImage: false, hasLocation: false });
    expect(r.valid).toBe(false);
    expect(r.message).toMatch(/tidak boleh kosong/i);
  });

  it("rejects when all flags are undefined (falsy)", () => {
    const r = validateMessageContent({ hasText: undefined, hasImage: undefined, hasLocation: undefined });
    expect(r.valid).toBe(false);
  });

  it("rejects an empty object with no properties", () => {
    const r = validateMessageContent({});
    expect(r.valid).toBe(false);
  });

  it("treats truthy non-boolean values as present (e.g. string 'a')", () => {
    expect(validateMessageContent({ hasText: "a", hasImage: 0, hasLocation: 0 }).valid).toBe(true);
  });
});
