-- Goal Diggers payment, ticketing, and shop migration.
-- Run after supabase-setup.sql and supabase-setup-v2.sql.

create extension if not exists pgcrypto;

alter table public.events
  add column if not exists name text,
  add column if not exists ticket_tiers jsonb not null default '[]'::jsonb,
  add column if not exists ticket_cutoff timestamptz,
  add column if not exists is_ticketed boolean not null default false;
update public.events set name = title where name is null;
alter table public.events alter column name set default '';

create or replace function public.sync_event_name()
returns trigger language plpgsql as $$
begin
  if new.name is null or new.name = '' then new.name := new.title; end if;
  if new.title is null or new.title = '' then new.title := new.name; end if;
  return new;
end;
$$;
drop trigger if exists sync_event_name_trigger on public.events;
create trigger sync_event_name_trigger before insert or update on public.events
for each row execute function public.sync_event_name();

alter table public.products add column if not exists stock integer not null default 0;
alter table public.products add column if not exists currency text not null default 'RWF';
alter table public.products drop constraint if exists products_stock_nonnegative;
alter table public.products add constraint products_stock_nonnegative check (stock >= 0);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  amount numeric(12,2) not null check (amount > 0 and amount <= 100000000),
  currency text not null check (currency in ('RWF', 'USD')),
  designation text not null,
  frequency text not null check (frequency in ('once', 'monthly')),
  tx_ref text not null unique,
  flw_transaction_id text,
  payment_method text,
  payment_type text not null default 'donation' check (payment_type = 'donation'),
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed')),
  is_anonymous boolean not null default false,
  message text,
  flw_plan_id bigint
);

create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('RWF', 'USD')),
  flw_plan_id bigint not null unique,
  created_at timestamptz not null default now(),
  unique (amount, currency)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references public.donations(id),
  donor_name text not null,
  donor_email text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('RWF', 'USD')),
  designation text not null,
  flw_plan_id bigint not null,
  flw_subscription_id text unique,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  started_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events(id),
  event_name text not null,
  buyer_name text not null,
  buyer_email text not null,
  donor_phone text,
  tier text not null,
  quantity integer not null check (quantity between 1 and 10),
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('RWF', 'USD')),
  tx_ref text not null unique,
  ticket_reference text not null unique,
  flw_transaction_id text,
  payment_method text,
  payment_type text not null default 'ticket' check (payment_type = 'ticket'),
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed')),
  check_in_status boolean not null default false,
  email_sent_at timestamptz
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  donor_name text not null,
  donor_email text not null,
  donor_phone text,
  items jsonb not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency = 'RWF'),
  tx_ref text not null unique,
  order_reference text not null unique,
  flw_transaction_id text,
  payment_method text,
  payment_type text not null default 'order' check (payment_type = 'order'),
  status text not null default 'pending' check (status in ('pending', 'successful', 'failed'))
);

alter table public.donations enable row level security;
alter table public.payment_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tickets enable row level security;
alter table public.orders enable row level security;
revoke all on public.donations, public.payment_plans, public.subscriptions, public.tickets, public.orders from anon, authenticated;
grant all on public.donations, public.payment_plans, public.subscriptions, public.tickets, public.orders to service_role;

create or replace view public.public_donation_stats as
select
  coalesce(sum(amount) filter (where currency = 'RWF'), 0)::numeric(14,2) as total_rwf,
  coalesce(sum(amount) filter (where currency = 'USD'), 0)::numeric(14,2) as total_usd,
  count(distinct donor_email)::bigint as donor_count
from public.donations
where status = 'successful';
grant select on public.public_donation_stats to anon, authenticated;

create or replace view public.public_ticket_sales as
select event_id, tier, coalesce(sum(quantity), 0)::bigint as sold
from public.tickets
where status = 'successful' or (status = 'pending' and created_at > now() - interval '30 minutes')
group by event_id, tier;
grant select on public.public_ticket_sales to anon, authenticated;

