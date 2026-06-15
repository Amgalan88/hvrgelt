-- ============================================================
--  hvrgelt — Supabase schema
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

-- ---- Order дугаарын дараалал (1002-оос эхэлнэ) -------------
create sequence if not exists order_seq start 1002;

-- ---- Operators --------------------------------------------
create table if not exists operators (
  id          text primary key,
  name        text not null,
  username    text not null,
  password    text not null,
  phone       text not null,
  auth_method text not null default 'password',
  auth_key    text not null,
  created_at  text not null,
  active      boolean not null default true
);

-- ---- Couriers ---------------------------------------------
create table if not exists couriers (
  id               text primary key,
  name             text not null,
  username         text not null,
  password         text not null,
  phone            text not null,
  auth_method      text not null default 'password',
  auth_key         text not null,
  vehicle          text not null,
  available        boolean not null default true,
  rating           numeric not null default 5.0,
  total_deliveries integer not null default 0,
  today_deliveries integer not null default 0,
  created_at       text not null,
  active           boolean not null default true
);

-- ---- Customers --------------------------------------------
create table if not exists customers (
  id          text primary key,
  name        text not null,
  phone       text not null,
  auth_method text not null,
  auth_key    text not null,
  addresses   jsonb not null default '[]'::jsonb,
  created_at  text not null
);

-- ---- Orders -----------------------------------------------
create table if not exists orders (
  id             text primary key default nextval('order_seq')::text,
  from_address   text not null,
  to_address     text not null,
  from_detail    text not null,
  to_detail      text not null,
  package_note   text not null default '',
  price          integer not null default 0,
  distance       numeric not null default 0,
  status         text not null default 'шинэ',
  created_at     text not null,
  courier_id     text,
  courier_name   text,
  courier_phone  text,
  eta            text,
  customer_name  text not null,
  customer_phone text not null,
  customer_id    text not null,
  assigned_at    text,
  picked_up_at   text,
  delivered_at   text,
  inserted_at    timestamptz not null default now()
);

-- ============================================================
--  Realtime — orders, couriers хүснэгтийг real-time болгох
-- ============================================================
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table couriers;

-- ============================================================
--  RLS — ЭНЭ нь ДЕМО зориулалттай (anon бүрэн эрхтэй).
--  Production-д Supabase Auth + хатуу policy хийх ёстой.
-- ============================================================
alter table operators enable row level security;
alter table couriers  enable row level security;
alter table customers enable row level security;
alter table orders    enable row level security;

create policy "demo_all_operators" on operators for all using (true) with check (true);
create policy "demo_all_couriers"  on couriers  for all using (true) with check (true);
create policy "demo_all_customers" on customers for all using (true) with check (true);
create policy "demo_all_orders"    on orders    for all using (true) with check (true);

-- ============================================================
--  Seed data — ЗОРИУДААР ХООСОН (бодит өгөгдөл ашиглана).
--  Оператор/жолоочдыг superadmin-ээр нэвтэрч өөрөө үүсгэнэ.
--    Супер админ — утас: 99739959   нууц үг: gegee0011
--    (программ дотор тодорхойлогдсон, DB-д хадгалах шаардлагагүй)
-- ============================================================
