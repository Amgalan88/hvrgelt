-- ============================================================
--  20. Шууд үнэ, газрын хайлт, ойрын хүргэгчид санал
-- ============================================================
--
--  Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад
--  аюулгүй. ⚠️ Өмнө нь supabase_migration_19.sql-ийг ажиллуулсан байх
--  ёстой (courier_locations хүснэгт).
--
--  • orders.hand_to_hand      — "Гараас гарт" (орж авах, оруулж өгөх)
--  • orders.searching_since   — хүргэгч хайж эхэлсэн цаг; хариу ирэхгүй
--                               бол санал өгөх хүргэгчдийн тоо 2 минут тутам өснө
--  • partners.lat / lng       — газрын байршил; "Дархан бүсийн карго" гэж
--                               хайхад байршилтайгаа гарна
--
--  Апп энэ migration-гүйгээр ч ажиллана — зөвхөн эдгээр боломж идэвхжихгүй.

begin;

alter table orders   add column if not exists hand_to_hand    boolean not null default false;
alter table orders   add column if not exists searching_since timestamptz;
alter table partners add column if not exists lat double precision;
alter table partners add column if not exists lng double precision;

-- Хүргэгч хайж эхлэхэд цагийг автоматаар тэмдэглэнэ (апп, webhook аль нь
-- ч төлөвийг шилжүүлсэн бай)
create or replace function set_searching_since() returns trigger language plpgsql as $$
begin
  if new.status = 'жолооч хайж байна' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    new.searching_since := now();
  end if;
  return new;
end $$;

drop trigger if exists orders_searching_since on orders;
create trigger orders_searching_since
  before insert or update of status on orders
  for each row execute function set_searching_since();

commit;

-- Шалгах — бүх мөр дээр ✅ гарвал амжилттай
select 'orders.hand_to_hand' as "юу",
       case when count(*) = 1 then '✅' else '❌' end as "төлөв"
  from information_schema.columns where table_name = 'orders' and column_name = 'hand_to_hand'
union all
select 'orders.searching_since',
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'orders' and column_name = 'searching_since'
union all
select 'partners.lat',
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'partners' and column_name = 'lat'
union all
select 'courier_locations (migration 19)',
       case when count(*) = 1 then '✅' else '❌ — эхлээд migration 19-ийг ажиллуулна' end
  from information_schema.tables where table_name = 'courier_locations';
