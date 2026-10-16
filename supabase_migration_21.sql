-- ============================================================
--  hvrgelt — Migration 21: Захиалгын push мэдэгдэл (webhook)
--  Supabase Dashboard → SQL Editor → хуулж RUN дарна.
-- ============================================================
--
--  orders хүснэгтэд захиалга нэмэгдэх, өөрчлөгдөх бүрд
--  https://www.hvrgelt.mn/api/notify?source=db руу мэдээлнэ (api/notify.ts):
--  оператор, ойрын хүргэгч, захиалагчид push илгээнэ.
--
--  Dashboard-ын "Database Webhooks" цонх "schema supabase_functions does
--  not exist" алдаа өгвөл энэ скриптээр шууд үүсгэнэ — pg_net-ийг л
--  ашиглана. Хүсэлт асинхрон тул захиалга хадгалахыг удаашруулахгүй.
--
--  ⚠️ Доорх 'ЭНД_НУУЦ_УТГАА'-г Vercel-ийн WEBHOOK_SECRET-ээр ЗӨВХӨН SQL
--  Editor дээр солиод ажиллуулна. Энэ файлд жинхэнэ утгыг бүү хадгал —
--  repo нийтэд нээлттэй.
-- ============================================================

create extension if not exists pg_net;

create or replace function public.notify_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://www.hvrgelt.mn/api/notify?source=db',
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', case when TG_OP = 'UPDATE' then to_jsonb(OLD) else null end
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', 'ЭНД_НУУЦ_УТГАА'
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
end;
$$;

-- Нууц агуулсан функцийг апп-ын (anon) түлхүүрээр дуудах боломжгүй болгоно
revoke all on function public.notify_order_change() from public, anon, authenticated;

drop trigger if exists order_notify on public.orders;
create trigger order_notify
after insert or update on public.orders
for each row execute function public.notify_order_change();

-- Шалгах: захиалга өгсний дараа сүүлийн хүсэлтүүдийн хариу
--   select status_code, content::text, created from net._http_response order by created desc limit 5;
-- 200 — зөв · 401 — нууц утга таарахгүй · 501 — Vercel-д түлхүүр дутуу
