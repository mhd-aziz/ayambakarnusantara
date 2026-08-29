const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envDir = path.join(__dirname, "../..");
require("dotenv").config({ path: path.join(envDir, ".env") });
const envFile =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
require("dotenv").config({
  path: path.join(envDir, envFile),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error(
    "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY belum diset di .env"
  );
  process.exit(1);
}

// Admin client: service role (bypass RLS) untuk semua operasi server-side
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client: untuk alur auth publik (sign in dengan password, dll)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(
  "Supabase initialized successfully (Admin + Anon clients)."
);

module.exports = { supabaseAdmin, supabaseAnon, supabaseUrl };
