// Seed demo data via API nyata (bukan insert DB bypass).
// Akun demo memakai domain example.com (aman, bukan identitas orang nyata),
// nama tampilan natural. Password WAJIB dari environment — tidak boleh hard-code:
//   DEMO_CUSTOMER_PASSWORD=... DEMO_SELLER1_PASSWORD=... DEMO_SELLER2_PASSWORD=...
// Jalankan SETELAH backend hidup: node scripts/seed-demo.js
const axios = require("axios");
const BASE = process.env.API_BASE || "http://localhost:5000";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Wajib set env ${name} (mis. DEMO_CUSTOMER_PASSWORD) sebelum seed.`);
  return v;
}

const mk = (email, password, displayName, phoneNumber, address) => ({
  email, password, displayName, phoneNumber, address,
});

const CUSTOMER = mk(
  process.env.DEMO_CUSTOMER_EMAIL || "siti.aulia.demo@example.com",
  requireEnv("DEMO_CUSTOMER_PASSWORD"),
  "Siti Aulia", "+6281234567890", "Jl. Mawar No. 14, Bandung"
);
const SELLER1 = mk(
  process.env.DEMO_SELLER1_EMAIL || "budi.santoso.demo@example.com",
  requireEnv("DEMO_SELLER1_PASSWORD"),
  "Budi Santoso", "+6285678123456", "Jl. Merpati No. 8, Bandung"
);
const SELLER2 = mk(
  process.env.DEMO_SELLER2_EMAIL || "rina.maharani.demo@example.com",
  requireEnv("DEMO_SELLER2_PASSWORD"),
  "Rina Maharani", "+6287890123456", "Jl. Kenanga No. 3, Bandung"
);

async function call(method, path, data, cookie) {
  return axios({
    method, url: BASE + path, data,
    headers: cookie ? { Cookie: cookie } : {},
    validateStatus: () => true,
  });
}

async function register(u) {
  const r = await call("post", "/auth/register", u);
  if (!r.data.success) throw new Error("Register " + u.email + ": " + r.data.message);
  const c = (r.headers["set-cookie"] || []).join("; ");
  console.log("  ✓ Register:", u.displayName, "|", u.email);
  return c;
}

async function main() {
  console.log("\n=== SEED — Ayam Bakar Nusantara ===\n");
  const cust = await register(CUSTOMER);
  const s1 = await register(SELLER1);
  const s2 = await register(SELLER2);

  console.log("\n[2] Budi buka toko + produk...");
  const sh1 = await call("post", "/shop", { description: "Warung ayam bakar bumbu Nusantara, keluarga, halal, melayani sejak 2012." }, s1);
  if (!sh1.data.success) throw new Error("Toko Budi: " + sh1.data.message);
  console.log("  ✓ Toko Budi dibuat");
  const products1 = [
    { name: "Ayam Bakar Bumbu Rujak", description: "Ayam bakar bumbu rujak khas Sunda, pedas manis.", price: 28000, stock: 20, category: "Makanan" },
    { name: "Ayam Bakar Kecap", description: "Ayam bakar kecap manis, empuk dan harum.", price: 25000, stock: 15, category: "Makanan" },
    { name: "Es Teh Manis", description: "Teh manis dingin, penyegar tenggorokan.", price: 5000, stock: 60, category: "Minuman" },
    { name: "Kerupuk Udang", description: "Kerupuk udang renyah pelengkap makan.", price: 3000, stock: 80, category: "Camilan" },
  ];
  for (const p of products1) {
    const r = await call("post", "/product", p, s1);
    console.log(r.data.success ? "  ✓ Produk: " + p.name : "  ! gagal: " + p.name + " " + (r.data.message || ""));
  }

  console.log("\n[3] Rina buka toko + produk...");
  const sh2 = await call("post", "/shop", { description: "Dapur rumahan menu Nusantara, higienis dan terjangkau." }, s2);
  if (!sh2.data.success) throw new Error("Toko Rina: " + sh2.data.message);
  console.log("  ✓ Toko Rina dibuat");
  const products2 = [
    { name: "Ayam Bakar Taliwang", description: "Ayam bakar khas Lombok, pedas gurih.", price: 32000, stock: 12, category: "Makanan" },
    { name: "Nasi Uduk Komplit", description: "Nasi uduk gurih dengan lauk lengkap.", price: 18000, stock: 25, category: "Makanan" },
    { name: "Jus Alpukat", description: "Jus alpukat segar dengan susu cokelat.", price: 12000, stock: 30, category: "Minuman" },
    { name: "Pisang Goreng Crispy", description: "Pisang goreng crispy, cocok untuk camilan.", price: 8000, stock: 40, category: "Camilan" },
  ];
  for (const p of products2) {
    const r = await call("post", "/product", p, s2);
    console.log(r.data.success ? "  ✓ Produk: " + p.name : "  ! gagal: " + p.name + " " + (r.data.message || ""));
  }

  console.log("\n[4] Siti melihat katalog...");
  const cat = await call("get", "/product?limit=20", null, cust);
  const list = cat.data.data?.products || cat.data.data || [];
  console.log("  ✓ Produk di katalog:", Array.isArray(list) ? list.length : "?");

  console.log("\n=== SEED SELESAI ===");
  console.log("Customer: " + CUSTOMER.email + " / " + CUSTOMER.password);
  console.log("Seller 1: " + SELLER1.email + " / " + SELLER1.password);
  console.log("Seller 2: " + SELLER2.email + " / " + SELLER2.password);
}
main().catch((e) => { console.error("\nSEED ERROR:", e.message); process.exit(1); });