# Brightly Focus Manual Test Script

## Preconditions

- Env vars configured in `.env.local`.
- At least two users exist in `users`.
- Seeded items include `offered`, `waiting`, `active`, and `completed`.

## TC-01 Accept Offered Item

1. Go to `/focus?userId=<userA>`.
2. In `Offered`, click `Accept`.
3. Verify item appears in waiting queue.
4. Negative: attempt same action from another user context and confirm failure.

Expected:
- Item transitions `offered -> waiting`.
- Queue position assigned and visible.

## TC-02 Activate Waiting Item (Switch)

1. Ensure user has one active and at least one waiting.
2. Click `Start Focus` on waiting item.
3. Verify new item becomes active.
4. Verify previous active is now first in waiting.

Expected:
- One active item only.
- Previous active moved to top waiting.

## TC-03 Complete Active Item

1. Click `Complete` on active item.
2. Verify item appears in completed history.
3. Verify next waiting item auto-activates.

Expected:
- `active -> completed`
- top waiting auto-promoted to active.

## TC-04 Reorder Waiting Queue

1. Use `Up` and `Down` on middle waiting item.
2. Verify position swaps accordingly.
3. Confirm top cannot move up and bottom cannot move down.

Expected:
- deterministic ordered queue.
- boundary actions blocked.

## TC-05 Multi-user Isolation

1. Use user A context and mutate queue.
2. Switch to user B.
3. Verify user B queue unaffected.

Expected:
- no cross-user execution mutation.

## TC-06 Sparse Schema UI Resilience

1. Ensure optional fields like `name`/`title` are null on some rows.
2. Open `/focus`, `/team`, `/history`.

Expected:
- routes render with fallback labels.
- no runtime crash due to missing optional display fields.

## TC-07 User Creates Own Item

1. Go to `/focus?userId=<userA>`.
2. Use `Create Item` and submit title (optionally description).
3. Verify new item appears at top of waiting queue.
4. If user has active item, verify active item remains unchanged.

Expected:
- new item inserted with owner = userA
- state = waiting
- item positioned at top of waiting
- active item is not replaced
- item is standalone (not attached to milestone)
