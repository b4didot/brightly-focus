Brightly: Focus — Domain Model
Status

Architecture Locked
Model A Confirmed (Projects & Milestones are contextual containers)
Execution governed by Central Focus Engine

Scope:
Entities, ownership, lifecycle meaning, structural vs execution separation, invariants.

1. Domain Modeling Principles

Structure and execution are separate concerns.

Only Items participate in execution lifecycle.

Projects and Milestones are contextual containers.

Completion boundary exists only at Item level.

Rework creates new Items (no reopening).

Progress is derived, never edited.

Visibility never grants control.

Focus belongs exclusively to the User.

2. Identity Entities
Organization

Represents a company boundary.

Owns:

Teams

Users

Projects

Does not participate in execution behavior.

Team

Represents a grouping of Users within an Organization.

Used for:

Visibility grouping

Structural organization

Does not influence execution logic.

User

Represents a person inside an Organization.

A User:

Owns execution of assigned Items

Has at most one Active Item

Owns an ordered Waiting list

Must accept assigned work

Can reorder their own Waiting list

Cannot reorder another User’s Waiting list

Has optional default alarm preference

User is the unit of focus ownership.

3. Structural Entities

Structural entities define scope and grouping.
They do not define execution behavior.

Project

Represents a body of related work.

Characteristics:

Belongs to an Organization

Belongs to a Team

Has a default assigned User (for new Item creation)

Must contain at least one Milestone

Has derived progress from child Items

Has no immutable completion state

Projects are contextual containers.
They do not control focus or lifecycle.

Projects may exist without Items.

If no Items exist:

Progress is undefined.

Milestone

Represents a major phase within a Project.

Characteristics:

Belongs to exactly one Project

May contain zero or more Items

Has derived progress from child Items

Has no immutable completion state

Milestones are structural phase groupings.
They do not affect execution behavior.

If no Items exist:

Progress is undefined.

4. Execution Entities

Execution entities participate in lifecycle behavior.

Item

Primary unit of execution.

Definition:
A discrete unit of work completed by a single User.

Characteristics:

Belongs to exactly one Milestone

Has exactly one execution owner (User)

May reference one origin Item (for rework)

May contain Steps

Has execution lifecycle state

Has derived progress

Only Items can be:

Offered

Waiting

Active

Completed

Completion is immutable.

Step

Represents a progress marker within an Item.

Characteristics:

Belongs to exactly one Item

Has binary completion state

Exists only for internal progress clarity

Has no independent lifecycle

Behavior:

Steps may be toggled only while Item is Active.

When Item transitions to Completed:

All Steps become immutable.

Steps are structural-progress markers.
Not execution owners.

5. Item Execution Lifecycle

Items transition through:

Offered
→ Waiting
→ Active
→ Completed (terminal)

There is no transition out of Completed.

Offered

Assigned to a User

Not yet accepted

Does not enter execution flow

Cannot become Active

Must transition to Waiting via acceptance.

Waiting

Accepted by User

Owned by User

In ordered Waiting list

Not currently focused

Only Waiting Items have order.

Active

The User’s single focused Item

Only one Active Item allowed per User

Steps may be toggled

May transition to Completed

Switch behavior:

If another Item is Active:

Current Active → Waiting (top of list)

New Item → Active

Completed (Terminal State)

Execution finished

Immutable

Cannot transition to another state

Steps become immutable

Progress fixed

Removed from execution flow

If additional work is needed:
A new Item must be created (Recreation).

6. Recreation Model (Rework, Not Reopen)

Recreation is allowed only when:

Item.state = Completed

Recreation creates:

A new Item

Same Milestone

Same Project (inherited)

Same execution owner (unless reassigned)

origin_item reference to original

Same Step definitions

All Steps reset to incomplete

State = Offered (or Waiting if self-created)

Original Item remains:

Completed

Immutable

Unmodified

No reopening allowed.

No cloning of non-completed Items allowed.

7. Origin Relationship

Each Item may have:

No origin (original work)

One origin (rework of completed Item)

Constraints:

Origin must reference Completed Item.

No circular references.

Origin does not alter lifecycle rules.

Lineage preserves history without rewriting it.

8. Waiting List (User Execution Domain)

Each User owns:

One Active Slot

One ordered Waiting list

Zero or more Offered Items

Rules:

Only Waiting Items are ordered.

Active Item is not part of ordering.

Completed Items are not ordered.

Admin cannot reorder another User’s list.

9. Active Focus Alarm

Alarm is part of execution session, not Item structure.

User Preference

User has:

active_item_alarm_default

Allowed values:

NULL

15, 30, 60, 120, 180, 240, 300 (minutes)

Only User may edit their default.

Active Focus Session

Exists only when Item.state = Active.

Represents:

User
→ Active Item
→ Optional alarm interval

Rules:

Only one Active Focus Session per User.

Created automatically when Item becomes Active.

Interval = User default.

User may override interval during Active state.

Override is session-scoped (not persisted).

Session deleted when:

Item leaves Active state

Item transitions to Completed

Alarm does not modify:

State

Progress

Ordering

Ownership

Alarm does not notify other Users.

Alarm does not escalate to Admin.

Alarm is advisory only.

10. Progress Model

Progress is always derived.

Item Progress:

If Steps exist:
completed_steps / total_steps

If no Steps:
0% until Completed
100% at Completion

Milestone Progress:

Derived from child Items

Undefined if zero Items

Project Progress:

Derived from all Items within scope

Undefined if zero Items

No manual progress overrides allowed.

11. Ownership Rules

Each Item has exactly one execution owner.

Admin may assign Items.

Assignment enters Offered state.

Acceptance required before Waiting.

Admin cannot:

Activate Item for User

Reorder User Waiting list

Modify Completed Item

Ownership changes must be explicit.
No automatic cascades when Project default changes.

12. Domain Invariants

A User may have at most one Active Item.

Completed Items are immutable.

Completed Items cannot change state.

Steps cannot change after Item completion.

Only Waiting Items are ordered.

Offered Items cannot become Active.

Structural changes do not alter execution state.

Recreation creates new Item.

Only Completed Items may be recreated.

Non-completed Items cannot be cloned.

Origin cannot form cycles.

Progress is derived only.

Milestones and Projects have no immutable completion state.

Projects must contain at least one Milestone.

Items must belong to a Milestone.

Alarm exists only during Active state.

Alarm resets on every activation.

Alarm does not influence execution behavior.

13. Integrity Summary

This Domain Model guarantees:

Focus protection at Item level

Immutable completion boundary

Honest progress derivation

No lifecycle reversal

Structured rework without history mutation

Lightweight structural containers

Clean separation of structure vs execution

Advisory alarm without behavioral pressure

The system remains calm, predictable, and aligned with the System Plan.