-- Replace ambiguous single-USING policies with explicit per-operation policies.
-- The original policies relied on PostgreSQL using USING as WITH CHECK for INSERT,
-- which is correct but unreadable. This makes the intent explicit.

-- ─── price_history ────────────────────────────────────────────────────────────
drop policy "Users see own price history" on price_history;

create policy "Users read own price history" on price_history
  for select using (
    exists (select 1 from products p where p.id = price_history.product_id and p.user_id = auth.uid())
  );

create policy "Users insert own price history" on price_history
  for insert with check (
    exists (select 1 from products p where p.id = price_history.product_id and p.user_id = auth.uid())
  );

-- ─── shopping_list_items ──────────────────────────────────────────────────────
drop policy "Users see own list items" on shopping_list_items;

create policy "Users read own list items" on shopping_list_items
  for select using (
    exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid())
  );

create policy "Users insert own list items" on shopping_list_items
  for insert with check (
    exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid())
  );

create policy "Users modify own list items" on shopping_list_items
  for update using (
    exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid())
  );

create policy "Users delete own list items" on shopping_list_items
  for delete using (
    exists (select 1 from shopping_lists sl where sl.id = shopping_list_items.list_id and sl.user_id = auth.uid())
  );
