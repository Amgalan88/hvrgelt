-- ============================================================
--  hvrgelt — Migration 15: Хүргэлтийн дараах үнэлгээ (1–5 од)
--  Үйлчлүүлэгч хүргэгдсэний дараа жолоочид оноо өгнө. Оноог одоо
--  цуглуулж эхэлнэ; урамшууллын томьёог дотоод журмаар хожим
--  тогтоон энэ өгөгдөл дээр тооцно.
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
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
     set rating = coalesce((select round(avg(score)::numeric, 2) from order_ratings where courier_id = cid), 5.0)
   where c.id = cid;
  return null;
end $$;

drop trigger if exists order_ratings_recalc on order_ratings;
create trigger order_ratings_recalc
  after insert or update or delete on order_ratings
  for each row execute function recalc_courier_rating();

alter table order_ratings enable row level security;
create policy "demo_all_order_ratings" on order_ratings for all using (true) with check (true);
