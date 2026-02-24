Brightly: Focus — Data Schema
Status

Architecture Locked
Domain Model Locked
Scope: Tables, Relationships, Constraints, Enforced Invariants

This schema must enforce all domain invariants structurally where possible.
Focus Engine enforces lifecycle transitions at application level.

1. Identity Tables
organizations

id (PK)

name (NOT NULL)

created_at (NOT NULL)

teams

id (PK)

organization_id (FK → organizations.id, NOT NULL)

name (NOT NULL)

created_at (NOT NULL)

Constraints:

team.organization_id must reference existing organization

users

id (PK)

organization_id (FK → organizations.id, NOT NULL)

team_id (FK → teams.id, NULL allowed)

first_name (TEXT, NULL allowed)

last_name (TEXT, NULL allowed)

email_address (TEXT, NULL allowed)

mobile_number (TEXT, NULL allowed)

role (ENUM: 'user', 'admin', NOT NULL)

active_item_alarm_default (INTEGER, NULL allowed)

created_at (NOT NULL)

Constraints:

role limited to allowed values

email_address unique when provided

active_item_alarm_default must be one of:
NULL, 15, 30, 60, 120, 180, 240, 300

user.organization_id must match team.organization_id (if team_id not NULL)

2. Structural Tables
projects

id (PK)

organization_id (FK → organizations.id, NOT NULL)

team_id (FK → teams.id, NOT NULL)

default_user_id (FK → users.id, NOT NULL)

name (NOT NULL)

created_at (NOT NULL)

Constraints:

default_user_id must belong to same organization

default_user_id must belong to same team

project must belong to exactly one team

project must belong to exactly one organization

Domain Enforcement (application-level):

A project must have at least one milestone.

Project creation and first milestone creation must occur in same transaction.

milestones

id (PK)

project_id (FK → projects.id, NOT NULL)

name (NOT NULL)

created_at (NOT NULL)

Constraints:

milestone must belong to exactly one project

3. Execution Tables
items

id (PK)

milestone_id (FK → milestones.id, NULL allowed for standalone items)

execution_owner_id (FK → users.id, NOT NULL)

origin_item_id (FK → items.id, NULL allowed)

state (ENUM: 'offered', 'waiting', 'active', 'completed', NOT NULL)

waiting_position (INTEGER, NULL allowed)

created_at (NOT NULL)

completed_at (TIMESTAMP, NULL allowed)

due_at (TIMESTAMP, NULL allowed)

title (NOT NULL)

description (TEXT, NULL allowed)

Constraints:

Structural

milestone_id may be NULL (standalone item) or reference an existing milestone

execution_owner_id NOT NULL

State Validity

state must be one of:
'offered', 'waiting', 'active', 'completed'

Completion Consistency

completed_at NOT NULL when state = 'completed'

completed_at NULL when state != 'completed'

Waiting Order Rules

waiting_position NOT NULL when state = 'waiting'

waiting_position NULL when state != 'waiting'

Unique Waiting Order

Unique (execution_owner_id, waiting_position)
WHERE state = 'waiting'

Single Active Per User

Unique (execution_owner_id)
WHERE state = 'active'

Origin Rules

origin_item_id cannot equal id

origin_item_id must reference existing item

origin_item must be in state = 'completed' (enforced at application level)

circular lineage prevention enforced at application level

steps

id (PK)

item_id (FK → items.id, NOT NULL)

name (NOT NULL)

is_completed (BOOLEAN NOT NULL DEFAULT FALSE)

created_at (NOT NULL)

Constraints:

step must belong to exactly one item

Application-Level Enforcement:

If parent item.state = 'completed', step updates must be rejected.

4. Tags (Optional Metadata)
tags

id (PK)

organization_id (FK → organizations.id, NOT NULL)

name (NOT NULL)

Constraint:

tag names unique per organization

item_tags (junction table)

item_id (FK → items.id, NOT NULL)

tag_id (FK → tags.id, NOT NULL)

Primary Key:

(item_id, tag_id)

Tags do not affect execution behavior.

5. Active Focus Session (Alarm System)

