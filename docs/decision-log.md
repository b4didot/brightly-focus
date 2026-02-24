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
