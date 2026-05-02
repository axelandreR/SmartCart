# src/ — Frontend & Integration Domain

This directory is owned by **SmartCart-Frontend** and **SmartCart-Integrations** agents.

## Quick Rules

- `@/` alias is configured — use it for all imports, never relative `../../`
- All user-facing strings in **Spanish (es-AR)**
- Never import `supabase` directly into a component — use `src/hooks/` instead
- Class names: always use `cn()` from `@/utils/cn` for conditional merging

## Component Architecture

```
src/
  components/
    ui/         ← Primitive design-system components (Button, Input, Card, etc.)
    layout/     ← App-level structural components (BottomNav, PageHeader)
    products/   ← Domain components for the products feature
    lists/      ← (planned) Domain components for shopping lists feature
  pages/        ← One file per route, thin — delegates to hooks and components
  hooks/        ← Data hooks (useQuery wrappers) and mutation hooks
  services/     ← Raw Supabase/API calls — never used directly in components
  utils/        ← Pure functions and constants, no side effects
```

## What Goes Where

| Thing | Where |
|-------|-------|
| Reusable UI element | `components/ui/` |
| Domain-specific UI | `components/<domain>/` |
| A page layout | `pages/` |
| Data fetching + mutations | `hooks/` |
| Supabase `.from()` calls | `services/` |
| Date/price/text formatting | `utils/formatters.js` |
| App-wide constants | `utils/constants.js` |
| LocalStorage wrappers | `utils/storage.js` |
