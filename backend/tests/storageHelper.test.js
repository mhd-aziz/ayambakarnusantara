/**
 * storageHelper.test.js — Storage helper coverage (no DB).
 * Uses CJS require cache patching because storageHelper is CJS and
 * vi.mock ESM hoisting does not affect require() cache.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Load CJS modules via require so we share the same cache as storageHelper
const storageHelper = require("../src/utils/storageHelper.js");
const supabaseConfig = require("../src/config/supabaseConfig.js");

let originalFrom;

beforeEach(() => {
  originalFrom = supabaseConfig.supabaseAdmin.storage.from;
});
afterEach(() => {
  supabaseConfig.supabaseAdmin.storage.from = originalFrom;
  vi.restoreAllMocks();
});

describe("storageHelper — getPublicUrl (pure)", () => {
  it("builds a public URL containing bucket and file path", () => {
    const url = storageHelper.getPublicUrl("product-images", "shop-1/abc.png");
    expect(url).toContain("/storage/v1/object/public/product-images/shop-1/abc.png");
    expect(url).toMatch(/^https?:\/\//);
  });
  it("preserves nested paths", () => {
    expect(storageHelper.getPublicUrl("shop-banners", "a/b/c.jpg")).toContain("shop-banners/a/b/c.jpg");
  });
});

describe("storageHelper — extractPathFromPublicUrl (pure)", () => {
  it("returns relative path for a valid URL", () => {
    expect(storageHelper.extractPathFromPublicUrl("https://test.supabase.co/storage/v1/object/public/product-images/x/y.png", "product-images")).toBe("x/y.png");
  });
  it("returns null when bucket does not match", () => {
    expect(storageHelper.extractPathFromPublicUrl("https://test.supabase.co/storage/v1/object/public/other/a.png", "product-images")).toBeNull();
  });
  it("returns null for traversal, double slash, empty, or non-string", () => {
    expect(storageHelper.extractPathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/product-images/../x.png", "product-images")).toBeNull();
    expect(storageHelper.extractPathFromPublicUrl("https://x.supabase.co/storage/v1/object/public/product-images//x.png", "product-images")).toBeNull();
    expect(storageHelper.extractPathFromPublicUrl("", "product-images")).toBeNull();
    expect(storageHelper.extractPathFromPublicUrl(null, "product-images")).toBeNull();
  });
});

describe("storageHelper — getSignedUrl (mocked storage via CJS cache)", () => {
  it("returns null when filePath is empty without calling storage", async () => {
    const mockFrom = vi.fn();
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    expect(await storageHelper.getSignedUrl("orders", "")).toBeNull();
    expect(await storageHelper.getSignedUrl("orders", null)).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns signedUrl on success", async () => {
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example.com/orders/a.png?token=abc" }, error: null }) });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    const url = await storageHelper.getSignedUrl("orders", "a.png", 3600);
    expect(url).toBe("https://signed.example.com/orders/a.png?token=abc");
    expect(mockFrom).toHaveBeenCalledWith("orders");
  });

  it("returns null on storage error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }) });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    expect(await storageHelper.getSignedUrl("orders", "missing.png")).toBeNull();
    spy.mockRestore();
  });

  it("passes custom expiresIn", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null });
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    await storageHelper.getSignedUrl("orders", "a.png", 7200);
    expect(createSignedUrl).toHaveBeenCalledWith("a.png", 7200);
  });
});

describe("storageHelper — mapPaymentProofUrls (mocked)", () => {
  it("returns input as-is for non-array or empty", async () => {
    expect(await storageHelper.mapPaymentProofUrls(null)).toBeNull();
    expect(await storageHelper.mapPaymentProofUrls([])).toEqual([]);
    expect(await storageHelper.mapPaymentProofUrls("not-array")).toBe("not-array");
  });
  it("leaves http URLs untouched", async () => {
    const mockFrom = vi.fn();
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    const urls = ["https://example.com/proof.png", "http://cdn.example.com/a.jpg"];
    expect(await storageHelper.mapPaymentProofUrls(urls)).toEqual(urls);
    expect(mockFrom).not.toHaveBeenCalled();
  });
  it("converts private paths to signed URLs", async () => {
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed/orders/b.png" }, error: null }) });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    expect((await storageHelper.mapPaymentProofUrls(["orders/b.png"]))[0]).toBe("https://signed/orders/b.png");
  });
  it("falls back to original path when signed URL fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: "fail" } }) });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    expect((await storageHelper.mapPaymentProofUrls(["private-path.png"]))[0]).toBe("private-path.png");
    spy.mockRestore();
  });
  it("passes through non-string entries", async () => {
    expect(await storageHelper.mapPaymentProofUrls([123, null])).toEqual([123, null]);
  });
  it("handles mixed http and private paths", async () => {
    const mockFrom = vi.fn().mockReturnValue({ createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed/private.png" }, error: null }) });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    const r = await storageHelper.mapPaymentProofUrls(["https://public.example.com/a.png", "private/b.png"]);
    expect(r[0]).toBe("https://public.example.com/a.png");
    expect(r[1]).toBe("https://signed/private.png");
  });
});

describe("storageHelper — deleteFile (mocked)", () => {
  it("does nothing when filePath is falsy", async () => {
    const mockFrom = vi.fn();
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    await storageHelper.deleteFile("product-images", "");
    await storageHelper.deleteFile("product-images", null);
    expect(mockFrom).not.toHaveBeenCalled();
  });
  it("calls storage.remove with filePath", async () => {
    const remove = vi.fn().mockResolvedValue({ error: null });
    const mockFrom = vi.fn().mockReturnValue({ remove });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    await storageHelper.deleteFile("product-images", "shop-1/abc.png");
    expect(mockFrom).toHaveBeenCalledWith("product-images");
    expect(remove).toHaveBeenCalledWith(["shop-1/abc.png"]);
  });
  it("warns but does not throw on remove error", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mockFrom = vi.fn().mockReturnValue({ remove: vi.fn().mockResolvedValue({ error: { message: "permission denied" } }) });
    supabaseConfig.supabaseAdmin.storage.from = mockFrom;
    await expect(storageHelper.deleteFile("product-images", "shop-1/abc.png")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
