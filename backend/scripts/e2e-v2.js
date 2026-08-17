// E2E NYATA — pesan eksplisit dari toko Budi (SANJAYA) → Budi majukan status → rating → chat → notif.
// Cetak PASS/FAIL nyata. Gunakan cookie httpOnly; verifikasi langsung.
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.dev"), override: true });
const axios = require("axios");
const BASE = "http://localhost:5000";
const envOrThrow = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Wajib set ${name} di .env.dev sebelum E2E (lihat scripts/sync-demo-passwords.js).`);
  return v;
};
const CUST = { email: "siti.aulia.demo@example.com", password: envOrThrow("DEMO_CUSTOMER_PASSWORD") };
const S1 = { email: "budi.santoso.demo@example.com", password: envOrThrow("DEMO_SELLER1_PASSWORD") };
const S2 = { email: "rina.maharani.demo@example.com", password: envOrThrow("DEMO_SELLER2_PASSWORD") };

const results = [];
const check = (name, cond, extra = "") => { results.push({ name, cond, extra }); console.log((cond ? "PASS" : "FAIL") + " | " + name + (extra ? " — " + extra : "")); };

async function login(u) {
  const r = await axios.post(`${BASE}/auth/login`, u, { validateStatus: () => true });
  return (r.headers["set-cookie"] || []).join("; ");
}
const get = (c, p) => axios.get(BASE + p, { headers: { Cookie: c }, validateStatus: () => true });
const post = (c, p, b = {}) => axios.post(BASE + p, b, { headers: { Cookie: c }, validateStatus: () => true });
const patch = (c, p, b) => axios.patch(BASE + p, b, { headers: { Cookie: c }, validateStatus: () => true });

(async () => {
  const cust = await login(CUST);
  const s1 = await login(S1);
  const s2 = await login(S2);
  check("login 3 akun", cust && s1 && s2);

  const cat = await get(cust, "/product?limit=100");
  const list = cat.data.data?.products || [];
  check("katalog 8 produk", list.length >= 8, list.length + " produk");

  // Ambil produk milik toko Budi via /shop/my-shop
  const budiShop = await get(s1, "/shop/my-shop");
  const budiShopId = budiShop.data?.data?.shopId;
  const budiProd = list.find((p) => p.shopId === budiShopId);
  check("produk toko Budi ditemukan", !!budiProd, budiProd ? budiProd.name : "tidak ada");
  if (!budiProd) { process.exit(1); }

  await post(cust, "/cart/items", { productId: budiProd._id, quantity: 2 });
  const cart = await get(cust, "/cart");
  check("cart berisi item Budi", cart.data?.data?.items?.length >= 1, cart.data?.data?.items?.length + " item");

  const ord = await post(cust, "/order", { paymentMethod: "PAY_AT_STORE", notes: "E2E nyata Budi" });
  const o = ord.data?.data;
  const orderId = o?.orderId || o?.id;
  check("checkout PAY_AT_STORE", ord.status === 201 && !!orderId, "orderId=" + orderId);

  // Rina (bukan seller terkait) HARUS ditolak 403
  const rinaDeny = await patch(s2, `/order/${orderId}/seller/status`, { newStatus: "CONFIRMED" });
  check("seller Rina ditolak (403)", rinaDeny.status === 403, rinaDeny.data?.message);

  // Budi (seller terkait) BISA majukan
  const c1 = await patch(s1, `/order/${orderId}/seller/status`, { newStatus: "CONFIRMED" });
  const c2 = await patch(s1, `/order/${orderId}/seller/status`, { newStatus: "PROCESSING" });
  const c3 = await patch(s1, `/order/${orderId}/seller/status`, { newStatus: "READY_FOR_PICKUP" });
  check("Budi CONFIRMED→PROCESSING→READY", c1.status === 200 && c2.status === 200 && c3.status === 200, [c1.status, c2.status, c3.status].join(","));

  const bad = await patch(s1, `/order/${orderId}/seller/status`, { newStatus: "COMPLETED" });
  check("COMPLETED tanpa bayar → 400", bad.status === 400, bad.data?.message);

  // Rating sebelum COMPLETED harus ditolak
  const r = await post(cust, `/rating/${budiProd._id}`, { orderId, ratingValue: 5, reviewText: "enak" });
  check("rating sebelum COMPLETED ditolak", [400, 403].includes(r.status), r.data?.message);

  // Chat
  const prof = await get(s1, "/profile");
  const conv = await post(cust, "/chat/conversations", { recipientUID: prof.data?.data?.uid });
  const convId = conv.data?.data?._id || conv.data?.data?.conversationId;
  check("chat dibuat", conv.status === 200 && !!convId, "convId=" + convId);
  if (convId) {
    const m = await post(cust, `/chat/conversations/${convId}/messages`, { text: "Halo Pak Budi, kapan pesanan siap?" });
    check("kirim pesan chat", m.status === 201, m.data?.message);
  }

  // Notifikasi (customer dapat notif status update)
  const notif = await get(cust, "/notification");
  check("notifikasi customer ada", (notif.data?.data?.length || 0) >= 1, notif.data?.data?.length + " notif");

  const passed = results.filter((x) => x.cond).length;
  console.log(`\n== E2E: ${passed}/${results.length} PASS ==`);
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error("E2E ERROR:", e.response?.data || e.message); process.exit(1); });