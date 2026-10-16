-- ============================================================
--  hvrgelt — Migration 9: Push мэдэгдэл (push_subscriptions)
--  Захиалгын статус өөрчлөгдөхөд хэрэглэгчид browser push
--  мэдэгдэл илгээхэд ашиглана (Edge Function-тэй хамт ажиллана).
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

create table if not exists push_subscriptions (
  endpoint    text primary key,
  customer_id text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  text not null
);

create index if not exists push_subscriptions_customer_id_idx
  on push_subscriptions (customer_id);

-- RLS (демо — anon бүрэн эрхтэй; production-д хязгаарлана, SUPABASE_SETUP.md үзнэ үү)
alter table push_subscriptions enable row level security;
create policy "demo_all_push_subscriptions" on push_subscriptions for all using (true) with check (true);
