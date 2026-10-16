-- ============================================================
--  hvrgelt — Migration 11: Захиалгын үйлчилгээний төрөл
--  Хэрэглэгч захиалга өгөхдөө үндсэн үйлчилгээнүүдээс (бараа
--  хүргэлт, захаас бараа авах, портер, крантай машин, хүүхэд
--  хүргэлт) сонгоно. Сонголт нь оператор/хүргэгчид харагдана.
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

alter table orders add column if not exists service_id text;

create index if not exists orders_service_id_idx on orders (service_id);
