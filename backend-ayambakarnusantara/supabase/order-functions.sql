-- ============================================================================
-- CREATE_ORDER (atomik) — pengganti batch Firestore di createOrder.
-- Validasi keranjang & stok → insert order → kurangi stok → kosongkan cart.
-- ============================================================================
create or replace function public.create_order(
  p_user_id uuid,
  p_payment_method text,
  p_notes text default null
) returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_cart public.carts%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_order_items jsonb := '[]'::jsonb;
  v_total numeric(12,2) := 0;
  v_shop_ids uuid[] := '{}'::uuid[];
  v_order public.orders;
  v_upper_method text;
  v_initial_status text;
  v_payment_details jsonb;
begin
  -- 1. Keranjang harus ada & tidak kosong
  select * into v_cart from public.carts where user_id = p_user_id;
  if not found or v_cart.items is null or jsonb_array_length(coalesce(v_cart.items, '[]'::jsonb)) = 0 then
    raise exception 'Keranjang Anda kosong. Tidak dapat membuat pesanan.';
  end if;

  -- 2. Validasi tiap item: produk ada, stok cukup, hitung ulang total
  for v_item in select * from jsonb_array_elements(v_cart.items) loop
    select * into v_product
    from public.products
    where id = (v_item->>'productId')::uuid;

    if not found then
      raise exception 'Produk dengan ID % (%) tidak ditemukan lagi. Harap hapus dari keranjang Anda.', v_item->>'productId', v_item->>'name';
    end if;

    if v_product.stock < (v_item->>'quantity')::int then
      raise exception 'Stok untuk produk % tidak mencukupi. Sisa stok: %, diminta: %.', v_product.name, v_product.stock, v_item->>'quantity';
    end if;

    if v_product.shop_id is not null then
      v_shop_ids := array_append(v_shop_ids, v_product.shop_id);
    end if;

    v_order_items := v_order_items || jsonb_build_object(
      'productId', v_item->>'productId',
      'shopId', v_item->>'shopId',
      'name', v_item->>'name',
      'price', (v_item->>'price')::numeric,
      'quantity', (v_item->>'quantity')::int,
      'productImageURL', v_item->>'productImageURL',
      'subtotal', ((v_item->>'price')::numeric * (v_item->>'quantity')::int)
    );

    v_total := v_total + (v_item->>'price')::numeric * (v_item->>'quantity')::int;
  end loop;

  -- 3. Tentukan status awal sesuai metode pembayaran
  v_upper_method := upper(coalesce(p_payment_method, ''));
  if v_upper_method = 'PAY_AT_STORE' then
    v_initial_status := 'PENDING_CONFIRMATION';
    v_payment_details := jsonb_build_object(
      'method', p_payment_method,
      'status', 'pay_on_pickup',
      'gatewayTransactionId', null,
      'gatewayAssignedOrderId', null,
      'gatewaySnapToken', null,
      'gatewayRedirectUrl', null
    );
  elsif v_upper_method = 'ONLINE_PAYMENT' then
    v_initial_status := 'AWAITING_PAYMENT';
    v_payment_details := jsonb_build_object(
      'method', p_payment_method,
      'status', 'awaiting_gateway_interaction',
      'gatewayTransactionId', null,
      'gatewayAssignedOrderId', null,
      'gatewaySnapToken', null,
      'gatewayRedirectUrl', null
    );
  else
    raise exception 'Metode pembayaran tidak valid. Gunakan PAY_AT_STORE atau ONLINE_PAYMENT.';
  end if;

  -- 4. Insert order
  insert into public.orders
    (user_id, items, total_price, payment_method, order_status, payment_details, notes, shop_ids)
  values
    (p_user_id, v_order_items, v_total, v_upper_method, v_initial_status, v_payment_details, p_notes, v_shop_ids)
  returning * into v_order;

  -- 5. Kurangi stok tiap produk
  for v_item in select * from jsonb_array_elements(v_cart.items) loop
    update public.products
    set stock = stock - (v_item->>'quantity')::int
    where id = (v_item->>'productId')::uuid;
  end loop;

  -- 6. Kosongkan keranjang
  update public.carts
  set items = '[]'::jsonb, updated_at = now()
  where user_id = p_user_id;

  return v_order;
end $$;

-- ----------------------------------------------------------------------------
-- CANCEL_ORDER (atomik) — pengganti batch Firestore di cancelOrder.
-- Set status CANCELLED + paymentDetails.status cancelled_by_user + restore stok.
-- ----------------------------------------------------------------------------
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

  if v_order.order_status not in ('AWAITING_PAYMENT', 'PENDING_CONFIRMATION') then
    raise exception 'Pesanan dengan status % tidak dapat dibatalkan oleh Anda saat ini.', v_order.order_status;
  end if;

  update public.orders
  set order_status = 'CANCELLED',
      payment_details = jsonb_set(coalesce(payment_details, '{}'::jsonb), '{status}', '"cancelled_by_user"'),
      updated_at = now()
  where id = p_order_id;

  -- Restore stok
  for v_item in select * from jsonb_array_elements(v_order.items) loop
    update public.products
    set stock = stock + (v_item->>'quantity')::int
    where id = (v_item->>'productId')::uuid;
  end loop;

  select * into v_order from public.orders where id = p_order_id;
  return v_order;
end $$;
