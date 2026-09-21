-- ============================================================
--  hvrgelt — Бүх шинэ migration нэг дор (11 → 17)
--
--  Юу нэмэгдэх вэ:
--    11. Захиалгын үйлчилгээний төрөл
--    12. Жолоочийн баримт бичиг + баталгаажуулалт
--    13. Үйлчилгээний дэд төрөл + ачааны мэдээлэл
--    14. Онлайн төлбөр (payments)
--    15. Хүргэлтийн дараах 1–5 оддын үнэлгээ
--    16. Санал хүсэлт
--    17. Партнёрын бараа, сагс, газрын төлбөрийн QR
--
--  Хэрхэн ажиллуулах:
--    Supabase Dashboard → SQL Editor → New query →
--    энэ файлыг БҮХЭЛД НЬ хуулж тавиад RUN дарна.
--
--  ✅ Дахин дахин ажиллуулахад аюулгүй — байгаа багана, хүснэгт,
--     бодлогыг давхардуулахгүй.
--
--  Урьдчилсан нөхцөл: supabase_schema.sql болон migration 1–10
--  аль хэдийн ажилласан байх ёстой (orders, couriers, partners,
--  customers, operators, settings, push_subscriptions хүснэгтүүд).
--
--  Migration 18 (утасны дугаарын нууцлал) нь ЭНД ОРООГҮЙ — тэр нь
--  Supabase Auth руу шилжсэний дараа ажиллуулах заавар тул
--  supabase_migration_18.sql-ыг тусад нь үзнэ үү.
-- ============================================================

begin;

-- ============================================================
--  11. Захиалгын үйлчилгээний төрөл
-- ============================================================

alter table orders add column if not exists service_id text;
create index if not exists orders_service_id_idx on orders (service_id);


-- ============================================================
--  12. Жолоочийн баримт бичиг
--  Үйлчлүүлэгчид харагдах 5 мэдээлэл: цээж зураг, жолооны үнэмлэх,
--  машины зураг, улсын дугаар, утасны дугаар.
-- ============================================================

alter table couriers add column if not exists photo_url         text;
alter table couriers add column if not exists license_photo_url text;
alter table couriers add column if not exists license_no        text;
alter table couriers add column if not exists license_class     text;
alter table couriers add column if not exists license_expiry    text;
alter table couriers add column if not exists car_photo_url     text;
alter table couriers add column if not exists plate             text;
alter table couriers add column if not exists verified_at       text;

-- `verified` баганыг АНХ УДАА нэмэх үед л одоо байгаа (админ гараар
-- үүсгэсэн) жолоочдыг баталгаажсан гэж тэмдэглэнэ. Дахин ажиллуулахад
-- шинээр бүртгүүлсэн жолоочид санамсаргүйгээр баталгаажихгүй.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'couriers' and column_name = 'verified'
  ) then
    alter table couriers add column verified boolean not null default false;
    update couriers set verified = true, verified_at = to_char(now(), 'YYYY-MM-DD');
  end if;
end $$;

create index if not exists couriers_verified_idx on couriers (verified) where active;


-- ============================================================
--  13. Үйлчилгээний дэд төрөл + ачааны мэдээлэл
-- ============================================================

alter table orders add column if not exists sub_service_id  text;
alter table orders add column if not exists cargo_photo_url text;
alter table orders add column if not exists weight_kg       numeric;
alter table orders add column if not exists fragile         boolean not null default false;
alter table orders add column if not exists urgent          boolean not null default false;

create index if not exists orders_sub_service_id_idx on orders (sub_service_id);


-- ============================================================
--  14. Онлайн төлбөр (QPay / Bonum)
--  ⚠️ Төлбөрийн API түлхүүр client талд ХЭЗЭЭ Ч орохгүй —
--     create-payment / payment-webhook Edge Function дотор л байна.
-- ============================================================

create table if not exists payments (
  id           text primary key,
  order_id     text not null references orders(id) on delete cascade,
  provider     text not null default 'qpay',    -- qpay | bonum | manual
  invoice_id   text,                             -- provider талын нэхэмжлэхийн дугаар
  amount       integer not null,
  status       text not null default 'pending',  -- pending | paid | failed | refunded
  qr_text      text,
  qr_image     text,
  checkout_url text,
  raw          jsonb,
  created_at   text not null,
  paid_at      text
);

-- Нэг нэхэмжлэх дээр webhook хэд ч удаа ирсэн давхар бүртгэгдэхгүй
create unique index if not exists payments_invoice_uidx
  on payments (provider, invoice_id) where invoice_id is not null;
create index if not exists payments_order_idx on payments (order_id);

alter table orders add column if not exists payment_status text not null default 'хүлээгдэж байна';
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists paid_at        text;

alter table payments enable row level security;
drop policy if exists "demo_all_payments" on payments;
create policy "demo_all_payments" on payments for all using (true) with check (true);


