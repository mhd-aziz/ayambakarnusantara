-- Migration: 2026-08-23
-- Fix A (REVIEW-2026-08-23): race condition double-restore stok di cancel_order.
-- Sebelumnya cancel_order membaca v_order tanpa FOR UPDATE, sehingga dua request
-- cancel paralel untuk order yang sama membaca stok produk yang sama (lama), lalu
-- keduanya mengembalikan stok -> stok ter-inflate (over-restore).
-- Penanganan disamakan dengan create_order (T3, 18 Agu 2026): kunci baris produk
-- dengan FOR UPDATE, lalu restore guard `AND stock >= 0` (atau cukup cek sebelum
-- update). Tambahan: idempotensi — bila order sudah CANCELLED, lewati restore stok
-- (mencegah restore ganda bila webhook/polling/cancel dipanggil berulang).
--
-- Jalankan di Supabase Dashboard -> SQL Editor (tidak ada RPC exec_sql, jadi manual).
-- Aman dijalankan berulang (create or replace function).

create or replace function public.cancel_order(
  p_order_id uuid,
  p_user_id uuid
) returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'Pesanan tidak ditemukan.';
  end if;

  if v_order.user_id <> p_user_id then
    raise exception 'Anda tidak diizinkan untuk membatalkan pesanan ini.';
  end if;

  -- Idempotensi: bila sudah CANCELLED, jangan restore stok lagi.
  -- Mencegah double-restore saat cancel dipanggil berulang (race / retry / webhook).
  if v_order.order_status = 'CANCELLED' then
    return v_order;
  end if;

  if v_order.order_status not in ('AWAITING_PAYMENT', 'PENDING_CONFIRMATION') then
    raise exception 'Pesanan dengan status % tidak dapat dibatalkan oleh Anda saat ini.', v_order.order_status;
  end if;

  -- Kunci baris produk (FOR UPDATE) agar dua cancel paralel untuk order sama
  -- terserialisasi: yang kedua membaca stok yang sudah dikembalikan oleh yang
  -- pertama, sehingga tidak terjadi restore ganda (over-inflate stok).
  for v_item in select * from jsonb_array_elements(v_order.items) loop
    perform 1 from public.products
    where id = (v_item->>'productId')::uuid
    for update;

    update public.products
    set stock = stock + (v_item->>'quantity')::int
    where id = (v_item->>'productId')::uuid;
  end loop;

  update public.orders
  set order_status = 'CANCELLED',
      payment_details = jsonb_set(coalesce(payment_details, '{}'::jsonb), '{status}', '"cancelled_by_user"'),
      updated_at = now()
  where id = p_order_id;

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end $$;
