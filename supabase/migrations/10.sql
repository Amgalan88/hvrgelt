-- ============================================================
--  hvrgelt — Migration 10: push_subscriptions-г operator/courier-т
--  ч ашиглах боломжтой болгох (өмнө нь зөвхөн customer байсан).
--  Supabase Dashboard → SQL Editor → энэ бүхнийг хуулж RUN дарна.
-- ============================================================

alter table push_subscriptions add column if not exists role text not null default 'customer';

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'push_subscriptions' and column_name = 'customer_id'
  ) then
    alter table push_subscriptions rename column customer_id to user_id;
  end if;
end $$;

drop index if exists push_subscriptions_customer_id_idx;
create index if not exists push_subscriptions_role_user_idx on push_subscriptions (role, user_id);
