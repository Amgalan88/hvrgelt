-- ============================================================
--  hvrgelt — Migration 22: DB-г хаах (RLS — хэн юу хийж болох)
--  Supabase Dashboard → SQL Editor → хуулж RUN дарна.
-- ============================================================
--
--  ⚠️ ДАРААЛАЛ: эхлээд нэвтрэлтийн шинэ хувилбар (api/auth.ts) ажиллаж,
--  та өөрөө утсаараа нэвтэрч чадаж байгааг шалгасны ДАРАА ажиллуулна.
--  Асуудал гарвал 22_rollback.sql-ээр буцаана.
--
--  Хэрэглэгч бүр нэвтрэхэд api/auth.ts Supabase session үүсгэдэг —
--  JWT-ийн app_metadata.app_role, app_metadata.account_id-ээр таньна.
--  Session-гүй (anon) хүн зөвхөн тохиргоо, газрын жагсаалт, бараа уншина.
--
--  • PIN, нууц үг (auth_key, password) — хэнд ч уншигдахгүй (зөвхөн сервер)
--  • Үнэмлэхний зураг, дугаар — зөвхөн админ ба тухайн хүргэгч
--  • Захиалагч өөрийн захиалгыг л харна, үнэ/төлбөрийг өөрчилж чадахгүй
--  • Хүргэгч: өөрийнх + хүргэгч хайж буй захиалга; «Авах»-аар л өөртөө авна
--  • Төлбөрийн төлөвийг зөвхөн сервер (Byl webhook) эсвэл оператор тавина
-- ============================================================

-- ── Туслах функцууд ──────────────────────────────────────────────
create or replace function public.app_role() returns text
language sql stable as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'app_role', '') $$;

create or replace function public.app_uid() returns text
language sql stable as $$ select coalesce(auth.jwt() -> 'app_metadata' ->> 'account_id', '') $$;

create or replace function public.is_staff() returns boolean
language sql stable as $$ select public.app_role() in ('operator', 'superadmin') $$;

create or replace function public.is_admin() returns boolean
language sql stable as $$ select public.app_role() = 'superadmin' $$;

-- ── Нэвтрэх оролдлогын хязгаар (зөвхөн сервер) ──────────────────
create table if not exists auth_attempts (
  phone        text primary key,
  count        integer not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
alter table auth_attempts enable row level security;

-- ── Хуучин "demo_all" бодлогуудыг устгана ───────────────────────
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'orders','couriers','operators','customers','partners','partner_products','payments',
      'order_ratings','feedback','settings','push_subscriptions','courier_locations')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table orders             enable row level security;
alter table couriers           enable row level security;
alter table operators          enable row level security;
alter table customers          enable row level security;
alter table partners           enable row level security;
alter table partner_products   enable row level security;
alter table payments           enable row level security;
alter table order_ratings      enable row level security;
alter table feedback           enable row level security;
alter table settings           enable row level security;
alter table push_subscriptions enable row level security;
alter table courier_locations  enable row level security;

-- ── Багана түвшний эрх: нууц баганыг хэнд ч уншуулахгүй ──────────
revoke select, insert, update on couriers  from anon, authenticated;
grant select (id, name, username, phone, auth_method, vehicle, available, rating, total_deliveries, today_deliveries,
              created_at, active, photo_url, license_class, license_expiry, car_photo_url, plate, verified_at, verified)
  on couriers to authenticated;
grant insert on couriers to authenticated;
grant update (name, username, phone, vehicle, available, rating, total_deliveries, today_deliveries, active,
              photo_url, license_photo_url, license_no, license_class, license_expiry, car_photo_url, plate, verified, verified_at)
  on couriers to authenticated;

revoke select, insert, update on operators from anon, authenticated;
grant select (id, name, username, phone, auth_method, created_at, active) on operators to authenticated;
grant insert on operators to authenticated;
grant update (name, username, phone, active) on operators to authenticated;

revoke select, insert, update on customers from anon, authenticated;
grant select (id, name, phone, auth_method, created_at, addresses, cargo_route, quick_orders) on customers to authenticated;
grant update (name, addresses, cargo_route, quick_orders) on customers to authenticated;

revoke select, update on partners from anon, authenticated;
grant select (id, name, category, emoji, address, detail, area, active, created_at, image, phone, auth_method, payment_qr_url, lat, lng)
  on partners to anon, authenticated;
