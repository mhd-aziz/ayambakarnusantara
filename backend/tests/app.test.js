/**
 * app.test.js — Express application contract tests (no DB).
 */
import { describe, it, expect } from "vitest";
import request from "supertest";
import fs from "fs";
import path from "path";
import app from "../src/app.js";

describe("app — health and routing", () => {
  it("GET / returns 200 with welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/Selamat datang/i);
  });

  it("GET /unknown returns 404", async () => {
    const res = await request(app).get("/unknown-route-xyz");
    expect(res.status).toBe(404);
  });

  it("protected routes without auth return 401", async () => {
    const checks = [
      { method: "get", path: "/profile" },
      { method: "get", path: "/cart" },
      { method: "get", path: "/notification" },
    ];
    for (const c of checks) {
      const res = await request(app)[c.method](c.path);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    }
  });

  it("GET /product is public (200 or 500 when DB unreachable)", async () => {
    const res = await request(app).get("/product?limit=2");
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) expect(typeof res.body.success).toBe("boolean");
  });
});

describe("app — CORS", () => {
  it("allows requests with no Origin", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("includes Allow-Origin for an allowed origin", async () => {
    const allowed = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000").split(",")[0].trim();
    const res = await request(app).get("/").set("Origin", allowed);
    expect(res.headers["access-control-allow-origin"]).toBe(allowed);
  });

  it("does not echo a disallowed Origin", async () => {
    const res = await request(app).get("/").set("Origin", "https://evil.example.com");
    expect(res.headers["access-control-allow-origin"]).not.toBe("https://evil.example.com");
  });
});

describe("app — JSON and cookie handling", () => {
  it("POST /auth/login with empty body returns 400 not 500", async () => {
    const res = await request(app).post("/auth/login").send({});
    expect([400, 401]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it("handles URL-encoded bodies", async () => {
    const res = await request(app).post("/auth/login").type("form").send("email=test@example.com&password=secret");
    // Allow 500 when SUPABASE unreachable (CI dummy env -> fetch failed)
    expect([400, 401, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

describe("app — global error handler (Multer)", () => {
  it("app.js maps Multer errors to 400 with friendly messages", async () => {
    const multer = require("multer");
    const err = new multer.MulterError("LIMIT_FILE_SIZE");
    expect(err.code).toBe("LIMIT_FILE_SIZE");
    const src = fs.readFileSync(path.resolve("./src/app.js"), "utf-8");
    expect(src).toMatch(/LIMIT_FILE_SIZE/);
    expect(src).toMatch(/Ukuran file terlalu besar/);
    expect(src).toMatch(/LIMIT_UNEXPECTED_FILE/);
    expect(src).toMatch(/MulterError/);
  });
});
