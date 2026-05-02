-- SmartCart: add store_name to shopping_lists
--
-- Stores the preferred supermarket chain for a list (e.g. 'Wong', 'Tottus').
-- This is a denormalized text field — no FK to the `stores` table — because
-- the predefined chains (Wong, Plaza Vea, etc.) are not user-created records.
-- User-created stores (with address/coords) live in the `stores` table and
-- can be linked via a future `store_id` FK if needed.

alter table shopping_lists
  add column if not exists store_name text;

-- No RLS change needed: existing policy covers all columns of the table.
-- No index needed: store_name is not used as a filter in high-frequency queries.
