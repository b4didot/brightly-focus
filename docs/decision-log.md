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

## ADR-006: Collaborative Structure Editing

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Previous docs constrained structure authoring primarily to admins.
  - Product direction now allows broader team-level participation for contextual planning.
- Decision:
  - Same-team users and admins can create and edit Projects and Milestones.
  - Structural edits remain contextual and cannot bypass Focus Engine execution rules.
- Consequence:
  - Permissions are enforced by org/team membership for structure actions.
  - Focus lifecycle controls remain unchanged and user-owned.

## ADR-007: Project Scope and Context Fields

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Product needs both team-visible and personal project contexts.
  - Reporting should not be skewed by personal planning data.
- Decision:
  - Add `projects.visibility_scope` with allowed values `team|personal`.
  - Add contextual fields:
    - `projects.description`
    - `projects.due_at`
    - `milestones.description`
  - Keep canonical DB field name `name` for projects/milestones and label it as "Title" in UI.
  - Default analytics queries include only `visibility_scope = 'team'`.
- Consequence:
  - Structure views support richer context without affecting execution invariants.
  - Analytics defaults remain stable and comparable.

## ADR-008: Personal-Scope Cascade Deletion with Focus-Safe Guards

- Status: Accepted
- Date: 2026-02-24
- Context:
  - Projects and Milestones are contextual containers.
  - Product requires deletion support but only for personal structure scope.
  - Execution invariants and history lineage must remain protected.
- Decision:
  - Allow cascade deletion only for personal Projects/Milestones.
  - Team-scope containers cannot be deleted via UI or server actions.
  - Allow direct Item deletion only for owner-owned `offered`/`waiting` items.
  - Block deletion of `active`, `completed`, and origin-referenced items.
  - Normalize waiting queues for affected owners after waiting-item deletions.
- Consequence:
  - Structure cleanup is possible without violating focus rules.
  - Deletion paths remain explicit and deterministic through Focus Engine layer.
