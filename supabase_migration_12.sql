-- ============================================================
--  hvrgelt — Migration 12: Жолоочийн баримт бичиг
--  Жолооч өөрөө бүртгүүлж, дараах 5 мэдээллийг оруулна. Ачаа
--  авсан үед үйлчлүүлэгчид эдгээр нь харагдана:
--    1. Цээж зураг        4. Машины зураг
--    2. Жолооны үнэмлэх   5. Улсын дугаар
--    3. Утасны дугаар
--  Супер админ шалгаж verified = true болгоно.
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

alter table couriers add column if not exists photo_url         text;
alter table couriers add column if not exists license_photo_url text;
alter table couriers add column if not exists license_no        text;
alter table couriers add column if not exists license_class     text;
alter table couriers add column if not exists license_expiry    text;
alter table couriers add column if not exists car_photo_url     text;
alter table couriers add column if not exists plate             text;
alter table couriers add column if not exists verified          boolean not null default false;
alter table couriers add column if not exists verified_at       text;

-- Өмнөх жолоочдыг (гараар үүсгэсэн) баталгаажсан гэж үзнэ
update couriers set verified = true where verified = false and created_at < to_char(now(), 'YYYY-MM-DD');

create index if not exists couriers_verified_idx on couriers (verified) where active;
