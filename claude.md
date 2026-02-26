# CLAUDE CODE ENFORCEMENT — BRIGHTLY: FOCUS

You are working inside the Brightly: Focus repository.

The /docs directory is the single source of truth.

Authoritative documents:

- docs/system-plan.md
- docs/architecture.md
- docs/domain-model.md
- docs/schema.md
- docs/constraints.md
- docs/traceability.md
- docs/decision-log.md

These files define the system.
They are not optional.
They are not suggestions.
They must always reflect reality.

----------------------------------------
SOURCE OF TRUTH RULE
----------------------------------------

If implementation changes behavior,
you MUST update the relevant document in /docs.

If a change would conflict with the documents,
STOP and explain the conflict.

Never silently drift from the docs.

Never "improve" philosophy.

Never reinterpret intent.

----------------------------------------
REQUIRED DESIGN ORDER
----------------------------------------

All changes must follow this order:

1. Architecture
2. Domain Model
3. Data Schema
4. Implementation

If a change affects a higher layer,
that layer must be updated first.

Do not jump directly to code.

----------------------------------------
FOCUS ENGINE PROTECTION
----------------------------------------

The Focus Engine is the sole authority over:

- Item state transitions
- Single Active Item enforcement
- Waiting list ordering rules
- Acceptance flow
- Completion immutability
- Recreation rules

Nothing bypasses this.

If a code change bypasses Focus Engine logic:
REJECT IT.

----------------------------------------
IMMUTABLE RULES
----------------------------------------

- One Active Item per User
- Completed Items are terminal
- No reopening
- No manual progress edits
- Admin cannot reorder User waiting lists
- Projects and Milestones are structural only
- Progress is derived only
- Acceptance required before execution

If a request violates these:
Respond with:

"This cannot be done without breaking the system rules. Here’s why."

----------------------------------------
DOCUMENT SYNCHRONIZATION REQUIREMENT
----------------------------------------

Whenever:

- A new invariant is introduced
- A constraint is modified
- A lifecycle rule changes
- A table structure changes
- An enforcement rule changes

You MUST:

1. Update the relevant file in /docs
2. Update traceability.md if rule mapping changes
3. Add entry to decision-log.md explaining why
4. Ensure schema.md matches actual database constraints

No behavior change without documentation change.

----------------------------------------
NO CLEVERNESS RULE
----------------------------------------

Do not:
- Collapse layers for convenience
- Soften constraints for speed
- Add automation that bypasses acceptance
- Introduce shortcut state transitions
- Encode behavioral pressure

Be conservative.
Be mechanical.
Be aligned.

----------------------------------------
FAILURE CONDITION
----------------------------------------

If something cannot be implemented without violating docs:

Stop.

Explain exactly which document and rule it conflicts with.
Do not workaround.
Do not invent alternatives.