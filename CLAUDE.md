# SmartCart — Claude Code Project Guide

## Project Overview
SmartCart is a PWA for shopping list management with barcode scanning, price history tracking, and Google Sheets export. Stack: React 18 + Vite + Tailwind CSS + Supabase.

## Colors
| Token     | Hex       | Tailwind class prefix |
|-----------|-----------|-----------------------|
| Primary   | `#534AB7` | `primary-*`           |
| Secondary | `#0F6E56` | `secondary-*`         |
| Accent    | `#854F0B` | `accent-*`            |

## 4-Agent Architecture

This project uses four specialized agents. Their full prompts live in `.agents/`. **Always identify which agent's domain a task falls under before proceeding.**

| Agent | File | Domain trigger |
|-------|------|---------------|
| `SmartCart-Frontend`     | `.agents/SmartCart-Frontend.md`     | `src/components/`, `src/pages/`, `src/index.css`, PWA manifest |
| `SmartCart-Backend`      | `.agents/SmartCart-Backend.md`      | `supabase/`, `src/services/supabase.js`, auth flows |
| `SmartCart-Integrations` | `.agents/SmartCart-Integrations.md` | `src/services/`, `src/utils/`, external APIs |
| `SmartCart-QA`           | `.agents/SmartCart-QA.md`           | `tests/`, audits, performance, code review |

### How to invoke a specialized agent
In a Claude Code session, use the **Agent tool** with the contents of the relevant `.agents/*.md` file as the prompt. Example:

```
Agent(subagent_type="general-purpose", prompt=<contents of .agents/SmartCart-Frontend.md> + "\n\nTask: ...")
```

## File Ownership Map

```
src/components/**          → Frontend
src/pages/**               → Frontend
src/index.css              → Frontend
public/manifest.json       → Frontend
vite.config.js             → Frontend (PWA config)
tailwind.config.js         → Frontend

supabase/**                → Backend
src/services/supabase.js   → Backend

src/services/barcodeScanner.js  → Integrations
src/services/googleSheets.js    → Integrations
src/services/products.js        → Integrations (reads) + Backend (schema)
src/services/shoppingLists.js   → Integrations (reads) + Backend (schema)
src/services/stores.js          → Integrations

src/hooks/useStores.js     → Frontend (UI hooks) | Integrations (data hooks)
src/hooks/**               → Frontend (UI hooks) | Integrations (data hooks)
src/utils/**               → Integrations

tests/**                   → QA
*.test.js / *.spec.js      → QA
```

## Shared Conventions (all agents follow these)

### Path alias
Use `@/` for all imports from `src/`. Never use relative `../../`.

```js
// ✅
import Button from '@/components/ui/Button'
// ❌
import Button from '../../components/ui/Button'
```

### Class merging
Always use `cn()` from `@/utils/cn` when combining Tailwind classes conditionally.

### UI language
All user-facing text in **Spanish (es-AR)**. All code (variable names, comments, commits) in **English**.

### Currency
Format with `formatPrice()` from `@/utils/formatters`. Locale: `es-AR`, currency: `ARS`.

### Error handling
- Surface errors with `react-hot-toast` (`toast.error(...)`)
- Log technical details with `console.error` only, never `console.log` in production paths
- Do not catch errors silently

### No direct Supabase queries from components
Always go through a service in `src/services/` or a hook in `src/hooks/`. Components never import `supabase` directly.

### RLS: always include `user_id` explicitly on INSERT
Tables with `user_id` + RLS require the field to be set manually. Supabase does **not** inject it automatically — omitting it causes a `403` in production.

```js
// ✅ Correct
const { data: { user } } = await supabase.auth.getUser()
supabase.from('stores').insert({ user_id: user.id, name })

// ❌ Fails with 403 — RLS rejects the row
supabase.from('stores').insert({ name })
```

This applies to every table that has `WITH CHECK (auth.uid() = user_id)` in its RLS policy (`stores`, future user-scoped tables).

### Migration deploy order: code first, destructive migration second
Never drop or rename a column in a migration before the new code that stops using it is deployed. The wrong order causes `400` errors in production (PostgREST rejects unknown columns in the request body).

```
✅  Deploy new code  →  Run migration (DROP / RENAME)
❌  Run migration    →  Deploy new code   ← breaks production immediately
```

## Price Memory Pipeline

When a shopping list is marked as completed, the app automatically records product and pricing data. This is the core value proposition of SmartCart.

### Flow
```
completeList()
  └─ priceMemoryService.commitPriceMemory(list, items)
       ├─ upsertProduct(item)          — find or create product record
       ├─ price_history INSERT         — record price for this store + date
       └─ shopping_list_items UPDATE   — link item to product_id

DB trigger sync_product_price         — auto-updates products.last_price / prev_price
```

### Key rules
- Only items with a `price` value are committed (items without price are skipped silently).
- `upsertProduct` resolution order: `item.product_id` → barcode match → name match → create new.
- `list.store_id` (UUID FK to `stores`) is used directly — no name lookup needed.
- Per-item errors are swallowed with `console.error` so one bad item never blocks the rest.
- The DB trigger `sync_product_price` fires on every `price_history` INSERT and keeps `products.last_price` / `products.prev_price` in sync automatically — do not update those fields manually.

### Relevant files
- `src/services/products.js` — `priceMemoryService.commitPriceMemory()`
- `src/hooks/useShoppingList.js` — `completeList()` calls the pipeline
- `supabase/migrations/` — trigger definition in an early migration

## Coordination Protocol

```
Backend ──(schema + types)──▶ Integrations ──(hooks/services)──▶ Frontend
                                                                       │
                                                                       ▼
                                                                      QA
```

1. **Backend** defines the DB schema first. When a table changes, update the migration file AND notify the Integrations agent of any column/type changes.
2. **Integrations** owns the service layer. When adding a new API method, export it from the service file and document its return shape in a JSDoc comment.
3. **Frontend** consumes hooks/services only. When a new page needs data, request it from Integrations rather than writing raw queries.
4. **QA** reviews all PRs. It has veto power on anything that breaks accessibility, performance budgets, or RLS policies.

## Performance Budgets (enforced by QA)
- JS bundle: < 350 KB gzipped
- LCP: < 2.5 s on 4G throttle
- CLS: < 0.1
- Lighthouse PWA score: ≥ 90

## Current MVP Status

### Completed ✅
- `stores` table, `storesService`, `useStores` / `useStoreMutations` hooks
- Dynamic store chips in `CreateNewList` (loaded from DB, inline creation)
- `shopping_lists.store_id` FK — migration 006 replaced the old `store_name` text column
- Price memory pipeline (`priceMemoryService.commitPriceMemory`) — fully wired into `completeList()`
- `ActiveShoppingList.jsx` — core shopping UX loop (add, toggle, price, complete)

### Pending — priority order
1. `Scanner.jsx` — barcode scanning + price recording flow
2. `ProductDetail.jsx` — price history chart per product
3. `Analytics.jsx` — real Supabase queries (spend over time, store comparison)
4. Remaining page shells
