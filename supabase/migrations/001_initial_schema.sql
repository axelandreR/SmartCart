-- SmartCart initial schema
-- Run this in your Supabase SQL editor or via supabase db push

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Stores ──────────────────────────────────────────────────────────────────
create table if not exists stores (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  address     text,
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now()
);

alter table stores enable row level security;
create policy "Users manage own stores" on stores
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Products ─────────────────────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade,
  barcode     text,
  name        text not null,
  brand       text,
  category    text,
  image_url   text,
  nutri_score text,
  last_price  numeric(10,2),
  prev_price  numeric(10,2),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, barcode)
);

alter table products enable row level security;
create policy "Users manage own products" on products
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Price History ────────────────────────────────────────────────────────────
create table if not exists price_history (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid references products(id) on delete cascade not null,
  store_id    uuid references stores(id) on delete set null,
  price       numeric(10,2) not null,
  quantity    numeric(10,3) not null default 1,
  unit        text default 'unit',
  recorded_at timestamptz not null default now()
);

alter table price_history enable row level security;
create policy "Users see own price history" on price_history
  using (
    exists (select 1 from products p where p.id = price_history.product_id and p.user_id = auth.uid())
  );

-- ─── Shopping Lists ───────────────────────────────────────────────────────────
create table if not exists shopping_lists (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  status       text not null default 'active' check (status in ('active','completed','archived')),
  budget       numeric(10,2),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table shopping_lists enable row level security;
create policy "Users manage own lists" on shopping_lists
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── Shopping List Items ──────────────────────────────────────────────────────
create table if not exists shopping_list_items (
  id          uuid primary key default uuid_generate_v4(),
  list_id     uuid references shopping_lists(id) on delete cascade not null,
  product_id  uuid references products(id) on delete set null,
  name        text,
  barcode     text,
  quantity    numeric(10,3) not null default 1,
  unit        text default 'unit',
  price       numeric(10,2),
  checked     boolean not null default false,
  checked_at  timestamptz,
  sort_order  integer not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);

alter table shopping_list_items enable row level security;
create policy "Users see own list items" on shopping_list_items
  using (
    exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid())
  );

-- ─── Triggers ─────────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on products
  for each row execute function update_updated_at();

create trigger shopping_lists_updated_at before update on shopping_lists
  for each row execute function update_updated_at();

-- ─── Update product last_price on new price_history entry ────────────────────
create or replace function sync_product_price()
returns trigger language plpgsql as $$
begin
  update products
  set prev_price = last_price, last_price = new.price, updated_at = now()
  where id = new.product_id;
  return new;
end;
$$;

create trigger on_price_history_insert after insert on price_history
  for each row execute function sync_product_price();