grant update (name, category, emoji, address, detail, area, active, image, phone, payment_qr_url, lat, lng) on partners to authenticated;

-- Үнэмлэхний зураг, дугаар — админ бүгдийг, хүргэгч өөрийнхөө
create or replace function public.courier_private_docs()
returns table (id text, license_photo_url text, license_no text)
language sql stable security definer set search_path = public as $$
  select c.id, c.license_photo_url, c.license_no from couriers c
  where public.is_staff() or c.id = public.app_uid()
$$;
revoke all on function public.courier_private_docs() from public, anon;
grant execute on function public.courier_private_docs() to authenticated;

-- ── settings ─────────────────────────────────────────────────────
create policy settings_read  on settings for select using (true);
create policy settings_write on settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── partners, partner_products — газрын жагсаалт нийтэд ─────────
create policy partners_read   on partners for select using (true);
create policy partners_admin  on partners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy partners_self   on partners for update to authenticated using (id = public.app_uid()) with check (id = public.app_uid());

create policy products_read   on partner_products for select using (true);
create policy products_write  on partner_products for all to authenticated
  using (public.is_admin() or partner_id = public.app_uid())
  with check (public.is_admin() or partner_id = public.app_uid());

-- ── customers ────────────────────────────────────────────────────
create policy customers_read   on customers for select to authenticated using (public.is_staff() or id = public.app_uid());
create policy customers_self   on customers for update to authenticated using (id = public.app_uid()) with check (id = public.app_uid());
create policy customers_admin  on customers for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── operators ────────────────────────────────────────────────────
create policy operators_read  on operators for select to authenticated using (public.is_staff());
create policy operators_admin on operators for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── couriers — нэр, зураг, хэрэгсэл нь захиалагч, хүргэгчид харагдана ─
create policy couriers_read  on couriers for select to authenticated using (true);
create policy couriers_self  on couriers for update to authenticated using (id = public.app_uid()) with check (id = public.app_uid());
create policy couriers_staff on couriers for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- Хүргэгч өөрөө баталгаажуулалт, үнэлгээ, идэвхийг өөрчилж чадахгүй
create or replace function public.guard_courier_update() returns trigger
language plpgsql as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;
  if new.verified is distinct from old.verified and new.verified then
    raise exception 'Баталгаажуулалтыг зөвхөн админ хийнэ';
  end if;
  if new.active is distinct from old.active or new.rating is distinct from old.rating then
    raise exception 'Энэ талбарыг зөвхөн админ өөрчилнө';
  end if;
  return new;
end $$;
drop trigger if exists guard_courier_update on couriers;
create trigger guard_courier_update before update on couriers for each row execute function public.guard_courier_update();

-- ── orders ───────────────────────────────────────────────────────
create policy orders_staff    on orders for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy orders_customer on orders for select to authenticated using (customer_id = public.app_uid());
create policy orders_courier  on orders for select to authenticated using (
  public.app_role() = 'courier' and (courier_id = public.app_uid() or (status = 'жолооч хайж байна' and courier_id is null)));
create policy orders_partner  on orders for select to authenticated using (public.app_role() = 'partner' and partner_id = public.app_uid());
create policy orders_insert   on orders for insert to authenticated with check (public.app_role() = 'customer' and customer_id = public.app_uid());
create policy orders_cust_upd on orders for update to authenticated
  using (customer_id = public.app_uid()) with check (customer_id = public.app_uid());
create policy orders_cour_upd on orders for update to authenticated
  using (public.app_role() = 'courier' and (courier_id = public.app_uid() or (status = 'жолооч хайж байна' and courier_id is null)))
  with check (public.app_role() = 'courier' and courier_id = public.app_uid());

