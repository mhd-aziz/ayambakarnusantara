/**
 * controllerValidation.test.js — Input validation for every controller (no DB).
 * Uses CJS require cache patching because controllers are CJS.
 */
import { describe, it, expect, vi } from "vitest";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

// Patch supabaseConfig BEFORE requiring controllers so they see mocked storage
const supabaseConfig = require("../src/config/supabaseConfig.js");

// Build mock supabaseAdmin/supabaseAnon
const mockCreateUser = vi.fn().mockResolvedValue({ data: { user: { id: "mock-uid" } }, error: null });
const mockSignInWithPassword = vi.fn().mockResolvedValue({ data: { session: { access_token: "tok", refresh_token: "rtok" } }, error: null });
const mockProfileUpdate = {
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
};
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  insert: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { id: "new-id" }, error: null }),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockResolvedValue({ error: null }),
  delete: vi.fn().mockReturnThis(),
  neq: vi.fn().mockResolvedValue({}),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  rpc: vi.fn(),
}));

// Patch admin client
supabaseConfig.supabaseAdmin.auth.admin.createUser = mockCreateUser;
supabaseConfig.supabaseAdmin.auth.admin.deleteUser = vi.fn().mockResolvedValue({});
supabaseConfig.supabaseAdmin.auth.admin.signOut = vi.fn();
supabaseConfig.supabaseAdmin.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: null });
supabaseConfig.supabaseAdmin.from = mockFrom;
supabaseConfig.supabaseAdmin.storage = { from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ error: null }), createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed" }, error: null }), remove: vi.fn().mockResolvedValue({ error: null }) })) };
supabaseConfig.supabaseAdmin.rpc = vi.fn().mockResolvedValue({ data: null, error: null });
supabaseConfig.supabaseAnon.auth.signInWithPassword = mockSignInWithPassword;
supabaseConfig.supabaseAnon.auth.refreshSession = vi.fn();
supabaseConfig.supabaseAnon.auth.signOut = vi.fn();

// Now require controllers (they will see patched supabaseConfig)
const authController = require("../src/controllers/authController.js");
const productController = require("../src/controllers/productController.js");
const cartController = require("../src/controllers/cartController.js");
const shopController = require("../src/controllers/shopController.js");
const feedbackController = require("../src/controllers/feedbackController.js");
const ratingController = require("../src/controllers/ratingController.js");
const chatController = require("../src/controllers/chatController.js");
const orderController = require("../src/controllers/orderController.js");
const paymentController = require("../src/controllers/paymentController.js");
const profileController = require("../src/controllers/profileController.js");

// Mock resend/midtrans via require cache (they are CJS too)
try {
  const resendConfig = require("../src/config/resendConfig.js");
  resendConfig.resend = { emails: { send: vi.fn().mockResolvedValue({}) } };
  resendConfig.resendFromEmail = "test@example.com";
} catch {}
try {
  const midtransConfig = require("../src/config/midtransConfig.js");
  midtransConfig.createTransaction = vi.fn();
  midtransConfig.Snap = vi.fn();
} catch {}

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.payload = null;
  res.headers = {};
  res.cookie = vi.fn();
  res.status = function (c) { this.statusCode = c; return this; };
  res.json = function (p) { this.payload = p; return this; };
  return res;
}
function mockReq(overrides = {}) {
  return { user: null, body: {}, params: {}, query: {}, cookies: {}, headers: {}, file: null, ...overrides };
}

