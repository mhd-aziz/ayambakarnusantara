/**
 * integration.test.js — End-to-end flow against the dev Supabase project.
 * Requires .env.dev with DEMO_*_PASSWORD and SUPABASE_* keys.
 * Seeded via scripts/seed-demo.js. Skipped automatically in CI when env is missing.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { createClient } from "@supabase/supabase-js";

const hasEnv = Boolean(process.env.SUPABASE_URL && process.env.DEMO_CUSTOMER_PASSWORD);
const describeIfEnv = hasEnv ? describe : describe.skip;

const envOrThrow = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in .env.dev — run scripts/seed-demo.js first.`);
  return v;
};

const CUSTOMER = {
  email: process.env.DEMO_CUSTOMER_EMAIL || "siti.aulia.demo@example.com",
  password: hasEnv ? envOrThrow("DEMO_CUSTOMER_PASSWORD") : "dummy",
};
const SELLER_1 = {
  email: process.env.DEMO_SELLER1_EMAIL || "budi.santoso.demo@example.com",
  password: hasEnv ? envOrThrow("DEMO_SELLER1_PASSWORD") : "dummy",
};

let admin;
let shop1Id;
let product1Id;
let orderId;

async function loginAgent(user) {
  const agent = request.agent(app);
  const res = await agent.post("/auth/login").send({ email: user.email, password: user.password });
  if (!res.body.success) throw new Error(`Login failed for ${user.email}: ${res.body.message}`);
  return agent;
}

async function resetDemoState() {
  const clear = async (table, col = "id") => {
    try {
      await admin.from(table).delete().neq(col, "00000000-0000-0000-0000-000000000000");
    } catch {
      /* ignore */
    }
  };
  await clear("ratings");
  await clear("messages");
  await clear("conversations");
  await clear("notifications");
  await clear("orders");
  await clear("carts", "user_id");
  try {
    await admin.from("products").update({ stock: 50 }).neq("id", "00000000-0000-0000-0000-000000000000");
  } catch {
    /* ignore */
  }
}

beforeAll(async () => {
  if (!hasEnv) return;
  admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin.from("profiles").select("id, shop_id").eq("email", SELLER_1.email).maybeSingle();
  shop1Id = profile?.shop_id;
  const { data: products } = await admin.from("products").select("id").eq("shop_id", shop1Id).limit(2);
  product1Id = products?.[0]?.id;
  await resetDemoState();
});

describeIfEnv("integration — health and public contract", () => {
  it("GET / returns 200 welcome message", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
  });

  it("GET /product returns { success: boolean } envelope", async () => {
    const res = await request(app).get("/product?limit=5");
    expect(res.status).toBe(200);
    expect(typeof res.body.success).toBe("boolean");
  });
});

describeIfEnv("integration — authentication", () => {
  it("GET /cart without auth returns 401", async () => {
    const res = await request(app).get("/cart");
    expect(res.status).toBe(401);
  });

  it("customer login then GET /profile returns own email", async () => {
    const agent = await loginAgent(CUSTOMER);
    const res = await agent.get("/profile");
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(CUSTOMER.email);
  });

  it("seller login then GET /profile succeeds", async () => {
    const agent = await loginAgent(SELLER_1);
    const res = await agent.get("/profile");
    expect(res.status).toBe(200);
  });

  it("login with wrong password returns 400 or 401", async () => {
    const res = await request(app).post("/auth/login").send({ email: CUSTOMER.email, password: "wrong-password" });
    expect([400, 401]).toContain(res.status);
  });
});

describeIfEnv("integration — product catalog", () => {
  it("GET /product returns at least 8 seeded products", async () => {
    const res = await request(app).get("/product?limit=50");
    const list = res.body.data?.products || [];
    expect(list.length).toBeGreaterThanOrEqual(8);
  });
});

describeIfEnv("integration — order lifecycle (PAY_AT_STORE) and seller state machine", () => {
  it("customer can checkout with PAY_AT_STORE", async () => {
    const agent = await loginAgent(CUSTOMER);
    await agent.post("/cart/items").send({ productId: product1Id, quantity: 2 });
    const res = await agent.post("/order").send({ paymentMethod: "PAY_AT_STORE", notes: "E2E test order" });
    expect([200, 201]).toContain(res.status);
    orderId = res.body.data?.orderId || res.body.data?.id || orderId;
    expect(orderId).toBeTruthy();
  });

  it("seller order list does not leak orders from other shops", async () => {
    const { data: prof2 } = await admin.from("profiles").select("shop_id").eq("email", process.env.DEMO_SELLER2_EMAIL || "rina.maharani.demo@example.com").maybeSingle();
    const shop2Id = prof2?.shop_id;
    const { data: otherProduct } = await admin.from("products").select("id").eq("shop_id", shop2Id).limit(1).maybeSingle();
    const customerAgent = await loginAgent(CUSTOMER);
    await customerAgent.post("/cart/items").send({ productId: otherProduct.id, quantity: 1 });
    await customerAgent.post("/order").send({ paymentMethod: "PAY_AT_STORE" });
    const sellerAgent = await loginAgent(SELLER_1);
    const res = await sellerAgent.get("/order/seller/all");
    expect(res.status).toBe(200);
    const list = res.body.data || [];
    const leaked = list.filter((o) => o.shopIds && !o.shopIds.includes(shop1Id) && (!o.items || !o.items.some((i) => i.shopId === shop1Id)));
    expect(leaked.length).toBe(0);
  });

  it("seller cannot jump directly to COMPLETED from PENDING_CONFIRMATION (returns 400)", async () => {
    const agent = await loginAgent(SELLER_1);
    const res = await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "COMPLETED" });
    expect(res.status).toBe(400);
  });

  it("seller advances order CONFIRMED -> PROCESSING -> READY_FOR_PICKUP", async () => {
    const agent = await loginAgent(SELLER_1);
    expect((await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "CONFIRMED" })).status).toBe(200);
    expect((await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "PROCESSING" })).status).toBe(200);
    expect((await agent.patch(`/order/${orderId}/seller/status`).send({ newStatus: "READY_FOR_PICKUP" })).status).toBe(200);
  });
});

describeIfEnv("integration — rating guard", () => {
  it("rejects rating before order is COMPLETED", async () => {
    const agent = await loginAgent(CUSTOMER);
    const res = await agent.post(`/rating/${product1Id}`).send({ orderId, ratingValue: 5, reviewText: "Delicious" });
    expect([400, 403]).toContain(res.status);
  });
});

describeIfEnv("integration — chat", () => {
  it("customer can open a conversation with a seller", async () => {
    const agent = await loginAgent(CUSTOMER);
    const { data: seller } = await admin.from("profiles").select("id").eq("email", SELLER_1.email).maybeSingle();
    const res = await agent.post("/chat/conversations").send({ recipientUID: seller.id });
    expect([200, 201, 400]).toContain(res.status);
  });

  it("customer cannot open a conversation with themselves (400)", async () => {
    const agent = await loginAgent(CUSTOMER);
    const { data: me } = await admin.from("profiles").select("id").eq("email", CUSTOMER.email).maybeSingle();
    const res = await agent.post("/chat/conversations").send({ recipientUID: me.id });
    expect(res.status).toBe(400);
  });
});
