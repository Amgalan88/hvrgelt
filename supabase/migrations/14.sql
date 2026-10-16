-- ============================================================
--  hvrgelt — Migration 14: Онлайн төлбөр (QPay / Bonum)
--  Урсгал: оператор үнэ тогтооно → үйлчлүүлэгч QR-аар төлнө →
--  webhook төлбөрийг баталгаажуулна → жолооч хайж эхэлнэ.
--
--  ⚠️ Төлбөрийн API түлхүүрийг client талд ХЭЗЭЭ Ч тавьж болохгүй.
--  Бүх дуудлага supabase/functions/create-payment,
--  payment-webhook Edge Function-оор дамжина.
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

create table if not exists payments (
  id          text primary key,
  order_id    text not null references orders(id) on delete cascade,
  provider    text not null default 'qpay',   -- qpay | bonum | manual
  invoice_id  text,                            -- provider талын нэхэмжлэхийн дугаар
  amount      integer not null,
  status      text not null default 'pending', -- pending | paid | failed | refunded
  qr_text     text,                            -- QR-д кодлох утга
  qr_image    text,                            -- base64 эсвэл URL
  checkout_url text,
  raw         jsonb,
  created_at  text not null,
  paid_at     text
);

-- Нэг нэхэмжлэх дээр webhook хэд ч удаа ирсэн давхар бүртгэгдэхгүй
create unique index if not exists payments_invoice_uidx on payments (provider, invoice_id) where invoice_id is not null;
create index if not exists payments_order_idx on payments (order_id);

alter table orders add column if not exists payment_status text not null default 'хүлээгдэж байна'; -- хүлээгдэж байна | төлөгдсөн | буцаагдсан
alter table orders add column if not exists payment_method text;  -- qpay | bonum | бэлэн
alter table orders add column if not exists paid_at        text;

alter table payments enable row level security;
create policy "demo_all_payments" on payments for all using (true) with check (true);

alter publication supabase_realtime add table payments;
