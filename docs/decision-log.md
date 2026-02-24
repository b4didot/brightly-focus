# Decision Log (ADR-style)

## ADR-001: Item Steps vs Optional Item Milestones

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Domain model uses `Step` as item-level progress marker.
  - System plan references optional item milestones in some sections.
- Decision:
  - Treat `steps` as canonical implementation unit for item-internal progress.
  - Keep milestone-level structure at project scope (`milestones`) as already modeled.
- Consequence:
  - No schema change required.
  - UI/progress logic references `steps` for item-level granularity.

## ADR-002: Routing Scope vs Single-Page Prototype

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Prototype concentrated focus/team/history on `/`.
  - Architecture boundary requires clearer read vs control surfaces.
- Decision:
  - Split into dedicated routes:
    - `/focus`
    - `/team`
    - `/history`
  - `/` redirects to `/focus`.
- Consequence:
  - Feature boundaries become explicit.
  - Route-level loading/error handling becomes available.

## ADR-003: Non-Atomic Writes vs Required Invariants

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Supabase client writes are multi-step and can race.
  - Invariants still require deterministic outcomes.
- Decision:
  - Use guarded updates on state + owner checks for each transition step.
  - Normalize waiting queue after mutation operations.
  - Emit typed focus-engine errors with retry hints for conflict scenarios.
- Consequence:
  - Stronger behavior under concurrency without schema change.
  - Server actions can display stable, user-safe error messages.

## ADR-004: Standalone User-Created Items

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Current schema originally required `items.milestone_id` (NOT NULL).
  - Product requirement: users can create standalone personal items not attached to project/milestone context.
- Decision:
  - Make `items.milestone_id` nullable.
  - Keep FK when milestone is present.
  - Treat standalone items as outside milestone/project rollups unless explicitly linked.
- Consequence:
  - Create-item flow no longer requires milestone lookup.
  - Structure views must support a standalone/no-milestone bucket where milestone grouping is shown.

## ADR-005: User Profile Identity Fields

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Existing `users` table lacked identity fields needed for clear UI identification.
- Decision:
  - Add optional profile fields on `users`:
    - `first_name`
    - `last_name`
    - `email_address`
    - `mobile_number`
  - Keep role and execution ownership model unchanged.
  - Keep `email_address` unique when provided.
- Consequence:
  - User/Admin UI can identify people without relying on generated IDs.
  - Mobile country-code semantics remain server/application-level formatting rules, with DB storing raw profile value.
