-- SmartCart migration 006: replace store_name (text) with store_id (FK)
--
-- 1. Add store_id FK to shopping_lists
-- 2. Backfill store_id from existing store_name matches (case-insensitive)
-- 3. Drop store_name column

-- ── Step 1: add FK column ─────────────────────────────────────────────────────
alter table shopping_lists
  add column if not exists store_id uuid references stores(id) on delete set null;

-- ── Step 2: backfill from existing store_name data ───────────────────────────
-- Matches rows where the store_name text equals a stores.name for the same user.
update shopping_lists sl
set    store_id = s.id
from   stores s
where  lower(sl.store_name) = lower(s.name)
  and  sl.user_id            = s.user_id
  and  sl.store_id          is null;

-- ── Step 3: drop the old text column ─────────────────────────────────────────
alter table shopping_lists
  drop column if exists store_name;
