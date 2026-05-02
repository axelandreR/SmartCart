-- SmartCart: reference tables for countries and currencies
-- These are read-only lookup tables — no user can modify them.
-- Add new countries/currencies here without touching application code.

-- ─── ref_currencies ──────────────────────────────────────────────────────────
create table if not exists ref_currencies (
  code    text primary key,        -- ISO 4217: 'PEN', 'USD', 'ARS'
  name    text not null,           -- 'Sol peruano'
  symbol  text not null,           -- 'S/'
  locale  text not null            -- BCP 47 locale for Intl.NumberFormat
);

-- ─── ref_countries ───────────────────────────────────────────────────────────
create table if not exists ref_countries (
  code             text primary key,          -- ISO 3166-1 alpha-2: 'PE'
  name             text not null,             -- 'Perú'
  flag_emoji       text not null,             -- '🇵🇪'
  default_currency text not null references ref_currencies(code),
  off_tag          text not null              -- Open Food Facts country tag
);

-- ─── ref_country_currencies (junction) ───────────────────────────────────────
create table if not exists ref_country_currencies (
  country_code  text not null references ref_countries(code),
  currency_code text not null references ref_currencies(code),
  is_default    boolean not null default false,
  primary key (country_code, currency_code)
);

-- ─── RLS: public read, no writes from clients ─────────────────────────────────
alter table ref_currencies         enable row level security;
alter table ref_countries          enable row level security;
alter table ref_country_currencies enable row level security;

create policy "Public read ref_currencies"
  on ref_currencies for select using (true);

create policy "Public read ref_countries"
  on ref_countries for select using (true);

create policy "Public read ref_country_currencies"
  on ref_country_currencies for select using (true);

-- ─── SEED: currencies ─────────────────────────────────────────────────────────
insert into ref_currencies (code, name, symbol, locale) values
  ('PEN', 'Sol peruano',              'S/',   'es-PE'),
  ('ARS', 'Peso argentino',           '$',    'es-AR'),
  ('MXN', 'Peso mexicano',            '$',    'es-MX'),
  ('CLP', 'Peso chileno',             '$',    'es-CL'),
  ('COP', 'Peso colombiano',          '$',    'es-CO'),
  ('VES', 'Bolívar venezolano',       'Bs.',  'es-VE'),
  ('USD', 'Dólar estadounidense',     '$',    'en-US'),
  ('BOB', 'Boliviano',                'Bs',   'es-BO'),
  ('PYG', 'Guaraní paraguayo',        '₲',    'es-PY'),
  ('UYU', 'Peso uruguayo',            '$',    'es-UY'),
  ('CRC', 'Colón costarricense',      '₡',    'es-CR'),
  ('GTQ', 'Quetzal guatemalteco',     'Q',    'es-GT'),
  ('HNL', 'Lempira hondureño',        'L',    'es-HN'),
  ('NIO', 'Córdoba nicaragüense',     'C$',   'es-NI'),
  ('PAB', 'Balboa panameño',          'B/.',  'es-PA'),
  ('DOP', 'Peso dominicano',          '$',    'es-DO'),
  ('CUP', 'Peso cubano',              '$',    'es-CU'),
  ('EUR', 'Euro',                     '€',    'es-ES')
on conflict (code) do nothing;

-- ─── SEED: countries ──────────────────────────────────────────────────────────
insert into ref_countries (code, name, flag_emoji, default_currency, off_tag) values
  ('PE', 'Perú',                 '🇵🇪', 'PEN', 'en:peru'),
  ('AR', 'Argentina',            '🇦🇷', 'ARS', 'en:argentina'),
  ('MX', 'México',               '🇲🇽', 'MXN', 'en:mexico'),
  ('CL', 'Chile',                '🇨🇱', 'CLP', 'en:chile'),
  ('CO', 'Colombia',             '🇨🇴', 'COP', 'en:colombia'),
  ('VE', 'Venezuela',            '🇻🇪', 'VES', 'en:venezuela'),
  ('EC', 'Ecuador',              '🇪🇨', 'USD', 'en:ecuador'),
  ('BO', 'Bolivia',              '🇧🇴', 'BOB', 'en:bolivia'),
  ('PY', 'Paraguay',             '🇵🇾', 'PYG', 'en:paraguay'),
  ('UY', 'Uruguay',              '🇺🇾', 'UYU', 'en:uruguay'),
  ('CR', 'Costa Rica',           '🇨🇷', 'CRC', 'en:costa-rica'),
  ('GT', 'Guatemala',            '🇬🇹', 'GTQ', 'en:guatemala'),
  ('SV', 'El Salvador',          '🇸🇻', 'USD', 'en:el-salvador'),
  ('HN', 'Honduras',             '🇭🇳', 'HNL', 'en:honduras'),
  ('NI', 'Nicaragua',            '🇳🇮', 'NIO', 'en:nicaragua'),
  ('PA', 'Panamá',               '🇵🇦', 'PAB', 'en:panama'),
  ('DO', 'República Dominicana', '🇩🇴', 'DOP', 'en:dominican-republic'),
  ('CU', 'Cuba',                 '🇨🇺', 'CUP', 'en:cuba'),
  ('ES', 'España',               '🇪🇸', 'EUR', 'en:spain')
on conflict (code) do nothing;

-- ─── SEED: country–currency relationships ────────────────────────────────────
insert into ref_country_currencies (country_code, currency_code, is_default) values
  -- Perú
  ('PE', 'PEN', true), ('PE', 'USD', false),
  -- Argentina
  ('AR', 'ARS', true), ('AR', 'USD', false),
  -- México
  ('MX', 'MXN', true), ('MX', 'USD', false),
  -- Chile
  ('CL', 'CLP', true), ('CL', 'USD', false),
  -- Colombia
  ('CO', 'COP', true), ('CO', 'USD', false),
  -- Venezuela (3 monedas en circulación real)
  ('VE', 'VES', true), ('VE', 'USD', false), ('VE', 'EUR', false),
  -- Ecuador (dolarizado oficialmente)
  ('EC', 'USD', true),
  -- Bolivia
  ('BO', 'BOB', true), ('BO', 'USD', false),
  -- Paraguay
  ('PY', 'PYG', true), ('PY', 'USD', false),
  -- Uruguay
  ('UY', 'UYU', true), ('UY', 'USD', false),
  -- Costa Rica
  ('CR', 'CRC', true), ('CR', 'USD', false),
  -- Guatemala
  ('GT', 'GTQ', true), ('GT', 'USD', false),
  -- El Salvador (dolarizado oficialmente)
  ('SV', 'USD', true),
  -- Honduras
  ('HN', 'HNL', true), ('HN', 'USD', false),
  -- Nicaragua
  ('NI', 'NIO', true), ('NI', 'USD', false),
  -- Panamá (circulación dual oficial)
  ('PA', 'PAB', true), ('PA', 'USD', false),
  -- República Dominicana
  ('DO', 'DOP', true), ('DO', 'USD', false),
  -- Cuba
  ('CU', 'CUP', true), ('CU', 'USD', false),
  -- España
  ('ES', 'EUR', true), ('ES', 'USD', false)
on conflict (country_code, currency_code) do nothing;
