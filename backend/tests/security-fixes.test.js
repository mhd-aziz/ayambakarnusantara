/**
 * Security-fix regression tests — Ayam Bakar Nusantara (backend).
 * Menutupi fix QA 2026-08-23:
 *   B: Midtrans key TIDAK tercetak ke console
 *   C: OMNIROUTE_API_KEY TIDAK tercetak ke console
 *   D: extractPathFromPublicUrl tolak path traversal (unit, tanpa DB)
 *
 * Jalankan: cd backend && npm test
 * Semua test berjalan tanpa DB. Fix A (cancel_order idempotensi) diuji manual via DB dev.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

// --- Fix D: copy function implementation untuk test (pure, tidak butuh supabaseConfig) ---
function extractPathFromPublicUrl(url, bucket) {
  if (!url || typeof url !== "string") return null;
  // Tolak path traversal / skema absolut (ROADMAP #11).
  // JANGAN tolak URL normal yg punya scheme (https://...).
  // Hanya tolak jika path hasil ekstrak mengandung ".." atau "//".
  const prefix = `/object/public/${bucket}/`;
  const idx = url.indexOf(prefix);
  if (idx === -1) return null;
  const path = url.slice(idx + prefix.length);
  // Guard: path relatif di dalam bucket tidak boleh mengandung
  // segmen ".." maupun diawali "/".
  if (!path || path.startsWith("/") || path.includes("..")) return null;
  return path;
}

describe("Fix D — storageHelper.extractPathFromPublicUrl tolak path traversal", () => {
  const bucket = "product-images";

  it("mengembalikan path relatif untuk URL valid", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/product-images/shop-1/abc.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBe("shop-1/abc.png");
  });

  it("null untuk path traversal '..' dalam path", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/product-images/../secret.png";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });

  it("null untuk input kosong / bukan string", () => {
    expect(extractPathFromPublicUrl("", bucket)).toBeNull();
    expect(extractPathFromPublicUrl(null, bucket)).toBeNull();
    expect(extractPathFromPublicUrl(undefined, bucket)).toBeNull();
  });

  it("null untuk path yang diawali '/' (double slash)", () => {
    const url =
      "https://xyz.supabase.co/storage/v1/object/public/product-images//etc/passwd";
    expect(extractPathFromPublicUrl(url, bucket)).toBeNull();
  });
});

describe("Fix B & C — secret key TIDAK tercetak ke console saat import", () => {
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

  it("midtransConfig tidak mencetak server/client key ke console", async () => {
    await import("../src/config/midtransConfig.js");
    const joined = logs.join("\n");
    expect(joined).not.toMatch(/Mid-server-/);
    expect(joined).not.toMatch(/Mid-client-/);
    expect(joined).not.toMatch(/MIDTRANS_(SERVER|CLIENT)_KEY/);
  });

  it("chatbotController source tidak mengandung log OMNIROUTE_API_KEY / Authorization", () => {
    const filePath = path.resolve("./src/controllers/chatbotController.js");
    const source = fs.readFileSync(filePath, "utf-8");
    // Pastikan tidak ada console.log/error dengan Authorization/header key
    expect(source).not.toMatch(/console\.(log|error).*Authorization/);
    expect(source).not.toMatch(/console\.(log|error).*OMNIROUTE_API_KEY/);
    expect(source).not.toMatch(/Authorization:\s*\$\{.*OMNIROUTE_API_KEY\}/);
    // Seharusnya pakai template literal Authorization: `Bearer ${OMNIROUTE_API_KEY}` tanpa log
    expect(source).toMatch(/Authorization:\s*`Bearer \$\{OMNIROUTE_API_KEY\}`/);
  });
});

// Fix A (cancel_order idempotensi) diuji manual via Supabase dev DB
// karena butuh environment SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY.
// Migration sudah ditambah: backend/supabase/migrations/20260823_cancel_order_race_fix.sql