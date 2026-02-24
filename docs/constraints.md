# Brightly Focus Constraints

Canonical non-negotiables derived from:
1. `docs/domain-model.md`
2. `docs/schema.md`
3. `docs/architecture.md`

## Execution Invariants

- A user may have only one active item at a time.
- Assigned work enters `offered`.
- `offered` work must be accepted before entering `waiting`.
- Switching focus moves previous active item to the top of waiting.
- Completing active item auto-activates the top waiting item.
- Completed items are terminal and immutable.
- Only waiting items have queue ordering.
- Queue ordering is user-owned; admin cannot reorder user queue.

## State Machine

Allowed:
- `offered -> waiting`
- `waiting -> active`
- `active -> waiting`
- `active -> completed`

Denied:
- `completed -> any`
- `offered -> active`
- `waiting -> completed`

## Visibility Boundaries

- Visibility does not grant execution control.
- Team/admin views are read-only for execution transitions.
- State transitions must pass through Focus Engine.

## Data Integrity Rules

- Items may be standalone (no milestone) or milestone-linked.
- `waiting_position` must exist only for waiting items.
- `waiting_position` must be null for non-waiting items.
- `completed_at` is required for completed items and null otherwise.
- Origin/rework references must not mutate completed history.

## Deletion Invariants (Personal Scope)

- Deletion of Projects and Milestones is allowed only for `visibility_scope = 'personal'`.
- Team-scope Projects and Milestones must not expose delete actions in UI.
- Personal Project/Milestone delete requires the acting user to be the personal owner (`projects.default_user_id`).
- Direct Item deletion is allowed only for item owner and only when state is `offered` or `waiting`.
- `active` and `completed` items are never deletable by this flow.
- Items referenced by `origin_item_id` are never deletable.
- Cascade deletion must remove dependent rows in this order:
  1. `active_focus_sessions`
  2. `item_tags`
  3. `steps`
  4. `items`
- After deleting waiting items, affected owners' waiting queues must be normalized.
- Successful deletes must revalidate `/focus`, `/projects`, and `/milestones` to avoid stale UI.
