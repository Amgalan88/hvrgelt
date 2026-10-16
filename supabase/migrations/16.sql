-- ============================================================
--  hvrgelt — Migration 16: Санал хүсэлт
--  Хүргэгдсэний дараах баяр хүргэх дэлгэц дээрээс үйлчлүүлэгч
--  утасны дугаар + саналаа илгээнэ. Супер админ дээр харагдана,
--  мөн send-feedback-email Edge Function-оор и-мэйлд дамжина.
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

create table if not exists feedback (
  id         text primary key,
  order_id   text,
  phone      text not null,
  message    text not null,
  created_at text not null,
  emailed    boolean not null default false,
  handled    boolean not null default false
);

create index if not exists feedback_created_idx on feedback (created_at desc);

alter table feedback enable row level security;
create policy "demo_all_feedback" on feedback for all using (true) with check (true);
