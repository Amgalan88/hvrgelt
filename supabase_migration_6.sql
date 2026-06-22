-- ============================================================
--  hvrgelt — Migration 6: Settings хүснэгт
--  Банкны мэдээлэл болон тохиргоог хадгалдаг key-value хүснэгт.
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

create table if not exists settings (
  key   text primary key,
  value text not null default ''
);

-- Анхны утга
insert into settings (key, value) values ('bank_info', '') on conflict (key) do nothing;

-- RLS
alter table settings enable row level security;
create policy "demo_all_settings" on settings for all using (true) with check (true);