describe("controllerValidation — authController.register", () => {
  it("rejects missing email/password/displayName with 400", async () => {
    const res = mockRes();
    await authController.register(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
  });
  it("rejects password shorter than 6 chars", async () => {
    const res = mockRes();
    await authController.register(mockReq({ body: { email: "a@b.com", password: "123", displayName: "Test" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/6 karakter/);
  });
  it("rejects phoneNumber without leading +", async () => {
    const res = mockRes();
    await authController.register(mockReq({ body: { email: "a@b.com", password: "123456", displayName: "Test", phoneNumber: "081234" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/kode negara/);
  });
  it("accepts phoneNumber starting with + (passes validation, creates user)", async () => {
    const res = mockRes();
    await authController.register(mockReq({ body: { email: "a@b.com", password: "123456", displayName: "Test", phoneNumber: "+6281234567890" } }), res);
    expect(res.statusCode).not.toBe(400);
    expect(mockCreateUser).toHaveBeenCalled();
  });
});

describe("controllerValidation — authController.login", () => {
  it("rejects missing email or password with 400", async () => {
    const r1 = mockRes(); await authController.login(mockReq({ body: { email: "a@b.com" } }), r1); expect(r1.statusCode).toBe(400);
    const r2 = mockRes(); await authController.login(mockReq({ body: { password: "x" } }), r2); expect(r2.statusCode).toBe(400);
    const r3 = mockRes(); await authController.login(mockReq({ body: {} }), r3); expect(r3.statusCode).toBe(400);
  });
});

describe("controllerValidation — productController.createProduct", () => {
  it("rejects unauthenticated request with 401", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ body: { name: "Ayam", description: "Enak", price: "10000", stock: "10", category: "Makanan" } }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing fields with 400", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ user: { uid: "u1" }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
  it("rejects non-positive price", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ user: { uid: "u1" }, body: { name: "A", description: "D", price: "0", stock: "10", category: "Makanan" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/Harga/);
  });
  it("rejects price exceeding maximum", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ user: { uid: "u1" }, body: { name: "A", description: "D", price: "99999999999", stock: "10", category: "Makanan" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/maksimal/);
  });
  it("rejects negative stock", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ user: { uid: "u1" }, body: { name: "A", description: "D", price: "10000", stock: "-1", category: "Makanan" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/Stok/);
  });
  it("rejects invalid category", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ user: { uid: "u1" }, body: { name: "A", description: "D", price: "10000", stock: "10", category: "Elektronik" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/Kategori/);
  });
  it("trims category whitespace before validation", async () => {
    const res = mockRes();
    await productController.createProduct(mockReq({ user: { uid: "u1" }, body: { name: "A", description: "D", price: "10000", stock: "10", category: "  Makanan  " } }), res);
    if (res.statusCode === 400) expect(res.payload.message).not.toMatch(/Kategori/);
  });
});

describe("controllerValidation — cartController.addItemToCart", () => {
  it("rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await cartController.addItemToCart(mockReq({ body: { productId: "p1", quantity: 1 } }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing productId/quantity with 400", async () => {
    const res = mockRes();
    await cartController.addItemToCart(mockReq({ user: { uid: "u1" }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
  it("rejects non-positive quantity", async () => {
    const r1 = mockRes(); await cartController.addItemToCart(mockReq({ user: { uid: "u1" }, body: { productId: "p1", quantity: 0 } }), r1); expect(r1.statusCode).toBe(400);
    const r2 = mockRes(); await cartController.addItemToCart(mockReq({ user: { uid: "u1" }, body: { productId: "p1", quantity: -1 } }), r2); expect(r2.statusCode).toBe(400);
    const r3 = mockRes(); await cartController.addItemToCart(mockReq({ user: { uid: "u1" }, body: { productId: "p1", quantity: "abc" } }), r3); expect(r3.statusCode).toBe(400);
  });
});

describe("controllerValidation — shopController.createShop", () => {
  it("rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await shopController.createShop(mockReq({ body: { description: "Toko enak" } }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing description with 400", async () => {
    const res = mockRes();
    await shopController.createShop(mockReq({ user: { uid: "u1" }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe("controllerValidation — feedbackController.createFeedback", () => {
  it("rejects missing name/email/message with 400", async () => {
    const r1 = mockRes(); await feedbackController.createFeedback(mockReq({ body: { email: "a@b.com", message: "hi" } }), r1); expect(r1.statusCode).toBe(400);
    const r2 = mockRes(); await feedbackController.createFeedback(mockReq({ body: { name: "A", message: "hi" } }), r2); expect(r2.statusCode).toBe(400);
    const r3 = mockRes(); await feedbackController.createFeedback(mockReq({ body: { name: "A", email: "a@b.com" } }), r3); expect(r3.statusCode).toBe(400);
  });
  it("rejects invalid email format", async () => {
    const res = mockRes();
    await feedbackController.createFeedback(mockReq({ body: { name: "A", email: "not-an-email", message: "hi" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/email.*valid/i);
  });
  it("accepts valid feedback payload (passes validation, hits DB mock)", async () => {
    const res = mockRes();
    await feedbackController.createFeedback(mockReq({ body: { name: "A", email: "a@b.com", message: "Great food!" } }), res);
    expect([201, 500]).toContain(res.statusCode);
  });
});

describe("controllerValidation — ratingController.addRating", () => {
  it("rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await ratingController.addRating(mockReq({ params: { productId: "p1" }, body: { orderId: "o1", ratingValue: 5 } }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing fields with 400", async () => {
    const res = mockRes();
    await ratingController.addRating(mockReq({ user: { uid: "u1" }, params: {}, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
  it("rejects ratingValue out of range 1-5", async () => {
    const r1 = mockRes(); await ratingController.addRating(mockReq({ user: { uid: "u1" }, params: { productId: "p1" }, body: { orderId: "o1", ratingValue: 0 } }), r1); expect(r1.statusCode).toBe(400);
    const r2 = mockRes(); await ratingController.addRating(mockReq({ user: { uid: "u1" }, params: { productId: "p1" }, body: { orderId: "o1", ratingValue: 6 } }), r2); expect(r2.statusCode).toBe(400);
    const r3 = mockRes(); await ratingController.addRating(mockReq({ user: { uid: "u1" }, params: { productId: "p1" }, body: { orderId: "o1", ratingValue: "abc" } }), r3); expect(r3.statusCode).toBe(400);
  });
});

describe("controllerValidation — chatController.startOrGetConversation", () => {
  it("rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await chatController.startOrGetConversation(mockReq({ body: { recipientUID: "other" } }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing recipientUID with 400", async () => {
    const res = mockRes();
    await chatController.startOrGetConversation(mockReq({ user: { uid: "u1" }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
  it("rejects self-conversation with 400", async () => {
    const res = mockRes();
    await chatController.startOrGetConversation(mockReq({ user: { uid: "u1" }, body: { recipientUID: "u1" } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/diri sendiri/);
  });
});

describe("controllerValidation — orderController.createOrder", () => {
  it("rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await orderController.createOrder(mockReq({ body: { paymentMethod: "PAY_AT_STORE" } }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing paymentMethod with 400", async () => {
    const res = mockRes();
    await orderController.createOrder(mockReq({ user: { uid: "u1" }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe("controllerValidation — paymentController.createMidtransTransaction", () => {
  it("rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await paymentController.createMidtransTransaction(mockReq({ params: { orderId: "o1" }, get: () => null }), res);
    expect(res.statusCode).toBe(401);
  });
  it("rejects missing orderId with 400", async () => {
    const res = mockRes();
    await paymentController.createMidtransTransaction(mockReq({ user: { uid: "u1" }, params: {}, get: () => null }), res);
    expect(res.statusCode).toBe(400);
  });
});

describe("controllerValidation — profileController", () => {
  it("getProfile rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await profileController.getProfile(mockReq({}), res);
    expect(res.statusCode).toBe(401);
  });
  it("updateProfile rejects unauthenticated with 401", async () => {
    const res = mockRes();
    await profileController.updateProfile(mockReq({ body: {} }), res);
    expect(res.statusCode).toBe(401);
  });
});
