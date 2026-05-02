-- SmartCart: add country + currency preference to user profiles
-- Default: Peru / Sol peruano — aligned with the primary target market.
-- Users can override in Settings → Región.

alter table profiles
  add column if not exists country  text not null default 'PE'
    check (country in (
      'PE','AR','MX','CL','CO','VE','EC','BO','PY','UY',
      'CR','GT','SV','HN','NI','PA','DO','CU','ES'
    )),
  add column if not exists currency text not null default 'PEN'
    check (currency in (
      'PEN','ARS','MXN','CLP','COP','VES','USD',
      'BOB','PYG','UYU','CRC','GTQ','HNL','NIO','PAB','DOP','CUP','EUR'
    ));

-- Update the auto-create trigger so new users also get locale defaults
-- from their registration metadata (optional — falls back to 'PE'/'PEN').
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, plan, country, currency)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'plan',     'free'),
    coalesce(new.raw_user_meta_data ->> 'country',  'PE'),
    coalesce(new.raw_user_meta_data ->> 'currency', 'PEN')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
