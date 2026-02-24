Brightly: Focus — System Architecture (Model A + Central Focus Engine)
Status

Architecture Locked
Based on System Plan
Scope: System Boundaries & Responsibilities Only

1. Architectural Overview

Brightly is structured around a single behavioral authority:

The Focus Engine

Everything else in the system exists to support structure, identity, visibility, or historical preservation.

Focus protection and execution integrity live exclusively at the Item level.

Projects and Milestones are contextual containers only. They do not participate in execution control.

2. Core Architectural Boundaries

The system is divided into five major boundaries:

Identity & Organization

Work Structure

Focus Engine (Behavioral Core)

Visibility & Progress Projection

Audit & History

Each boundary has strict responsibility separation.

3. Identity & Organization Boundary
Purpose

Defines who exists and what they are allowed to see.

Owns

Organizations

Teams

Users

Roles (User, Admin)

Responsible For

Authentication

Authorization

Visibility scoping

Structural authority permissions

Does Not

Control execution

Enforce focus rules

Modify item lifecycle

Control ordering or activation

This boundary answers:
"Who are you and what can you see?"

4. Work Structure Boundary
Purpose

Defines structural relationships between units of work.

Owns

Projects

Milestones

Items

Steps

Structure Hierarchy

Project
→ contains Milestones (optional)
→ contains Items (directly or through Milestones)

Milestone
→ contains Items

Item
→ optionally contains Steps

Important Rules

Projects and Milestones are contextual containers.

They do not have immutable completion states.

They do not enforce execution behavior.

They do not trigger activation.

They do not control priority.

They do not lock or reopen Items.

They do not participate in Focus Engine logic.

They are structural grouping layers only.

5. Focus Engine (Behavioral Core)
Purpose

Enforces all execution rules defined in the System Plan.

This is the only layer allowed to modify Item execution state.

Nothing bypasses this layer.

Governs
A. Active Item Rule

A user may have only one Active Item at a time.

Attempting to activate another Item triggers a controlled switch.

Switching returns the previous Active Item to Waiting.

B. Waiting List Ownership

Each user owns their ordered waiting list.

Only the user can reorder their waiting list.

Admins cannot reorder another user's list.

C. Assignment & Acceptance

Assigned work enters Offered state.

Work must be accepted before entering Waiting.

Declined work remains visible until clarified.

D. Item Completion

An Item can be marked Completed.

Once Completed, it becomes immutable.

Completed Items cannot be undone.

Completed Items cannot be hidden.

Completed Items cannot be edited.

If additional work is required:

A new Item must be created.

The new Item may reference the original.

The new Item enters Waiting.

E. Step Behavior

Steps exist only to show internal progress within an Item.

Rules:

Steps can be marked/unmarked only while the parent Item is Active.

Step toggling recalculates Item progress.

When an Item transitions to Completed:

All Step states become immutable.

Step states can no longer be modified.

Steps do not have independent lifecycle beyond the parent Item.

F. No Manual Progress Editing

Progress is derived from:

Step completion

Or Item completion (if no Steps exist)

Users cannot manually edit progress values.

6. Visibility & Progress Projection Layer
Purpose

Provides read-only aggregated views of system state.

This layer cannot modify execution state.

Responsible For
A. Progress Roll-up

Step completion
→ calculates Item progress

Item completion
→ contributes to Milestone progress

Milestone progress
→ contributes to Project progress

Milestone and Project progress are always derived.

There is no manual marking of Milestones or Projects as complete.

If new Items are added to a Milestone or Project:

Progress recalculates dynamically.

No reopening logic required.

B. Reporting Views

Current Active Item per user

Ordered Waiting list

Offered items

Historical completed items

Milestone and Project aggregated progress

This layer does not enforce rules.
It reflects state enforced elsewhere.

7. Audit & History Layer
Purpose

Preserves historical integrity.

Tracks

Item completion events

Item recreation events

Focus switches

Assignment acceptance/decline

Step changes while Item is Active

Guarantees

Completed work remains visible historically.

Completion cannot be erased.

Reprioritization does not delete history.

Milestones and Projects do not require reopen history because they are derived layers.

8. Execution Flow Summary

User Action
→ Identity validates permission
→ Focus Engine evaluates rule compliance
→ State changes if valid
→ Audit records change
→ Visibility layer reflects updated state

No state change is allowed without passing through the Focus Engine.

9. Immutability Boundaries

The only immutable execution boundary is:

Item Completion.

Once an Item is Completed:

It cannot return to Active.

Its Steps cannot be modified.

Its progress cannot change.

It cannot be hidden.

Projects and Milestones have no immutable state.

They reflect the state of their child Items.

10. Architectural Principles Enforced

Focus is protected at the Item level.

Structure never controls execution.

Visibility never grants control.

Progress reflects completed work only.

Completion is a deliberate and final boundary.

New work is new work, not history modification.

Higher-level containers remain lightweight and derived.

11. Explicit Non-Features

The system does NOT support:

Undoing completed Items

Manual progress adjustments

Admin-forced focus changes

Admin reordering of user waiting lists

Silent interruptions via assignment

Automatic Milestone/Project finalization

Cascading reopen logic

12. Architectural Outcome

This design ensures:

Focus integrity is centralized and enforceable.

Completion truth is preserved.

Structural containers remain non-disruptive.

Progress remains honest.

Rework does not rewrite history.

Higher-level grouping stays lightweight and calm.

This architecture is stable, predictable, and aligned with the System Plan.