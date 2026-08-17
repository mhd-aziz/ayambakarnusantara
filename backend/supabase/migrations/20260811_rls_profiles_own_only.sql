-- Migration: 2026-08-11
-- M3 — Ubah RLS profiles_select dari publik menjadi own-only.
-- Alasan: email/telepon/alamat user lain seharusnya tidak terbaca via anon key.
-- Backend tetap berfungsi karena memakai supabaseAdmin (service role, bypass RLS).
-- Jalankan di Supabase Dashboard → SQL Editor (tidak ada RPC exec_sql, jadi harus manual).

drop policy if exists "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select
  using (auth.uid() = id);