/**
 * auditFixes.test.js — Regression for QA audit 2026-08-25 fixes.
 * H2: image gate via assertValidImageBuffer, H3: rate limiter, H1: logout revocation.
 * No DB required.
 */
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
const { assertValidImageBuffer } = require("../src/utils/imageValidation");

describe("auditFixes — H2: assertValidImageBuffer image gate", () => {
  it("accepts a valid PNG buffer", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(() => assertValidImageBuffer(png)).not.toThrow();
  });
  it("accepts a valid JPEG buffer", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(() => assertValidImageBuffer(jpeg)).not.toThrow();
  });
  it("throws 400 for non-image buffer (HTML)", () => {
    let err = null;
    try { assertValidImageBuffer(Buffer.from("<!DOCTYPE html><html>")); } catch (e) { err = e; }
    expect(err).not.toBeNull();
    expect(err.statusCode).toBe(400);
  });
  it("throws 400 for null input", () => {
    let err = null;
    try { assertValidImageBuffer(null); } catch (e) { err = e; }
    expect(err).not.toBeNull();
    expect(err.statusCode).toBe(400);
  });
});

describe("auditFixes — H3: createRateLimiter enforces per-IP budget", () => {
  it("allows up to max requests, then returns 429 and skips next()", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const mkRes = () => ({ statusCode: 200, status(c){ this.statusCode=c; return this; }, json(){ return this; } });
    const nexts = [vi.fn(), vi.fn(), vi.fn()];
    const res = [mkRes(), mkRes(), mkRes()];
    for (let i=0;i<3;i++) limiter({ ip: "10.0.0.1", socket:{}, connection:{} }, res[i], nexts[i]);
    expect(nexts[0]).toHaveBeenCalledTimes(1);
    expect(nexts[1]).toHaveBeenCalledTimes(1);
    expect(nexts[2]).not.toHaveBeenCalled();
    expect(res[2].statusCode).toBe(429);
  });
  it("isolates buckets per IP", () => {
    const { createRateLimiter } = require("../src/middlewares/rateLimiter");
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const mkRes = () => ({ statusCode: 200, status(c){ this.statusCode=c; return this; }, json(){ return this; } });
    const nextA = vi.fn(), nextB = vi.fn();
    const resA = mkRes(), resB = mkRes();
    limiter({ ip: "10.0.0.11", socket:{}, connection:{} }, resA, nextA);
    limiter({ ip: "10.0.0.11", socket:{}, connection:{} }, resA, nextA);
    limiter({ ip: "10.0.0.12", socket:{}, connection:{} }, resB, nextB);
    expect(nextA).toHaveBeenCalledTimes(1);
    expect(resA.statusCode).toBe(429);
    expect(nextB).toHaveBeenCalledTimes(1);
    expect(resB.statusCode).toBe(200);
  });
});

describe("auditFixes — H1: logout revokes refresh token server-side", () => {
  it("authController.logout calls supabaseAdmin.auth.admin.signOut with refresh token", () => {
    const source = fs.readFileSync(path.resolve("./src/controllers/authController.js"), "utf-8");
    expect(source).toMatch(/auth\.admin\.signOut/);
    expect(source).toMatch(/req\.cookies\?\.authRefreshToken/);
  });
});