-- ============================================================
--  15. Хүргэлтийн дараах үнэлгээ (1–5 од)
--  Оноог одоо цуглуулж эхэлнэ; урамшууллын томьёог дотоод
--  журмаар хожим тогтоон энэ өгөгдөл дээр тооцно.
-- ============================================================

create table if not exists order_ratings (
  order_id    text primary key references orders(id) on delete cascade,
  courier_id  text,
  customer_id text,
  score       smallint not null check (score between 1 and 5),
  comment     text,
  created_at  text not null
);

create index if not exists order_ratings_courier_idx on order_ratings (courier_id);

-- Жолоочийн дундаж үнэлгээг автоматаар шинэчлэх
create or replace function recalc_courier_rating() returns trigger language plpgsql as $$
declare cid text;
begin
  -- DELETE үед NEW байхгүй тул TG_OP-оор салгана
  if tg_op = 'DELETE' then cid := old.courier_id; else cid := new.courier_id; end if;
  if cid is null then return null; end if;
  update couriers c
     set rating = coalesce(
           (select round(avg(score)::numeric, 2) from order_ratings where courier_id = cid),
           5.0)
   where c.id = cid;
  return null;
end $$;

drop trigger if exists order_ratings_recalc on order_ratings;
create trigger order_ratings_recalc
  after insert or update or delete on order_ratings
  for each row execute function recalc_courier_rating();

alter table order_ratings enable row level security;
drop policy if exists "demo_all_order_ratings" on order_ratings;
create policy "demo_all_order_ratings" on order_ratings for all using (true) with check (true);


-- ============================================================
--  16. Санал хүсэлт
-- ============================================================

create table if not exists feedback (
  id         text primary key,
  order_id   text,
  phone      text not null,
  message    text not null,
  created_at text not null,
  emailed    boolean not null default false,
  handled    boolean not null default false
);

create index if not exists feedback_created_idx on feedback (created_at desc);

alter table feedback enable row level security;
drop policy if exists "demo_all_feedback" on feedback;
create policy "demo_all_feedback" on feedback for all using (true) with check (true);


-- ============================================================
--  17. Партнёрын бараа + сагс + газрын төлбөрийн QR
--  Дэлгүүр, карго зэрэг газрууд хүргэлтээр гарах боломжтой
--  барааныхаа жагсаалтыг үнэтэй нь өөрсдөө оруулна.
-- ============================================================

create table if not exists partner_products (
  id         text primary key,
  partner_id text not null references partners(id) on delete cascade,
  name       text not null,
  price      integer not null default 0,
  unit       text not null default 'ш',
  image_url  text,
  in_stock   boolean not null default true,
  sort       integer not null default 0,
  created_at text not null
);

create index if not exists partner_products_partner_idx on partner_products (partner_id) where in_stock;

-- Партнёр өөрөө нэвтэрч бараагаа удирдана (утас + нууц үг)
alter table partners add column if not exists phone          text;
alter table partners add column if not exists auth_method    text not null default 'password';
alter table partners add column if not exists auth_key       text;
alter table partners add column if not exists payment_qr_url text;

create unique index if not exists partners_phone_uidx on partners (phone) where phone is not null;

-- Сагстай захиалга: [{ productId, name, price, qty }]
alter table orders add column if not exists basket       jsonb not null default '[]'::jsonb;
alter table orders add column if not exists basket_total integer not null default 0;
alter table orders add column if not exists partner_id   text;

alter table partner_products enable row level security;
drop policy if exists "demo_all_partner_products" on partner_products;
create policy "demo_all_partner_products" on partner_products for all using (true) with check (true);


-- ============================================================
--  Realtime — шинэ хүснэгтүүдийг real-time болгох
--  (аль хэдийн нэмэгдсэн бол алгасна)
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array['payments', 'partner_products'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;


-- ============================================================
--  ШАЛГАХ — доорх хүснэгт бүх мөр дээр ✅ гарвал бүгд амжилттай
-- ============================================================

select 'orders.service_id'        as "юу", count(*)::text as "тоо",
       case when count(*) = 1 then '✅' else '❌' end as "төлөв"
  from information_schema.columns where table_name = 'orders' and column_name = 'service_id'
union all
select 'orders.sub_service_id', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'orders' and column_name = 'sub_service_id'
union all
select 'orders.cargo_photo_url', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'orders' and column_name = 'cargo_photo_url'
union all
select 'orders.payment_status', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'orders' and column_name = 'payment_status'
union all
select 'orders.basket', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'orders' and column_name = 'basket'
union all
select 'couriers.verified', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'couriers' and column_name = 'verified'
union all
select 'couriers.license_photo_url', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'couriers' and column_name = 'license_photo_url'
union all
select 'partners.payment_qr_url', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'partners' and column_name = 'payment_qr_url'
union all
select 'хүснэгт: payments', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.tables where table_name = 'payments'
union all
select 'хүснэгт: order_ratings', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.tables where table_name = 'order_ratings'
union all
select 'хүснэгт: feedback', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.tables where table_name = 'feedback'
union all
select 'хүснэгт: partner_products', count(*)::text,
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.tables where table_name = 'partner_products';
