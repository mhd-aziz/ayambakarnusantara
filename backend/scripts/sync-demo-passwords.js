#!/usr/bin/env node
// Sinkronisasi password akun demo agar konsisten dengan .env.dev (gitignored).
// - Tambah DEMO_*_PASSWORD ke .env.dev bila belum ada (generate acak kuat, 20 char alnum).
// - Set password ke masing-masing auth user demo via admin API (idempoten).
require("dotenv").config({ path: __dirname + "/../.env" });
require("dotenv").config({ path: __dirname + "/../.env.dev", override: true });
const fs = require("fs");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const envFile = __dirname + "/../.env.dev";
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const needs = [
  ["DEMO_CUSTOMER_PASSWORD", "siti.aulia.demo@example.com"],
  ["DEMO_SELLER1_PASSWORD", "budi.santoso.demo@example.com"],
  ["DEMO_SELLER2_PASSWORD", "rina.maharani.demo@example.com"],
];

const gen = () => crypto.randomBytes(15).toString("base64url").slice(0, 20);

// 1) Pastikan key ada di .env.dev
let env = fs.readFileSync(envFile, "utf8");
const newLines = [];
for (const [key, email] of needs) {
  if (process.env[key] && !env.includes(key + "=")) {
    newLines.push(`\n# === Demo seed (dipakai test & seed, sinkron dgn DB) ===`);
    newLines.push(`${key}=${process.env[key]}`);
  }
  if (!env.includes(key + "=")) {
    const p = gen();
    newLines.push(`\n${key}=${p}`);
    process.env[key] = p;
  }
}
if (newLines.length) {
  fs.appendFileSync(envFile, newLines.join("\n"));
  console.log("Ok: .env.dev ditambahkan DEMO_*_PASSWORD (gitignored).");
}

// 2) Set password ke auth user demo
(async () => {
  const { data: users, error } = await sb.auth.admin.listUsers();
  if (error) throw new Error("listUsers: " + error.message);
  let updated = 0;
  for (const [key, email] of needs) {
    const u = users.users.find((x) => x.email === email);
    if (!u) { console.log(`SKIP (user tak ditemukan): ${email}`); continue; }
    const pw = process.env[key];
    const { error: e } = await sb.auth.admin.updateUserById(u.id, { password: pw });
    if (e) { console.log(`ERR update ${email}: ${e.message}`); continue; }
    updated++;
    console.log(`✓ password set: ${email}  (len=${pw.length})`);
  }
  console.log(`Sinkron selesai: ${updated}/${needs.length} dipassword-reset ke env .env.dev`);
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });