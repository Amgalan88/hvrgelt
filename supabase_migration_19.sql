-- ============================================================
--  19. Байршил — газрын зураг дээрх цэг, хүргэгчийн GPS
-- ============================================================
--
--  Supabase → SQL Editor дээр нэг удаа ажиллуулна. Дахин ажиллуулахад
--  аюулгүй (if not exists, drop ... if exists).
--
--  • orders: үйлчлүүлэгчийн газрын зураг дээр заасан авах/хүргэх цэг
--  • courier_locations: хүргэгчийн сүүлийн байршил (20 сек тутам
--    шинэчлэгдэнэ). couriers хүснэгтээс тусад нь байлгасан нь — байршил
--    өөрчлөгдөх бүрт бүх хэрэглэгч хүргэгчдийн жагсаалтыг дахин татахгүй,
--    үйлчлүүлэгч зөвхөн өөрийн хүргэгчийн мөрийг сонсоно.
--
--  Апп энэ migration-гүйгээр ч ажиллана — координатгүйгээр л хадгална.

begin;

alter table orders add column if not exists from_lat double precision;
alter table orders add column if not exists from_lng double precision;
alter table orders add column if not exists to_lat   double precision;
alter table orders add column if not exists to_lng   double precision;

create table if not exists courier_locations (
  courier_id text primary key,
  lat        double precision not null,
  lng        double precision not null,
  accuracy   real,
  updated_at timestamptz not null default now()
);

alter table courier_locations enable row level security;
drop policy if exists "demo_all_courier_locations" on courier_locations;
create policy "demo_all_courier_locations" on courier_locations for all using (true) with check (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'courier_locations'
  ) then
    alter publication supabase_realtime add table public.courier_locations;
  end if;
end $$;

commit;

-- Шалгах — бүх мөр дээр ✅ гарвал амжилттай
select 'orders.from_lat' as "юу",
       case when count(*) = 1 then '✅' else '❌' end as "төлөв"
  from information_schema.columns where table_name = 'orders' and column_name = 'from_lat'
union all
select 'orders.to_lat',
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.columns where table_name = 'orders' and column_name = 'to_lat'
union all
select 'хүснэгт: courier_locations',
       case when count(*) = 1 then '✅' else '❌' end
  from information_schema.tables where table_name = 'courier_locations'
union all
select 'realtime: courier_locations',
       case when count(*) = 1 then '✅' else '❌' end
  from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'courier_locations';
