-- ============================================================
--  hvrgelt — Migration 2: бодит өгөгдөл рүү шилжих
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

-- 1. Захиалагчийн хадгалсан хаягийг DB-д хадгалах багана
alter table customers
  add column if not exists addresses jsonb not null default '[]'::jsonb;

-- 2. Бүх демо/жишээ өгөгдлийг устгах
delete from orders    where id in ('1000', '999');
delete from couriers  where id in ('cr1', 'cr2', 'cr3', 'cr4');
delete from operators where id in ('op1', 'op2');

-- Дараа нь: superadmin-ээр нэвтэрч (утас 99739959, нууц үг gegee0011)
-- бодит оператор/жолоочдоо өөрөө үүсгэнэ.
