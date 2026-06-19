-- ============================================================
--  hvrgelt — Migration 4: олон "хурдан захиалга" shortcut
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

-- Захиалагчийн хадгалсан хурдан захиалгууд (карго, тээш гэх мэт)
-- [{ id, label, emoji, fromAddress, fromDetail, toAddress, toDetail }]
alter table customers
  add column if not exists quick_orders jsonb not null default '[]'::jsonb;
