-- ============================================================
--  hvrgelt — Migration 7: partners хүснэгтэд image багана нэмэх
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

alter table partners add column if not exists image text;
