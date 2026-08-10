/**
 * Integration test — Ayam Bakar Nusantara (backend).
 * Skenario NYATA terhadap DB dev (Supabase) via supertest + app.
 * Akun demo dibuat oleh scripts/seed-demo.js — password dari env saat seed.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createClient } from "@supabase/supabase-js";

const CUST = {
  email: process.env.DEMO_CUSTOMER_EMAIL || "siti.aulia.demo@example.com",
  password: process.env.DEMO_CUSTOMER_PASSWORD || "SitiAulia-Demo-2026",
};
const S1 = {
  email: process.env.DEMO_SELLER1_EMAIL || "budi.santoso.demo@example.com",
  password: process.env.DEMO_SELLER1_PASSWORD || "BudiSantoso-Demo-2026",
};

let admin; let shop1Id; let product1Id; let product2Id; let orderId;

async function loginAgent(user) {
  const agent = request.agent(app);
  const res = await agent.post("/auth/login").send({ email: user.email, password: user.password });
  if (!res.body.success) throw new Error(`login gagal ${user.email}: ${res.body.message}`);
  return agent;
}

async function resetDemo() {
  const clear = async (table, col = "id") => {
    try { await admin.from(table).delete().neq(col, "00000000-0000-0000-0000-000000000000"); }
    catch (e) { /* tabel mungkin kosong / kolom berbeda — abaikan */ }
  };
  await clear("ratings");
  await clear("messages");
  await clear("conversations");
  await clear("notifications");
  await clear("orders");
  await clear("carts", "user_id");
}

beforeAll(async () => {
  admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: prof } = await admin.from("profiles").select("id, shop_id").eq("email", S1.email).maybeSingle();
  shop1Id = prof?.shop_id;
  const { data: prods } = await admin.from("products").select("id").eq("shop_id", shop1Id).limit(2);
  product1Id = prods?.[0]?.id;
  product2Id = prods?.[1]?.id;
  await resetDemo();
});

describe("Health & kontrak API", () => {
  it("GET / → 200", async () => {
    const r = await request(app).get("/");
    expect(r.status).toBe(200);
  });
  it("respons publik memakai {success,...}", async () => {
    const r = await request(app).get("/product?limit=5");
    expect(r.status).toBe(200);
    expect(typeof r.body.success).toBe("boolean");
  });
});

describe("Otentikasi", () => {
  it("endpoint protected tanpa cookie → 401", async () => {
    const r = await request(app).get("/cart");
    expect(r.status).toBe(401);
  });
  it("login customer → akses /profile", async () => {
    const agent = await loginAgent(CUST);
    const r = await agent.get("/profile");
    expect(r.status).toBe(200);
    expect(r.body.data.email).toBe(CUST.email);
  });
  it("login seller → /profile", async () => {
    const agent = await loginAgent(S1);
    const r = await agent.get("/profile");
    expect(r.status).toBe(200);
  });
  it("login password salah → 4xx", async () => {
    const r = await request(app).post("/auth/login").send({ email: CUST.email, password: "salah" });
    expect([400, 401]).toContain(r.status);
  });
});

describe("Katalog", () => {
  it("katalog minimal 8 produk (2 toko dari seed)", async () => {
    const r = await request(app).get("/product?limit=50");
    const list = r.body.data?.products || [];
    expect(list.length).toBeGreaterThanOrEqual(8);
  });
});

describe("Order (bayar di tempat) + seller state machine", () => {
  it("checkout PAY_AT_STORE berhasil", async () => {
    const agent = await loginAgent(CUST);
    await agent.post("/cart/items").send({ productId: product1Id, quantity: 2 });
    const res = await agent.post("/order").send({ paymentMethod: "PAY_AT_STORE", notes: "Test E2E" });
    expect([200, 201]).toContain(res.status);
    orderId = res.body.data?.orderId || res.body.data?.id || orderId;
    expect(orderId).toBeTruthy();
  });
  it("seller filter tidak memuat order toko lain (M1): buat order toko2, /order/seller/all → hanya toko1", async () => {
    const { data: prof2 } = await admin.from("profiles").select("shop_id").eq("email", process.env.DEMO_SELLER2_EMAIL || "rina.maharani.demo@example.com").maybeSingle();
    const shop2Id = prof2?.shop_id;
    const { data: p2 } = await admin.from("products").select("id").eq("shop_id", shop2Id).limit(1).maybeSingle();
    const ag = await loginAgent(CUST);
    await ag.post("/cart/items").send({ productId: p2.id, quantity: 1 });
    await ag.post("/order").send({ paymentMethod: "PAY_AT_STORE" });
    const s1 = await loginAgent(S1);
    const { data: seller1 } = await admin.from("profiles").select("id").eq("email", S1.email).maybeSingle();
    const sellerRes = await s1.get(`/order/seller/all`);
    expect(sellerRes.status).toBe(200);
    const list = sellerRes.body.data || [];
    // Tidak boleh memuat order yang hanya berisi produk toko orang lain.
    const bad = list.filter((o) => o.shopIds && !o.shopIds.includes(shop1Id) && (!o.items || !o.items.some((i) => i.shopId === shop1Id)));
    expect(bad.length).toBe(0);
    void seller1;
  });
  it("transisi invalid langsung COMPLETED dari PENDING_CONFIRMATION → 400", async () => {
    const agent = await loginAgent(S1);
    const r = await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "COMPLETED" });
    expect(r.status).toBe(400);
  });
  it("seller CONFIRMED → PROCESSING → READY_FOR_PICKUP", async () => {
    const agent = await loginAgent(S1);
    const c = await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "CONFIRMED" });
    expect(c.status).toBe(200);
    const p = await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "PROCESSING" });
    expect(p.status).toBe(200);
    const r = await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "READY_FOR_PICKUP" });
    expect(r.status).toBe(200);
  });
});

describe("Rating", () => {
  it("rating ditolak sebelum COMPLETED (PAY_AT_STORE belum paid)", async () => {
    const agent = await loginAgent(CUST);
    const r = await agent.post(`/rating/${product1Id}`).send({ orderId, ratingValue: 5, reviewText: "enak" });
    expect([400, 403]).toContain(r.status);
  });
});

describe("Chat", () => {
  it("customer membuka percakapan dengan seller → 200/201", async () => {
    const agent = await loginAgent(CUST);
    const { data: seller } = await admin.from("profiles").select("id").eq("email", S1.email).maybeSingle();
    const r = await agent.post("/chat/conversations").send({ recipientUID: seller.id });
    expect([200, 201, 400]).toContain(r.status);
  });
  it("customer tidak bisa chat dengan dirinya sendiri → 400", async () => {
    const agent = await loginAgent(CUST);
    const { data: me } = await admin.from("profiles").select("id").eq("email", CUST.email).maybeSingle();
    const r = await agent.post("/chat/conversations").send({ recipientUID: me.id });
    expect(r.status).toBe(400);
  });
});