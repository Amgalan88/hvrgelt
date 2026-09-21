-- ============================================================
--  hvrgelt — Migration 13: Үйлчилгээний дэд төрөл + ачааны мэдээлэл
--  Захиалга 3 түвшинтэй боллоо:
--    1. Үндсэн үйлчилгээ (service_id)        — migration 11
--    2. Дэд төрөл (sub_service_id)           — карго/тээш/олон ширхэгтэй...
--    3. Ачааны мэдээлэл                      — зураг, кг, хагарах, яаралтай
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

alter table orders add column if not exists sub_service_id  text;
alter table orders add column if not exists cargo_photo_url text;
alter table orders add column if not exists weight_kg       numeric;
alter table orders add column if not exists fragile         boolean not null default false;
alter table orders add column if not exists urgent          boolean not null default false;

create index if not exists orders_sub_service_id_idx on orders (sub_service_id);
