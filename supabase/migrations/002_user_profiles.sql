-- SmartCart: user profiles
-- Stores display metadata set at registration (full name, plan).
-- Linked 1:1 to auth.users. Auto-created via trigger on signup.

-- ─── Table ────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  plan        text not null default 'free' check (plan in ('free', 'premium')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table profiles enable row level security;

create policy "Users read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users update own profile" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ─── updated_at trigger (reuses function from migration 001) ──────────────────
create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

-- ─── Auto-create profile on auth.users INSERT ────────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, plan)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'plan', 'free')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