-- Үнэ, төлбөр, төлвийн шилжилтийг үүргээр нь хамгаална
create or replace function public.guard_order() returns trigger
language plpgsql as $$
declare
  t jsonb;
  base numeric; per_km numeric; incl numeric; km numeric; floor_price numeric;
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;

  if tg_op = 'INSERT' then
    if new.status not in ('шинэ', 'төлбөр хүлээж байна') then raise exception 'Буруу төлөв'; end if;
    if new.payment_status is not null and new.payment_status <> '' then raise exception 'Төлбөрийн төлөвийг сервер тавина'; end if;
    -- Шууд үнэ: шулуун зайгаар бодсон доод хязгаараас бага байж болохгүй
    if new.status = 'төлбөр хүлээж байна' then
      if new.from_lat is null or new.to_lat is null then raise exception 'Байршилгүй захиалгын үнийг оператор тавина'; end if;
      select value::jsonb into t from settings where key = 'tariff_goods';
      base   := coalesce((t ->> 'base')::numeric, 1500);
      per_km := coalesce((t ->> 'perKm')::numeric, 1500);
      incl   := coalesce((t ->> 'includedKm')::numeric, 0);
      km := 2 * 6371 * asin(sqrt(
              power(sin(radians(new.to_lat - new.from_lat) / 2), 2) +
              cos(radians(new.from_lat)) * cos(radians(new.to_lat)) * power(sin(radians(new.to_lng - new.from_lng) / 2), 2)));
      floor_price := (base + per_km * greatest(0, km - incl)) * 0.9;
      if new.price < floor_price then raise exception 'Үнэ буруу байна'; end if;
    end if;
    return new;
  end if;

  -- UPDATE: захиалагч, хүргэгч үнэ, төлбөр, захиалагчийг өөрчилж чадахгүй
  if new.price is distinct from old.price or new.distance is distinct from old.distance
     or new.payment_status is distinct from old.payment_status or new.payment_method is distinct from old.payment_method
     or new.paid_at is distinct from old.paid_at or new.customer_id is distinct from old.customer_id then
    raise exception 'Энэ талбарыг өөрчлөх эрхгүй';
  end if;

  if public.app_role() = 'customer' then
    if new.status is distinct from old.status and not (
         (old.status = 'үнэ батлах' and new.status = 'төлбөр хүлээж байна')
      or (new.status = 'цуцлагдсан' and old.status in ('шинэ', 'үнэ батлах', 'төлбөр хүлээж байна', 'жолооч хайж байна', 'томилогдсон'))
    ) then raise exception 'Төлвийг ингэж өөрчлөх боломжгүй'; end if;
    if new.courier_id is distinct from old.courier_id and new.status <> 'цуцлагдсан' then raise exception 'Хүргэгчийг оператор томилно'; end if;
  elsif public.app_role() = 'courier' then
    if new.status is distinct from old.status and not (
         (old.status = 'жолооч хайж байна' and new.status = 'томилогдсон' and old.courier_id is null and new.courier_id = public.app_uid())
      or (old.status = 'томилогдсон' and new.status = 'авсан')
      or (old.status = 'авсан' and new.status = 'хүргэгдсэн')
    ) then raise exception 'Төлвийг ингэж өөрчлөх боломжгүй'; end if;
  else
    raise exception 'Эрхгүй';
  end if;
  return new;
end $$;
drop trigger if exists guard_order on orders;
create trigger guard_order before insert or update on orders for each row execute function public.guard_order();

-- ── payments — сервер бичнэ; захиалагч өөрийнхийг харна ─────────
create policy payments_staff on payments for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy payments_own   on payments for select to authenticated
  using (exists (select 1 from orders o where o.id = payments.order_id and o.customer_id = public.app_uid()));

-- ── order_ratings ────────────────────────────────────────────────
create policy ratings_read   on order_ratings for select to authenticated using (true);
create policy ratings_insert on order_ratings for insert to authenticated with check (customer_id = public.app_uid());
create policy ratings_update on order_ratings for update to authenticated using (customer_id = public.app_uid()) with check (customer_id = public.app_uid());
create policy ratings_staff  on order_ratings for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── feedback — хэн ч илгээнэ, ажилтан уншина ────────────────────
create policy feedback_insert on feedback for insert with check (true);
create policy feedback_staff  on feedback for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ── push_subscriptions — өөрийн төхөөрөмж ───────────────────────
create policy push_own on push_subscriptions for all to authenticated
  using (user_id = public.app_uid() or (role = 'superadmin' and public.is_admin()))
  with check ((user_id = public.app_uid() and role = public.app_role()) or (role = 'superadmin' and public.is_admin()));

-- ── courier_locations — хүргэгч өөрийнхийг бичнэ ─────────────────
create policy locations_read  on courier_locations for select to authenticated using (true);
create policy locations_write on courier_locations for all to authenticated
  using (courier_id = public.app_uid()) with check (courier_id = public.app_uid() and public.app_role() = 'courier');

-- ── Апп-д "DB хаалттай" гэж мэдэгдэнэ — session-гүй хуучин нэвтрэлтийг дахин нэвтрүүлнэ ─
insert into settings (key, value) values ('auth_required', '1')
  on conflict (key) do update set value = '1';
