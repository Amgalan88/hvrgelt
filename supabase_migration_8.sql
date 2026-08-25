-- ============================================================
--  hvrgelt — Migration 8: давхар бүртгэл (duplicate customer) засах
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================
--
--  Асуудал: "customers" хүснэгтэд phone багана дээр unique constraint
--  байгаагүй тул сүлжээний алдаа/timeout үед app "бүртгэлгүй" гэж
--  андуураад дахин бүртгүүлэхэд, ижил дугаартай хоёр дахь мөр
--  үүсдэг байсан. Дараа нь нэвтрэхэд алийг нь буцаах нь тодорхойгүй
--  болж, "аль хэдийн бүртгэлтэй хэрэглэгч дахин шинээр орж ирсэн юм
--  шиг" харагддаг байв. Апп талын код засварыг хамт хийсэн
--  (resolveByPhone/addCustomer error-г дарж "олдсонгүй" гэж
--  андуурахгүй болгосон).
--
-- ── 1. Давхардал байгаа эсэхийг шалгах (READ-ONLY, аюулгүй) ──────────
--  Энэ query-г эхлээд ганцаараа Run хийж үзээрэй. Мөр гарвал доор
--  тайлбарласнаар гараар цэвэрлээд 2-р алхам руу оруул.
select phone, count(*) as cnt, array_agg(id order by created_at) as customer_ids
from customers
group by phone
having count(*) > 1;

-- ── 2. Дээрх query хоосон буцаавал шууд unique index нэмж болно ──────
--  Хэрэв 1-р алхамд давхардал ГАРСАН бол энэ create unique index
--  ALDAA өгнө (constraint violation) — тэгвэл эхлээд гараар шийднэ:
--    - Хуучин (created_at эрт) мөрийг хадгал, шинэ давхар мөрийг устга:
--        delete from customers where id = '<хасах id>';
--    - Эсвэл хоёр мөрийн addresses/quick_orders-г нэгтгэсний дараа
--      нэгийг нь устга.
--  Дараа нь энэ create unique index-г дахин Run хийнэ.
create unique index if not exists customers_phone_unique on customers (phone);
