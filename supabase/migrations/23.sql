-- ============================================================
--  hvrgelt — Migration 23: Хэрэглэгчийн профайл зураг
--  Supabase Dashboard → SQL Editor → хуулж RUN дарна.
-- ============================================================
--  Ажиллуулаагүй бол апп хэвийн ажиллана, зөвхөн зураг хадгалагдахгүй.

alter table customers add column if not exists photo_url text;

-- Migration 22 багана тус бүрээр эрх өгсөн тул шинэ баганад нэмж өгнө
grant select (photo_url), update (photo_url) on customers to authenticated;