Alarm is execution-session state, not structural.

active_focus_sessions

user_id (PK, FK → users.id)

item_id (FK → items.id, UNIQUE)

interval_minutes (INTEGER, NOT NULL)

started_at (TIMESTAMP, NOT NULL)

next_trigger_at (TIMESTAMP, NOT NULL)

Constraints:

Only one row per user (user_id as PK)

item_id must reference item where state = 'active'

interval_minutes must match allowed set:
15, 30, 60, 120, 180, 240, 300

Application-Level Enforcement:

Session created automatically when Item becomes Active.

Session deleted when:

Item leaves Active state

Item transitions to Completed

Session reset on focus switch.

Alarm does not modify state or progress.

6. Progress Model (Derived Only)

No progress columns stored on:

milestones

projects

Milestone Progress:
COUNT(items WHERE state = 'completed') / COUNT(items)
(only items linked to that milestone)

Project Progress:
COUNT(all completed items in project) / COUNT(all items in project)
(only items linked through project milestones)

If COUNT = 0:
Progress is undefined.

No manual overrides allowed.

7. State Transition Enforcement (Application Layer)

Valid transitions:

offered → waiting
waiting → active
active → waiting (switch)
active → completed

Invalid transitions:

completed → any state
offered → active
waiting → completed

Focus Engine must enforce transition graph.

8. Deletion Rules

Recommended restrictions:

Completed items: cannot be hard deleted if referenced by origin.

Items referenced by other items as origin: restrict delete.

Milestones cannot be deleted if items exist.

Projects cannot be deleted if milestones exist.

Prefer archival strategy over hard deletion.

9. Schema-Enforced Invariants

Database-Level Guarantees:

✔ One Active Item per User
✔ Unique waiting order per User
✔ Items may be standalone or milestone-linked
✔ Valid state values only
✔ Completion timestamp consistency
✔ Origin cannot self-reference
✔ Alarm limited to Active state
✔ Only one Active Focus Session per User

Application-Level Guarantees:

✔ Valid lifecycle transitions
✔ No step modification after completion
✔ Only completed items may be recreated
✔ No circular origin chains
✔ Acceptance required before Waiting
✔ Admin cannot reorder User Waiting list
✔ Project must have at least one Milestone

10. Integrity Summary

This schema guarantees:

Focus isolation at data level

Immutable completion boundary

Structured recreation without reopen

Clean structural containment

No progress manipulation

Honest roll-up logic

Advisory alarm scoped to execution session

No behavioral pressure encoded in schema

The system is mechanically enforceable and aligned with the Domain Model.

11. Structural Context Additions (Current Contract)

Projects include additional contextual fields:

- `visibility_scope` TEXT NOT NULL DEFAULT `team`
  - Allowed values: `team`, `personal`
- `description` TEXT NULL
- `due_at` TIMESTAMPTZ NULL

Milestones include:

- `description` TEXT NULL

Indexing:

- `idx_projects_team_scope_created_at` on `(team_id, visibility_scope, created_at DESC)`

Behavior notes:

- `due_at` is contextual metadata only; it does not affect execution lifecycle.
- Default analytics/reporting datasets must filter `projects.visibility_scope = 'team'`.
- Projects and milestones keep canonical DB field `name`; UI may label it as Title.

12. Deletion Enforcement (Application Layer)

Current deletion contract:

- Project deletion: allowed only for `projects.visibility_scope = 'personal'`.
- Milestone deletion: allowed only when parent project scope is `personal`.
- Team-scope structures are non-deletable in application paths.

Item deletion constraints in application:

- Allowed only for owner-owned items in `offered` or `waiting` states.
- Blocked for `active` and `completed` states.
- Blocked when item is referenced by another row via `origin_item_id`.

Cascade cleanup order for deletable items:

1. `active_focus_sessions` by `item_id`
2. `item_tags` by `item_id`
3. `steps` by `item_id`
4. `items`

Post-delete consistency:

- Normalize waiting queue for affected owners when waiting items are deleted.
- Revalidate route views (`/focus`, `/projects`, `/milestones`) after successful deletes.
