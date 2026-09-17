# SmartCart Agent System

## Overview

Four specialized agents collaborate to build the SmartCart MVP. Each agent has a strict file ownership boundary and defined coordination protocol.

```
┌─────────────────────────────────────────────────────────────┐
│                    SmartCart Agents                         │
├──────────────────┬──────────────────┬───────────────────────┤
│  SmartCart-      │  SmartCart-      │  SmartCart-           │
│  Backend         │  Integrations    │  Frontend             │
│                  │                  │                       │
│  supabase/       │  src/services/   │  src/components/      │
│  DB schema       │  src/hooks/      │  src/pages/           │
│  RLS + Auth      │  src/utils/      │  Tailwind / PWA       │
│  Edge Functions  │  External APIs   │  13 interfaces        │
└────────┬─────────┴────────┬─────────┴───────────┬───────────┘
         │  schema changes  │   hook interfaces   │
         └──────────────────┼─────────────────────┘
                            │
                   ┌────────▼────────┐
                   │ SmartCart-QA    │
                   │                 │
                   │ tests/          │
                   │ audits          │
                   │ code review     │
                   └─────────────────┘
```

## How to Invoke an Agent

In Claude Code, spawn an agent with the Agent tool. Use the contents of the agent's `.md` file as the system prompt prefix, then append the specific task.

### Pattern
```
[paste contents of .agents/SmartCart-Frontend.md]

---
Task: [describe exactly what to implement]
Context: [any relevant information the agent needs]
```

### Example invocations

**Frontend — implement budget spending calculation:**
```
[contents of SmartCart-Frontend.md]

Task: Update src/pages/Budget.jsx to show real spent amounts for the current month.
Context: The hook useShoppingLists() returns lists with status='completed'. 
Each list has shopping_list_items with price and quantity fields.
Calculate spent as: sum(price * quantity) for all items in completed lists this month.
```

**Backend — add product sharing:**
```
[contents of SmartCart-Backend.md]

Task: Create migration 002_add_list_sharing.sql implementing the list_members table
described in the "Planned Schema Additions" section of this profile.
Include appropriate RLS policies for all roles (owner, editor, viewer).
```

**Integrations — add price recording service:**
```
[contents of SmartCart-Integrations.md]

Task: Add a recordPrice(productId, storeId, price) method to src/services/products.js
and a useRecordPrice() hook in src/hooks/useShoppingList.js that wraps it with
toast feedback and offline queue support.
```

**QA — audit the Scanner page:**
```
[contents of SmartCart-QA.md]

Task: Run a full audit on src/pages/Scanner.jsx against the Frontend page audit
checklist. Report each item as PASS / FAIL / N/A with a specific line reference
for each FAIL. Then write Playwright e2e tests covering the scan → add to list flow.
```

## Coordination Workflow for a New Feature

```
1. Backend:   Write/update migration SQL
              → Notify Integrations: "table X has new columns Y, Z"

2. Integrations: Update service methods + JSDoc
                 Add/update hook
                 → Notify Frontend: "useX() now returns { ..., newField }"

3. Frontend:  Implement the UI using the new hook
              → Mark page as "ready for QA"

4. QA:        Run audit checklist
              → PASS: feature ships
              → FAIL: return to responsible agent with line references
```

## Agent Files

| File | Agent |
|------|-------|
| `SmartCart-Frontend.md` | UI & PWA implementation |
| `SmartCart-Backend.md` | Supabase, DB, Edge Functions |
| `SmartCart-Integrations.md` | Service layer, hooks, external APIs |
| `SmartCart-QA.md` | Tests, audits, performance |
