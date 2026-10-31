-- ============================================================
--  hvrgelt — Migration 25: Утас баталгаажуулалт (Verify.MN)
--  Supabase Dashboard → SQL Editor → хуулж RUN дарна.
--  Production дээр энэ файлыг агент ажиллуулахгүй. Гараар нэг удаа.
-- ============================================================
--
--  Хэрэглэгч 144773 руу код SMS-ээр илгээнэ. Баталгаажсан цаг
--  customers / couriers.phone_verified_at дээр. Клиент энэ баганыг
--  өөрөө бичиж чадахгүй. phone_verifications, phone_verify_ip
--  зөвхөн сервер (service role) — RLS асаалттай, policy байхгүй.
--
--  Хуучин мөрийг баталгаажсан гэж бөглөхгүй. phone_verified_at null
--  хэвээр, дараагийн нэвтрэлтэд баталгаажуулна.
-- ============================================================

alter table customers add column if not exists phone_verified_at timestamptz;
alter table couriers  add column if not exists phone_verified_at timestamptz;

grant select (phone_verified_at) on customers to authenticated;
grant select (phone_verified_at) on couriers  to authenticated;

-- Хүргэгч (ба супер админы клиент) утсаа шууд сольж болохгүй.
-- Дугаар солихыг api/auth admin-phone / set-phone хийнэ.
revoke update (phone) on couriers from authenticated;

create table if not exists phone_verifications (
  id          text primary key,
  phone       text not null,
  purpose     text not null,
  role        text,
  code        text not null,
  session_id  text not null unique,
  user_id     text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  verified_at timestamptz,
  used_at     timestamptz
);
create index if not exists phone_verifications_phone_created
  on phone_verifications (phone, created_at desc);
alter table phone_verifications enable row level security;

create table if not exists phone_verify_ip (
  ip           text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);
alter table phone_verify_ip enable row level security;

-- ── Захиалга: баталгаажаагүй үйлчлүүлэгч шинэ захиалга үүсгэхгүй.
--    Явж буй захиалгын UPDATE (төлөх, цуцлах) хэвээр.
--    Хүргэгч баталгаажаагүй бол шинэ захиалга авахгүй. ──
create or replace function public.guard_order() returns trigger
language plpgsql as $$
declare
  t jsonb;
  base numeric; min_km numeric; incl numeric; km numeric; floor_price numeric;
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1 from customers c where c.id = new.customer_id and c.phone_verified_at is not null
    ) then
      raise exception 'Утасны дугаараа баталгаажуулна уу';
    end if;
    if new.status not in ('шинэ', 'төлбөр хүлээж байна') then raise exception 'Буруу төлөв'; end if;
    if new.payment_status is not null and new.payment_status <> '' then raise exception 'Төлбөрийн төлөвийг сервер тавина'; end if;
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
    if old.status = 'жолооч хайж байна' and new.status = 'томилогдсон' then
      if not exists (
        select 1 from couriers c where c.id = public.app_uid() and c.phone_verified_at is not null
      ) then
        raise exception 'Утасны дугаараа баталгаажуулна уу';
      end if;
    end if;
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

-- ── Хүргэгч баталгаажаагүй бол ажилд гарахгүй (available true болох) ──
create or replace function public.guard_courier_update() returns trigger
language plpgsql as $$
begin
  if public.is_staff() or auth.role() = 'service_role' then return new; end if;
  if new.verified is distinct from old.verified and new.verified then
    raise exception 'Баталгаажуулалтыг зөвхөн админ хийнэ';
  end if;
  if new.active is distinct from old.active or new.rating is distinct from old.rating then
    raise exception 'Энэ талбарыг зөвхөн админ өөрчилнө';
  end if;
  if new.available is true and old.available is distinct from true and new.phone_verified_at is null then
    raise exception 'Утасны дугаараа баталгаажуулна уу';
  end if;
  return new;
end $$;
