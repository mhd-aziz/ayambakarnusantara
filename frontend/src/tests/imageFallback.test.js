import { describe, it, expect } from "vitest";
import {
  FALLBACK_PRODUCT_IMAGE,
  FALLBACK_PRODUCT_SMALL,
  FALLBACK_SHOP_IMAGE,
  FALLBACK_AVATAR_IMAGE,
  handleProductImageError,
  handleProductSmallImageError,
  handleShopImageError,
  handleAvatarError,
} from "../utils/imageFallback";

describe("imageFallback utils", () => {
  it("fallback constants adalah data:image/svg+xml", () => {
    [FALLBACK_PRODUCT_IMAGE, FALLBACK_PRODUCT_SMALL, FALLBACK_SHOP_IMAGE, FALLBACK_AVATAR_IMAGE].forEach(
      (s) => expect(s).toMatch(/^data:image\/svg\+xml/)
    );
  });

  it("handleProductImageError mengganti src ke fallback", () => {
    const e = { target: { src: "orig.jpg", onerror: () => {} } };
    handleProductImageError(e);
    expect(e.target.src).toBe(FALLBACK_PRODUCT_IMAGE);
    expect(e.target.onerror).toBeNull();
  });

  it("handleProductSmallImageError / Shop / Avatar", () => {
    const mk = () => ({ target: { src: "x", onerror: () => {} } });
    const a = mk();
    handleProductSmallImageError(a);
    expect(a.target.src).toBe(FALLBACK_PRODUCT_SMALL);
    const b = mk();
    handleShopImageError(b);
    expect(b.target.src).toBe(FALLBACK_SHOP_IMAGE);
    const c = mk();
    handleAvatarError(c);
    expect(c.target.src).toBe(FALLBACK_AVATAR_IMAGE);
  });
});