create or replace function public.reserve_event_ticket(
  p_event_id uuid, p_tier text, p_quantity integer, p_amount numeric, p_currency text,
  p_tx_ref text, p_ticket_reference text, p_buyer_name text, p_buyer_email text, p_donor_phone text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  selected_event public.events%rowtype;
  tier_data jsonb;
  held integer;
  ticket_id uuid;
begin
  select * into selected_event from public.events where id = p_event_id for update;
  if not found or (selected_event.ticket_cutoff is not null and selected_event.ticket_cutoff <= now()) then
    raise exception 'Ticket sales are closed';
  end if;
  select tiers.value into tier_data from jsonb_array_elements(selected_event.ticket_tiers) as tiers(value)
    where tiers.value ->> 'name' = p_tier limit 1;
  if tier_data is null or p_quantity < 1 or p_quantity > 10 or p_currency <> 'RWF' then
    raise exception 'Ticket tier is unavailable';
  end if;
  if (tier_data ->> 'price')::numeric * p_quantity <> p_amount then raise exception 'Ticket price changed'; end if;
  select coalesce(sum(quantity), 0) into held from public.tickets
    where event_id = p_event_id and tier = p_tier
      and (status = 'successful' or (status = 'pending' and created_at > now() - interval '30 minutes'));
  if held + p_quantity > (tier_data ->> 'quantity')::integer then raise exception 'This ticket tier is sold out'; end if;
  insert into public.tickets(event_id, event_name, buyer_name, buyer_email, donor_phone, tier, quantity,
    amount, currency, tx_ref, ticket_reference)
  values (selected_event.id, coalesce(selected_event.name, selected_event.title), p_buyer_name,
    p_buyer_email, p_donor_phone, p_tier, p_quantity, p_amount, p_currency, p_tx_ref, p_ticket_reference)
  returning id into ticket_id;
  return ticket_id;
end;
$$;

create or replace function public.reserve_shop_order(
  p_items jsonb, p_amount numeric, p_tx_ref text, p_order_reference text,
  p_donor_name text, p_donor_email text, p_donor_phone text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  pending_units integer;
  order_id uuid;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then raise exception 'Cart is empty'; end if;
  if jsonb_array_length(p_items) <> (select count(distinct value ->> 'id') from jsonb_array_elements(p_items)) then
    raise exception 'Cart contains duplicate products';
  end if;
  for item in select value from jsonb_array_elements(p_items) order by value ->> 'id' loop
    select * into product_row from public.products where id = (item ->> 'id')::uuid for update;
    if not found or not product_row.available or product_row.price_rwf <> (item ->> 'unit_price')::numeric then
      raise exception 'A product is unavailable or its price changed';
    end if;
    if (item ->> 'quantity')::integer < 1 or (item ->> 'quantity')::integer > 20 then raise exception 'Invalid quantity'; end if;
    select coalesce(sum((line ->> 'quantity')::integer), 0) into pending_units
      from public.orders o cross join lateral jsonb_array_elements(o.items) line
      where o.status = 'pending' and o.created_at > now() - interval '30 minutes'
        and line ->> 'id' = product_row.id::text;
    if product_row.stock < pending_units + (item ->> 'quantity')::integer then raise exception 'A product is out of stock'; end if;
  end loop;
  if (select sum((value ->> 'unit_price')::numeric * (value ->> 'quantity')::integer) from jsonb_array_elements(p_items)) <> p_amount then
    raise exception 'Cart total changed';
  end if;
  insert into public.orders(donor_name, donor_email, donor_phone, items, amount, currency, tx_ref, order_reference)
  values (p_donor_name, p_donor_email, p_donor_phone, p_items, p_amount, 'RWF', p_tx_ref, p_order_reference)
  returning id into order_id;
  return order_id;
end;
$$;

create or replace function public.complete_payment(
  p_tx_ref text, p_transaction_id text, p_payment_method text, p_subscription_id text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  donation_row public.donations%rowtype;
  ticket_row public.tickets%rowtype;
  order_row public.orders%rowtype;
  line jsonb;
begin
  select * into donation_row from public.donations where tx_ref = p_tx_ref for update;
  if found then
    if donation_row.status = 'successful' then return; end if;
    if donation_row.status <> 'pending' then return; end if;
    update public.donations set status = 'successful', flw_transaction_id = p_transaction_id, payment_method = p_payment_method
      where id = donation_row.id and status = 'pending';
    if donation_row.frequency = 'monthly' then
      insert into public.subscriptions(donation_id, donor_name, donor_email, amount, currency, designation,
        flw_plan_id, flw_subscription_id)
      values (donation_row.id, donation_row.donor_name, donation_row.donor_email, donation_row.amount,
        donation_row.currency, donation_row.designation, donation_row.flw_plan_id, p_subscription_id)
      on conflict (flw_subscription_id) do nothing;
    end if;
    return;
  end if;
  select * into ticket_row from public.tickets where tx_ref = p_tx_ref for update;
  if found then
    if ticket_row.status <> 'pending' then return; end if;
    update public.tickets set status = 'successful', flw_transaction_id = p_transaction_id, payment_method = p_payment_method
      where id = ticket_row.id and status = 'pending';
    return;
  end if;
  select * into order_row from public.orders where tx_ref = p_tx_ref for update;
  if found then
    if order_row.status = 'successful' then return; end if;
    if order_row.status <> 'pending' then return; end if;
    for line in select value from jsonb_array_elements(order_row.items) order by value ->> 'id' loop
      update public.products set stock = stock - (line ->> 'quantity')::integer
        where id = (line ->> 'id')::uuid and stock >= (line ->> 'quantity')::integer;
      if not found then raise exception 'Insufficient stock while completing order'; end if;
    end loop;
    update public.orders set status = 'successful', flw_transaction_id = p_transaction_id, payment_method = p_payment_method
      where id = order_row.id and status = 'pending';
    return;
  end if;
  raise exception 'Unknown transaction reference';
end;
$$;

create or replace function public.attach_flutterwave_subscription(
  p_plan_id bigint, p_email text, p_subscription_id text
) returns void language plpgsql security definer set search_path = public as $$
declare
  subscription_row public.subscriptions%rowtype;
begin
  select * into subscription_row from public.subscriptions
    where flw_plan_id = p_plan_id and lower(donor_email) = lower(p_email)
      and status = 'active' and flw_subscription_id is null
    order by started_at desc limit 1 for update;
  if found then
    update public.subscriptions set flw_subscription_id = p_subscription_id where id = subscription_row.id;
  else
    raise exception 'Monthly subscription record is not ready';
  end if;
end;
$$;

create or replace function public.record_recurring_donation(
  p_subscription_id text, p_tx_ref text, p_transaction_id text,
  p_amount numeric, p_currency text, p_payment_method text
) returns void language plpgsql security definer set search_path = public as $$
declare
  subscription_row public.subscriptions%rowtype;
begin
  select * into subscription_row from public.subscriptions
    where flw_subscription_id = p_subscription_id and status = 'active' for update;
  if not found then raise exception 'Active subscription not found'; end if;
  if abs(subscription_row.amount - p_amount) > 0.01 or subscription_row.currency <> p_currency then
    raise exception 'Subscription charge amount or currency does not match';
  end if;
  insert into public.donations(donor_name, donor_email, amount, currency, designation, frequency,
    tx_ref, flw_transaction_id, payment_method, payment_type, status, flw_plan_id)
  values (subscription_row.donor_name, subscription_row.donor_email, p_amount, p_currency,
    subscription_row.designation, 'monthly', p_tx_ref, p_transaction_id, p_payment_method,
    'donation', 'successful', subscription_row.flw_plan_id)
  on conflict (tx_ref) do nothing;
end;
$$;

revoke all on function public.reserve_event_ticket(uuid, text, integer, numeric, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.reserve_shop_order(jsonb, numeric, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.complete_payment(text, text, text, text) from public, anon, authenticated;
revoke all on function public.attach_flutterwave_subscription(bigint, text, text) from public, anon, authenticated;
revoke all on function public.record_recurring_donation(text, text, text, numeric, text, text) from public, anon, authenticated;
grant execute on function public.reserve_event_ticket(uuid, text, integer, numeric, text, text, text, text, text, text) to service_role;
grant execute on function public.reserve_shop_order(jsonb, numeric, text, text, text, text, text) to service_role;
grant execute on function public.complete_payment(text, text, text, text) to service_role;
grant execute on function public.attach_flutterwave_subscription(bigint, text, text) to service_role;
grant execute on function public.record_recurring_donation(text, text, text, numeric, text, text) to service_role;