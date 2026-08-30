-- ============================================================================
-- AYAM BAKAR NUSANTARA — Schema Supabase (Postgres)
-- Pengganti Firestore collections. Acuan: DATA-MODEL.md & BUSINESS-FLOW.md
-- (dibuat dari pembacaan kode backend — TIDAK mengubah alur bisnis).
-- Cara pakai: SQL Editor di dashboard Supabase → paste → Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES — pengganti koleksi `users` (data profil di luar auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'customer' check (role in ('customer','seller')),
  phone_number text,
  address text,
  photo_url text,
  shop_id uuid, -- FK sirkular ke shops, ditambah setelah tabel shops dibuat
  fcm_tokens jsonb not null default '[]'::jsonb, -- token push (cadangan)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. SHOPS — pengganti koleksi `shops`
-- ----------------------------------------------------------------------------
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shop_name text not null,
  description text,
  shop_address text,
  banner_image_url text,
  sum_of_ratings numeric not null default 0,
  average_rating numeric not null default 0,
  total_ratings int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shops_user_id_idx on public.shops(user_id);
-- 1 akun 1 toko (cegah N toko via SQL langsung; aplikasi sudah 1:1 via profiles.shop_id)
create unique index if not exists shops_user_id_unique on public.shops(user_id);

-- FK sirkular: profiles.shop_id -> shops.id (diisi saat user buka toko)
alter table public.profiles
  add constraint profiles_shop_id_fkey
  foreign key (shop_id) references public.shops(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 3. PRODUCTS — pengganti koleksi `products`
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  owner_uid uuid, -- pemilik produk (denormalisasi dari shops.user_id, pola lama)
  name text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  category text check (category in ('Makanan','Minuman','Camilan')),
  product_image_url text,
  sum_of_ratings numeric not null default 0,
  average_rating numeric not null default 0,
  total_ratings int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_shop_id_idx on public.products(shop_id);
create index if not exists products_category_idx on public.products(category);

-- ----------------------------------------------------------------------------
-- 4. CARTS — 1 baris per user, items = array JSON (denormalisasi seperti Firestore)
-- ----------------------------------------------------------------------------
create table if not exists public.carts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 5. ORDERS — pengganti koleksi `orders` (status & metode PERSIS dari kode)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb, -- [{productId, shopId, name, price, quantity}]
  total_price numeric(12,2) not null check (total_price >= 0),
  payment_method text not null check (payment_method in ('ONLINE_PAYMENT','PAY_AT_STORE')),
  order_status text not null default 'AWAITING_PAYMENT'
    check (order_status in ('AWAITING_PAYMENT','PENDING_CONFIRMATION','CONFIRMED',
                            'PROCESSING','READY_FOR_PICKUP','COMPLETED','CANCELLED','PAYMENT_FAILED')),
  payment_details jsonb, -- {snapToken?, redirectUrl?, status?, paidAt?}
  notes text,
  shop_ids uuid[] not null default '{}', -- semua toko yang terlibat (multi-shop)
  refunded_at timestamptz,
  refund_reason text,
  refund_amount numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_shop_ids_idx on public.orders using gin(shop_ids);

-- ----------------------------------------------------------------------------
-- 6. RATINGS — pengganti koleksi `ratings` (anti-dobel: 1x per user+produk+order)
-- ----------------------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  shop_id uuid references public.shops(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  rating_value int not null check (rating_value between 1 and 5),
  review_text text,
  user_display_name text, -- denormalisasi nama pemberi rating (pola lama)
  user_photo_url text, -- denormalisasi foto pemberi rating (pola lama)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id, order_id)
);
create index if not exists ratings_product_id_idx on public.ratings(product_id);
create index if not exists ratings_shop_id_idx on public.ratings(shop_id);

-- ----------------------------------------------------------------------------
-- 7. CONVERSATIONS — chat 1-ke-1; id = gabungan UID peserta terurut (pola lama)
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id text primary key,
  participant_uids uuid[] not null,
  participant_info jsonb not null default '{}'::jsonb, -- {uid: {displayName, photoURL}} (object keyed by UID, sesuai chatController)
  last_message jsonb, -- {text, senderUID, timestamp, type}
  unread_counts jsonb not null default '{}'::jsonb, -- {uid: jumlahBelumDibaca}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 8. MESSAGES — pengganti koleksi `chatMessages`
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_uid uuid not null,
  type text not null default 'text' check (type in ('text','image','location')),
  text text,
  image_url text,
  location jsonb, -- {lat, lng}
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

-- ----------------------------------------------------------------------------
-- 9. NOTIFICATIONS — pengganti koleksi `notifications` (FCM + in-app)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text,
  data jsonb, -- {type: NEW_ORDER|ORDER_STATUS_UPDATE|ORDER_CANCELLED|PAYMENT_CONFIRMED|..., orderId?, conversationId?}
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_id_idx on public.notifications(user_id);

-- ----------------------------------------------------------------------------
-- 10. CHAT_HISTORIES — riwayat chatbot AI per user
-- ----------------------------------------------------------------------------
create table if not exists public.chat_histories (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chats jsonb not null default '[]'::jsonb, -- [{role, text, createdAt}]
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 11. FEEDBACK — masukan publik (tanpa auth, dari HomePage)
-- ----------------------------------------------------------------------------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  subject text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 12. TRANSACTIONS — catatan pembayaran Midtrans
-- ----------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount numeric(12,2),
  status text check (status in ('pending','settlement','capture','expire','cancel','deny')),
  snap_token text,
  redirect_url text,
  midtrans_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transactions_order_id_idx on public.transactions(order_id);

-- ============================================================================
-- TRIGGER: updated_at otomatis
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_shops_updated_at before update on public.shops
  for each row execute function public.set_updated_at();
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger trg_carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger trg_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();
create trigger trg_transactions_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger trg_chat_histories_updated_at before update on public.chat_histories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TRIGGER: buat baris profiles otomatis saat user signup (mirip behavior Firestore)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- Catatan: backend memakai service role (bypass RLS). Policy ini melindungi
-- akses langsung ke database (mis. anon key) — lapisan keamanan kedua.
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.products enable row level security;
alter table public.carts enable row level security;
alter table public.orders enable row level security;
alter table public.ratings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.chat_histories enable row level security;
alter table public.feedback enable row level security;
alter table public.transactions enable row level security;

-- PROFILES: hanya pemilik yang bisa baca datanya sendiri;
-- Backend memakai supabaseAdmin (service role, bypass RLS) untuk query lintas-user.
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- SHOPS: katalog publik; pemilik toko yang kelola
create policy "shops_select" on public.shops for select using (true);
create policy "shops_insert_own" on public.shops for insert
  with check (auth.uid() = user_id);
create policy "shops_update_own" on public.shops for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shops_delete_own" on public.shops for delete
  using (auth.uid() = user_id);

-- PRODUCTS: katalog publik; pemilik toko (via shops.user_id) yang kelola
create policy "products_select" on public.products for select using (true);
create policy "products_insert_owner" on public.products for insert
  with check (exists (
    select 1 from public.shops where shops.id = shop_id and shops.user_id = auth.uid()
  ));
create policy "products_update_owner" on public.products for update
  using (exists (
    select 1 from public.shops where shops.id = shop_id and shops.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.shops where shops.id = shop_id and shops.user_id = auth.uid()
  ));
create policy "products_delete_owner" on public.products for delete
  using (exists (
    select 1 from public.shops where shops.id = shop_id and shops.user_id = auth.uid()
  ));

-- CARTS: hanya pemilik cart
create policy "carts_select_own" on public.carts for select
  using (auth.uid() = user_id);
create policy "carts_insert_own" on public.carts for insert
  with check (auth.uid() = user_id);
create policy "carts_update_own" on public.carts for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "carts_delete_own" on public.carts for delete
  using (auth.uid() = user_id);

-- ORDERS: pembeli lihat pesanan sendiri; penjual lihat pesanan tokonya (via shop_ids)
create policy "orders_select_own" on public.orders for select
  using (auth.uid() = user_id or auth.uid() in (
    select user_id from public.shops where shops.id = any(orders.shop_ids)
  ));
create policy "orders_insert_own" on public.orders for insert
  with check (auth.uid() = user_id);

-- RATINGS: publik baca; tulis hanya pemilik rating
create policy "ratings_select" on public.ratings for select using (true);
create policy "ratings_insert_own" on public.ratings for insert
  with check (auth.uid() = user_id);
create policy "ratings_update_own" on public.ratings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ratings_delete_own" on public.ratings for delete
  using (auth.uid() = user_id);

-- CONVERSATIONS: hanya peserta chat
create policy "conversations_select_participant" on public.conversations for select
  using (auth.uid() = any(participant_uids));
create policy "conversations_insert_participant" on public.conversations for insert
  with check (auth.uid() = any(participant_uids));
create policy "conversations_update_participant" on public.conversations for update
  using (auth.uid() = any(participant_uids)) with check (auth.uid() = any(participant_uids));

-- MESSAGES: hanya peserta conversation
create policy "messages_select_participant" on public.messages for select
  using (exists (
    select 1 from public.conversations
    where conversations.id = conversation_id and auth.uid() = any(participant_uids)
  ));
create policy "messages_insert_participant" on public.messages for insert
  with check (exists (
    select 1 from public.conversations
    where conversations.id = conversation_id and auth.uid() = any(participant_uids)
  ));

-- NOTIFICATIONS: hanya pemilik notifikasi
create policy "notifications_select_own" on public.notifications for select
  using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CHAT_HISTORIES: hanya pemilik riwayat
create policy "chat_histories_select_own" on public.chat_histories for select
  using (auth.uid() = user_id);
create policy "chat_histories_insert_own" on public.chat_histories for insert
  with check (auth.uid() = user_id);
create policy "chat_histories_update_own" on public.chat_histories for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FEEDBACK: siapa pun bisa isi (publik); tidak bisa baca via anon
create policy "feedback_insert_public" on public.feedback for insert
  with check (true);

-- TRANSACTIONS: hanya backend (service role) yang sentuh
create policy "transactions_select_own" on public.transactions for select
  using (exists (
    select 1 from public.orders
    where orders.id = order_id and (orders.user_id = auth.uid() or auth.uid() in (
      select user_id from public.shops where shops.id = any(orders.shop_ids)
    ))
  ));

-- ----------------------------------------------------------------------------
-- 13. PAYMENT_STATUS_HISTORY — audit trail status pembayaran (merge dari
--     migration 20260823_payment_audit_refund.sql agar fresh DB lengkap)
-- ----------------------------------------------------------------------------
create table if not exists public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  source text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists payment_status_history_order_id_idx
  on public.payment_status_history(order_id);
create index if not exists payment_status_history_created_at_idx
  on public.payment_status_history(created_at);

create or replace function public.log_payment_status_change(
  p_order_id uuid,
  p_old_status text,
  p_new_status text,
  p_source text,
  p_details jsonb
) returns void language plpgsql as $$
begin
  insert into public.payment_status_history (order_id, old_status, new_status, source, details)
  values (p_order_id, p_old_status, p_new_status, p_source, p_details);
end $$;

alter table public.payment_status_history enable row level security;

drop policy if exists "payment_status_history_select_own" on public.payment_status_history;
create policy "payment_status_history_select_own"
  on public.payment_status_history for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payment_status_history.order_id
      and o.user_id = auth.uid()
    )
    or exists (
      select 1 from public.orders o
      where o.id = payment_status_history.order_id
      and exists (
        select 1 from public.shops s
        where s.id = any(o.shop_ids) and s.user_id = auth.uid()
      )
    )
  );

drop policy if exists "payment_status_history_insert_service" on public.payment_status_history;
create policy "payment_status_history_insert_service"
  on public.payment_status_history for insert
  with check (true);
