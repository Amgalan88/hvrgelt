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
--  Seed data — анхны оператор / жолооч / захиалга
-- ============================================================
insert into operators (id, name, username, password, phone, auth_method, auth_key, created_at, active) values
  ('op1', 'Д. Дэлгэрмаа',  'delgermaa',    'op2024', '99110001', 'pin', '1234', '2024-01-10', true),
  ('op2', 'Б. Наранцэцэг', 'narantsetseg', 'op2024', '99220002', 'pin', '5678', '2024-02-14', true)
on conflict (id) do nothing;

insert into couriers (id, name, username, password, phone, auth_method, auth_key, vehicle, available, rating, total_deliveries, today_deliveries, created_at, active) values
  ('cr1', 'Б. Мөнхбат',   'munkh',     'cr2024', '99112233', 'pin',     '1111',     'мотоцикл',  true,  4.9, 1240, 8,  '2023-06-01', true),
  ('cr2', 'Д. Эрдэнэ',    'erdene',    'cr2024', '99223344', 'pin',     '2222',     'автомашин', true,  4.7, 876,  5,  '2023-08-15', true),
  ('cr3', 'О. Батжаргал', 'batjargal', 'cr2024', '99334455', 'pattern', '01345678', 'дугуй',     false, 4.8, 2103, 12, '2023-03-20', true),
  ('cr4', 'Н. Солонго',   'solongo',   'cr2024', '99445566', 'pin',     '4444',     'мопед',     true,  4.6, 523,  3,  '2024-04-05', true)
on conflict (id) do nothing;

insert into orders (id, from_address, to_address, from_detail, to_detail, package_note, price, distance, status, created_at, customer_name, customer_phone, customer_id) values
  ('1000', 'Сүхбаатар дүүрэг', 'Хан-Уул дүүрэг', '1-р хороо, Энхтайваны өргөн чөлөө 15', '15-р хороо, Зайсан тойрог', 'Бичиг баримт', 12000, 14, 'шинэ', '13:42', 'Э. Батцэцэг', '9955-6677', 'cu1')
on conflict (id) do nothing;

-- Супер админ: программ дотор шууд тодорхойлогдсон (DB-д хадгалах шаардлагагүй)
--   утас: 99739959   нууц үг: gegee0011
