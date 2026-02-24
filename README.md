# Brightly: Focus

Internal-alpha implementation of a constraint-first focus system.

## Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Run

```bash
npm install
npm run dev
```

App routes:
- `/focus`
- `/team`
- `/history`

## Required Data Model Expectations

Key tables used directly:
- `users`
- `items`

Focus Engine state assumptions:
- `items.state` includes: `offered`, `waiting`, `active`, `completed`
- `items.execution_owner_id`
- `items.waiting_position`
- `items.completed_at` for completed rows

User profile fields:
- `users.first_name`
- `users.last_name`
- `users.email_address` (unique when provided)
- `users.mobile_number`

Mobile country code support:
- Stored as text in DB (`mobile_number`).
- Country-code format is handled at server/application validation level.

## Core Invariants

- One active item per user.
- Assigned/offered work must be accepted to enter waiting.
- Switching focus moves previous active to top of waiting.
- Completing active auto-activates next waiting.
- Completed is terminal.
- Queue ordering is user-owned.

See:
- `docs/constraints.md`
- `docs/traceability.md`

## Testing Checklist

Follow `docs/test-script.md` for manual end-to-end validation.

## Seed Data Guidance

Seed users first, then items:
1. Insert at least one `users` row with role `user`.
2. Insert `items` rows with `execution_owner_id` referencing user IDs.
3. Use mixed states to test:
   - one `active`
   - multiple `waiting` with ordered `waiting_position`
   - one `offered`
   - some `completed`

## Verification Flow

1. Open `/focus?userId=<user-id>`
2. Accept an offered item.
3. Reorder waiting list.
4. Start focus from waiting.
5. Complete active item.
6. Validate `/team` and `/history` views reflect updates.
