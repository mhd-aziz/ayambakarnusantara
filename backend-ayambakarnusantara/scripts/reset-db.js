// Reset data DB — jalankan: node scripts/reset-db.js
// Menghapus SELURUH data user + tabel, mempertahankan schema/RPC/RLS/bucket.
// Aman diulang (idempoten). Membutuhkan SUPABASE_SERVICE_ROLE_KEY di .env.dev
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env.dev") });
const { createClient } = require("@supabase/supabase-js");
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const TABLES = [
  "messages", "conversations", "chat_histories", "notifications", "ratings",
  "orders", "carts", "products", "shops", "feedback", "transactions", "profiles",
];
const BUCKETS = ["product-images", "shop-banners", "profile-images", "orders", "chat-images"];

async function deleteAll(table) {
  // Hapus semua baris. Supabase butuh filter; gunakan id != uuid-nol.
  const { error } = await c.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  return error;
}

async function emptyBucketRecursive(bucket, prefix = "") {
  const { data, error } = await c.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) { console.log(`  bucket ${bucket}${prefix}: ERR ${error.message}`); return; }
  const files = (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder");
  const filePaths = files.filter((f) => !f.id).map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
  const folderPaths = files.filter((f) => f.id).map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
  if (filePaths.length) {
    const { error: rErr } = await c.storage.from(bucket).remove(filePaths);
    if (rErr) console.log(`  bucket ${bucket}: remove ERR ${rErr.message}`);
  }
  for (const folder of folderPaths) await emptyBucketRecursive(bucket, folder);
}

async function main() {
  console.log("=== RESET DATA ===");
  for (const t of TABLES) {
    const err = await deleteAll(t);
    console.log(`  ${t}: ${err ? "ERR " + err.message : "ok"}`);
  }
  const { data: users } = await c.auth.admin.listUsers({ perPage: 1000 });
  let del = 0;
  for (const u of users?.users || []) {
    const { error } = await c.auth.admin.deleteUser(u.id);
    if (!error) del++; else console.log("  del user ERR:", u.email, error.message);
  }
  console.log(`  auth users dihapus: ${del}`);
  for (const b of BUCKETS) {
    await emptyBucketRecursive(b);
    console.log(`  bucket ${b}: dibersihkan`);
  }
  console.log("=== VERIFIKASI ===");
  for (const t of [...TABLES]) {
    const { count } = await c.from(t).select("count", { count: "exact", head: true });
    console.log(`  ${t}: ${count}`);
  }
  const { data: u2 } = await c.auth.admin.listUsers({ perPage: 1000 });
  console.log(`  auth users: ${u2?.users?.length || 0}`);
  console.log("=== RESET SELESAI ===");
}
main().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });