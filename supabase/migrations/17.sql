-- ============================================================
--  hvrgelt — Migration 17: Партнёр дэлгүүрийн бараа + сагс
--  Дэлгүүр/карго зэрэг газрууд хүргэлтээр гарах боломжтой
--  барааныхаа жагсаалтыг үнэтэй нь өөрсдөө оруулна. Үйлчлүүлэгч
--  сагсанд хийж захиална; барааны төлбөрийг тухайн газарт QR-аар
--  төлнө (хүргэлтийн төлбөр манайд тусдаа).
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
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

-- Партнёр өөрөө нэвтэрч бараагаа удирдана (утас + PIN)
alter table partners add column if not exists phone          text;
alter table partners add column if not exists auth_method    text not null default 'password';
alter table partners add column if not exists auth_key       text;
alter table partners add column if not exists payment_qr_url text;  -- газартаа төлөх QR

create unique index if not exists partners_phone_uidx on partners (phone) where phone is not null;

-- Сагстай захиалга: [{ productId, name, price, qty }]
alter table orders add column if not exists basket       jsonb not null default '[]'::jsonb;
alter table orders add column if not exists basket_total integer not null default 0;
alter table orders add column if not exists partner_id   text;

alter table partner_products enable row level security;
create policy "demo_all_partner_products" on partner_products for all using (true) with check (true);

alter publication supabase_realtime add table partner_products;
