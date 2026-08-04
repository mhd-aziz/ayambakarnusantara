-- ============================================================================
-- FUNGSI RATING (atomik, transaksional) — pengganti firestore.runTransaction
-- Dipanggil backend via supabase.rpc(). Alur bisnis IDENTIK dengan kode lama.
-- ============================================================================

-- Kolom denormalisasi nama/photo user (seperti Firestore lama: rating menyimpan
-- userDisplayName & userPhotoURL saat dibuat)
alter table public.ratings
  add column if not exists user_display_name text,
  add column if not exists user_photo_url text;

-- ----------------------------------------------------------------------------
-- add_rating: validasi order → anti-dobel → insert → update agregat produk & toko
-- ----------------------------------------------------------------------------
create or replace function public.add_rating(
  p_user_id uuid,
  p_product_id uuid,
  p_order_id uuid,
  p_rating_value int,
  p_review_text text default null
) returns public.ratings
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_user public.profiles%rowtype;
  v_rating public.ratings;
begin
  -- 1. Order harus ada
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan dengan ID % tidak ditemukan.', p_order_id;
  end if;

  -- 2. Order milik user ini
  if v_order.user_id <> p_user_id then
    raise exception 'Anda tidak berhak memberi rating untuk pesanan ini.';
  end if;

  -- 3. Produk harus ada di dalam pesanan
  if not exists (
    select 1 from jsonb_array_elements(v_order.items) it
    where it->>'productId' = p_product_id::text
  ) then
    raise exception 'Produk dengan ID % tidak ditemukan dalam pesanan ini.', p_product_id;
  end if;

  -- 4. Hanya order COMPLETED / DELIVERED
  if v_order.order_status not in ('COMPLETED', 'DELIVERED') then
    raise exception 'Anda hanya bisa memberi rating untuk pesanan yang sudah COMPLETED atau DELIVERED.';
  end if;

  -- 5. Anti dobel (1x per user + produk + order)
  if exists (
    select 1 from public.ratings
    where user_id = p_user_id and product_id = p_product_id and order_id = p_order_id
  ) then
    raise exception 'Anda sudah memberikan rating untuk produk ini dari pesanan ini.';
  end if;

  -- 6. Produk & toko valid
  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception 'Produk yang ingin dirating tidak ditemukan.';
  end if;

  if not exists (select 1 from public.shops where id = v_product.shop_id) then
    raise exception 'Produk tidak memiliki informasi toko.';
  end if;

  -- 7. Profil user (untuk denormalisasi nama tampilan)
  select * into v_user from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Profil pengguna tidak ditemukan.';
  end if;

  -- 8. Simpan rating
  insert into public.ratings
    (user_id, product_id, shop_id, order_id, rating_value, review_text,
     user_display_name, user_photo_url)
  values
    (p_user_id, p_product_id, v_product.shop_id, p_order_id, p_rating_value, p_review_text,
     coalesce(v_user.display_name, 'Pengguna Anonim'), v_user.photo_url)
  returning * into v_rating;

  -- 9. Update agregat produk
  update public.products set
    sum_of_ratings = sum_of_ratings + p_rating_value,
    total_ratings   = total_ratings + 1,
    average_rating  = round((sum_of_ratings + p_rating_value)::numeric / (total_ratings + 1), 2)
  where id = p_product_id;

  -- 10. Update agregat toko
  update public.shops set
    sum_of_ratings = sum_of_ratings + p_rating_value,
    total_ratings   = total_ratings + 1,
    average_rating  = round((sum_of_ratings + p_rating_value)::numeric / (total_ratings + 1), 2)
  where id = v_product.shop_id;

  return v_rating;
end $$;

-- ----------------------------------------------------------------------------
-- update_rating: koreksi nilai → sesuaikan agregat produk & toko
-- ----------------------------------------------------------------------------
create or replace function public.update_rating(
  p_rating_id uuid,
  p_user_id uuid,
  p_rating_value int,
  p_review_text text default null
) returns public.ratings
language plpgsql security definer set search_path = public
as $$
declare
  v_rating public.ratings%rowtype;
  v_diff int;
begin
  select * into v_rating from public.ratings where id = p_rating_id;
  if not found then
    raise exception 'Rating tidak ditemukan.';
  end if;

  if v_rating.user_id <> p_user_id then
    raise exception 'Anda tidak berhak mengubah rating ini.';
  end if;

  v_diff := p_rating_value - v_rating.rating_value;

  update public.products set
    sum_of_ratings = sum_of_ratings + v_diff,
    average_rating = case
      when total_ratings > 0 then round((sum_of_ratings + v_diff)::numeric / total_ratings, 2)
      else 0 end
  where id = v_rating.product_id;

  update public.shops set
    sum_of_ratings = sum_of_ratings + v_diff,
    average_rating = case
      when total_ratings > 0 then round((sum_of_ratings + v_diff)::numeric / total_ratings, 2)
      else 0 end
  where id = v_rating.shop_id;

  update public.ratings set
    rating_value = p_rating_value,
    review_text  = coalesce(p_review_text, review_text),
    updated_at   = now()
  where id = p_rating_id
  returning * into v_rating;

  return v_rating;
end $$;

-- ----------------------------------------------------------------------------
-- delete_rating: hapus → kurangi agregat produk & toko
-- ----------------------------------------------------------------------------
create or replace function public.delete_rating(
  p_rating_id uuid,
  p_user_id uuid
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_rating public.ratings%rowtype;
begin
  select * into v_rating from public.ratings where id = p_rating_id;
  if not found then
    raise exception 'Rating tidak ditemukan.';
  end if;

  if v_rating.user_id <> p_user_id then
    raise exception 'Anda tidak berhak menghapus rating ini.';
  end if;

  update public.products set
    sum_of_ratings = greatest(0, sum_of_ratings - v_rating.rating_value),
    total_ratings   = greatest(0, total_ratings - 1),
    average_rating  = case
      when total_ratings - 1 > 0
        then round((sum_of_ratings - v_rating.rating_value)::numeric / (total_ratings - 1), 2)
      else 0 end
  where id = v_rating.product_id;

  update public.shops set
    sum_of_ratings = greatest(0, sum_of_ratings - v_rating.rating_value),
    total_ratings   = greatest(0, total_ratings - 1),
    average_rating  = case
      when total_ratings - 1 > 0
        then round((sum_of_ratings - v_rating.rating_value)::numeric / (total_ratings - 1), 2)
      else 0 end
  where id = v_rating.shop_id;

  delete from public.ratings where id = p_rating_id;
end $$;
