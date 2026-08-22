-- Migration: 2026-08-23 (Fix #16)
-- Payment status audit trail + refund support.
-- Tambah tabel payment_status_history untuk mencatat setiap transisi status pembayaran
-- + kolom refunded_at, refund_reason di orders untuk soft-refund tracking.

-- 1. Tabel audit trail status pembayaran
create table if not exists public.payment_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  source text not null, -- 'MIDTRANS_WEBHOOK', 'MANUAL_REFUND', 'SELLER_ACTION', 'SYSTEM'
  details jsonb, -- {midtransTransactionId?, refundReason?, actorUid?}
  created_at timestamptz not null default now()
);
create index if not exists payment_status_history_order_id_idx
  on public.payment_status_history(order_id);
create index if not exists payment_status_history_created_at_idx
  on public.payment_status_history(created_at);

-- 2. Kolom refund di orders (soft tracking, tidak mengubah state machine order_status)
alter table public.orders
  add column if not exists refunded_at timestamptz,
  add column if not exists refund_reason text,
  add column if not exists refund_amount numeric(12,2);

-- 3. Trigger auto-log saat payment_details->>'status' berubah (via webhook Midtrans)
-- Kita tidak bisa trigger di payment_details JSONB langsung; logging dilakukan
-- manual di paymentController.handlePaymentNotification & endpoint refund.
-- Fungsi helper untuk insert audit:
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

-- 4. RLS untuk payment_status_history
alter table public.payment_status_history enable row level security;

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
      join public.products p on p.id = any(
        select jsonb_array_elements(o.items)->>'productId' 
      )::uuid
      where o.id = payment_status_history.order_id
      and p.shop_id in (
        select shop_id from public.profiles where id = auth.uid()
      )
    )
  );

create policy "payment_status_history_insert_service"
  on public.payment_status_history for insert
  with check (true); -- dipanggil via service role (webhook/refund endpoint)

-- 5. Update view v_order jika perlu (untuk include refund info)
-- v_order sudah di order-functions.sql; tidak perlu diubah.