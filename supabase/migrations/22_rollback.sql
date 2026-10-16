-- ============================================================
--  hvrgelt — Migration 22-ийг БУЦААХ (зөвхөн асуудал гарвал)
--  Нээлттэй (demo_all) хувилбар руу буцаана. Нууц утгууд hash хэвээр.
-- ============================================================

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in (
      'orders','couriers','operators','customers','partners','partner_products','payments',
      'order_ratings','feedback','settings','push_subscriptions','courier_locations')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['orders','couriers','operators','customers','partners','partner_products','payments',
                           'order_ratings','feedback','settings','push_subscriptions','courier_locations']
  loop
    execute format('grant all on public.%I to anon, authenticated', t);
    execute format('create policy %I on public.%I for all using (true) with check (true)', 'demo_all_' || t, t);
  end loop;
end $$;

drop trigger if exists guard_order on orders;
drop trigger if exists guard_courier_update on couriers;
delete from settings where key = 'auth_required';
