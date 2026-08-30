/**
 * storageSecurity.test.js — Path traversal prevention & secret leak guard.
 * No DB required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { extractPathFromPublicUrl } from "../src/utils/storageHelper.js";

describe("storageSecurity — extractPathFromPublicUrl: path traversal guard", () => {
  const bucket = "product-images";

  it("extracts relative path for a valid Supabase public URL", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/product-images/shop-1/abc.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBe("shop-1/abc.png");
  });
  it("extracts path for a different bucket (shop-banners)", () => {
    const url = "https://my-project.supabase.co/storage/v1/object/public/shop-banners/shop-123/banner.jpg";
    expect(extractPathFromPublicUrl(url, "shop-banners")).toBe("shop-123/banner.jpg");
  });
  it("extracts deeply nested paths", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/product-images/category/food/item.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBe("category/food/item.png");
  });
  it("returns null for single-level traversal '..'", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/product-images/../secret.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });
  it("returns null for multi-level traversal '../../etc/passwd'", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/product-images/../../etc/passwd";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });
  it("returns null for empty or non-string input", () => {
    expect(extractPathFromPublicUrl("", bucket)).toBeNull();
    expect(extractPathFromPublicUrl(null, bucket)).toBeNull();
    expect(extractPathFromPublicUrl(undefined, bucket)).toBeNull();
  });
  it("returns null for double-slash prefix (empty segment)", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/product-images//etc/passwd";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });
  it("returns null for double-slash inside path", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/product-images/shop-1//abc.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });
  it("returns null when bucket in URL does not match", () => {
    const url = "https://xyz.supabase.co/storage/v1/object/public/other-bucket/shop-1/abc.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });
});

describe("storageSecurity — secrets are never logged to console", () => {
  let logs;
  const origLog = console.log;
  const origError = console.error;
  beforeEach(() => {
    logs = [];
    console.log = (...args) => logs.push(args.join(" "));
    console.error = (...args) => logs.push(args.join(" "));
  });
  afterEach(() => {
    console.log = origLog;
    console.error = origError;
    vi.restoreAllMocks();
  });

  it("midtransConfig does not print server/client keys on import", async () => {
    await import("../src/config/midtransConfig.js");
    const joined = logs.join("\n");
    expect(joined).not.toMatch(/Mid-server-/);
    expect(joined).not.toMatch(/Mid-client-/);
    expect(joined).not.toMatch(/MIDTRANS_(SERVER|CLIENT)_KEY/);
  });

  it("chatbotController source does not log Authorization or OMNIROUTE_API_KEY", () => {
    const source = fs.readFileSync(path.resolve("./src/controllers/chatbotController.js"), "utf-8");
    expect(source).not.toMatch(/console\.(log|error).*Authorization/);
    expect(source).not.toMatch(/console\.(log|error).*OMNIROUTE_API_KEY/);
    expect(source).not.toMatch(/Authorization:\s*\$\{.*OMNIROUTE_API_KEY\}/);
    expect(source).toMatch(/Authorization:\s*`Bearer \$\{OMNIROUTE_API_KEY\}`/);
  });
});
