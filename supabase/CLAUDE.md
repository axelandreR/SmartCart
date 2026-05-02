# supabase/ — Backend Domain

This directory is owned exclusively by the **SmartCart-Backend** agent.

## Rules

- **Never edit existing migration files.** Create a new numbered file.
- Migration naming: `NNN_verb_noun.sql` — number must be 3 digits, sequential.
- Every new table needs `enable row level security` + at least one policy.
- Foreign keys must have `on delete cascade` or `on delete set null` explicitly stated.
- Run `supabase db diff --schema public` after writing a migration to verify it matches intent.

## Current Migration Files

| File | Description |
|------|-------------|
| `migrations/001_initial_schema.sql` | Core tables: stores, products, price_history, shopping_lists, shopping_list_items |

## Edge Functions

Location: `supabase/functions/<name>/index.ts`  
Runtime: Deno  
Deploy: `supabase functions deploy <name>`

## Local Dev

```bash
supabase start                    # Start local stack
supabase db push                  # Apply migrations to local
supabase db reset                 # Reset to clean state + re-apply migrations
supabase functions serve <name>   # Test an edge function locally
```
