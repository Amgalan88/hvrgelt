-- ============================================================
--  hvrgelt — Migration 24: Шатлалтай үнэтэй DB шалгалтыг тааруулах
--  Supabase Dashboard → SQL Editor → хуулж RUN дарна.
-- ============================================================
--
--  Migration 22-ын guard_order захиалгын үнийг "хэт бага биш үү" гэж
--  бүх км-ийг perKm (₮1,500)-аар бодож шалгадаг байсан. Шатлалтай тариф
--  (3 км хүртэл ₮1,500, 10 км хүртэл ₮1,200, цааш ₮1,000) гарснаас хойш
--  ~8 км-ээс хол ЗӨВ үнийг "Үнэ буруу" гэж татгалзана.
--
--  Одоо доод хязгаарыг тарифын хамгийн хямд км-ийн үнээр бодно:
--    (суурь + хамгийн хямд км үнэ × шулуун зай) × 0.9
--  Машины зам шулуун зайнаас богино байдаггүй тул зөв үнэ хэзээ ч
--  татгалзагдахгүй, ₮1 гэх мэт хуурамч үнэ татгалзагдсаар байна.
-- ============================================================

create or replace function public.guard_order() returns trigger
language plpgsql as $$
declare
  t jsonb;
  base numeric; min_km numeric; incl numeric; km numeric; floor_price numeric;
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;

  if tg_op = 'INSERT' then
    if new.status not in ('шинэ', 'төлбөр хүлээж байна') then raise exception 'Буруу төлөв'; end if;
    if new.payment_status is not null and new.payment_status <> '' then raise exception 'Төлбөрийн төлөвийг сервер тавина'; end if;
    -- Шууд үнэ: шулуун зайгаар, хамгийн хямд шатаар бодсон доод хязгаараас бага байж болохгүй
    if new.status = 'төлбөр хүлээж байна' then
      if new.from_lat is null or new.to_lat is null then raise exception 'Байршилгүй захиалгын үнийг оператор тавина'; end if;
      select value::jsonb into t from settings where key = 'tariff_goods';
      base   := coalesce((t ->> 'base')::numeric, 1500);
      min_km := least(
        coalesce((t ->> 'perKm')::numeric, 1500),
        coalesce((t ->> 'perKm2')::numeric, 1200),
        coalesce((t ->> 'perKm3')::numeric, 1000));
      incl   := coalesce((t ->> 'includedKm')::numeric, 0);
      km := 2 * 6371 * asin(sqrt(
              power(sin(radians(new.to_lat - new.from_lat) / 2), 2) +
              cos(radians(new.from_lat)) * cos(radians(new.to_lat)) * power(sin(radians(new.to_lng - new.from_lng) / 2), 2)));
      floor_price := (base + min_km * greatest(0, km - incl)) * 0.9;
      if new.price < floor_price then raise exception 'Үнэ буруу байна'; end if;
    end if;
    return new;
  end if;

  -- UPDATE: захиалагч, хүргэгч үнэ, төлбөр, захиалагчийг өөрчилж чадахгүй
  if new.price is distinct from old.price or new.distance is distinct from old.distance
     or new.payment_status is distinct from old.payment_status or new.payment_method is distinct from old.payment_method
     or new.paid_at is distinct from old.paid_at or new.customer_id is distinct from old.customer_id then
    raise exception 'Энэ талбарыг өөрчлөх эрхгүй';
  end if;

  if public.app_role() = 'customer' then
    if new.status is distinct from old.status and not (
         (old.status = 'үнэ батлах' and new.status = 'төлбөр хүлээж байна')
      or (new.status = 'цуцлагдсан' and old.status in ('шинэ', 'үнэ батлах', 'төлбөр хүлээж байна', 'жолооч хайж байна', 'томилогдсон'))
    ) then raise exception 'Төлвийг ингэж өөрчлөх боломжгүй'; end if;
    if new.courier_id is distinct from old.courier_id and new.status <> 'цуцлагдсан' then raise exception 'Хүргэгчийг оператор томилно'; end if;
  elsif public.app_role() = 'courier' then
    if new.status is distinct from old.status and not (
         (old.status = 'жолооч хайж байна' and new.status = 'томилогдсон' and old.courier_id is null and new.courier_id = public.app_uid())
      or (old.status = 'томилогдсон' and new.status = 'авсан')
      or (old.status = 'авсан' and new.status = 'хүргэгдсэн')
    ) then raise exception 'Төлвийг ингэж өөрчлөх боломжгүй'; end if;
  else
    raise exception 'Эрхгүй';
  end if;
  return new;
end $$;
