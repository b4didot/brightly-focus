# Traceability Matrix

| Domain Rule | Schema Enforcement | Focus Engine Function | UI Surface | Test Case ID |
| --- | --- | --- | --- | --- |
| Offered work must be accepted before waiting | `items.state` enum + waiting constraints | `acceptItem` | `/focus` Offered section `Accept` | `TC-01` |
| User has exactly one active item | partial unique index on `items(execution_owner_id)` where state=active | `activateItem` / `completeItem` | `/focus` Waiting `Start Focus`, Active `Complete` | `TC-02`, `TC-03` |
| Switch moves previous active to top waiting | waiting queue + active uniqueness | `activateItem` + queue normalization | `/focus` Waiting `Start Focus` | `TC-02` |
| Completing active auto-activates next waiting | waiting ordering by `waiting_position` | `completeItem` | `/focus` Active `Complete` | `TC-03` |
| Only waiting items are reorderable by owner | waiting position constraints + ownership FK | `reorderWaitingItem` | `/focus` Waiting `Up` / `Down` | `TC-04` |
| Ownership isolation | `execution_owner_id` FK and policies | all focus-engine mutations enforce owner checks | `/focus` acting-user scope | `TC-05` |
| Sparse schema resilience in UI | adapter fallback mapping | n/a (read side) | `/focus`, `/team`, `/history` | `TC-06` |

## Test Case IDs

- `TC-01`: Accept offered item success + invalid owner/state failures.
- `TC-02`: Activate waiting item while another is active.
- `TC-03`: Complete active item and verify next waiting activation.
- `TC-04`: Reorder waiting queue up/down with boundary handling.
- `TC-05`: Cross-user mutation attempts are rejected.
- `TC-06`: Route rendering with sparse optional columns.
