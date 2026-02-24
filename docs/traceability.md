# Traceability Matrix

| Domain Rule | Schema Enforcement | Focus Engine Function | UI Surface | Test Case ID |
| --- | --- | --- | --- | --- |
| Offered work must be accepted before waiting | `items.state` enum + waiting constraints | `acceptItem` | `/focus` Offered section `Accept` | `TC-01` |
| User has exactly one active item | partial unique index on `items(execution_owner_id)` where state=active | `activateItem` / `completeItem` | `/focus` Waiting `Start Focus`, Active `Complete` | `TC-02`, `TC-03` |
| Switch moves previous active to top waiting | waiting queue + active uniqueness | `activateItem` + queue normalization | `/focus` Waiting `Start Focus` | `TC-02` |
| Completing active auto-activates next waiting | waiting ordering by `waiting_position` | `completeItem` | `/focus` Active `Complete` | `TC-03` |
| Only waiting items are reorderable by owner | waiting position constraints + ownership FK | `reorderWaitingItem` | `/focus` Waiting `Up` / `Down` | `TC-04` |
| User-created items enter waiting top without interrupting active | waiting constraints + ownership FK | `createUserItem` | `/focus` Create Item `Add to Waiting` | `TC-07` |
| Ownership isolation | `execution_owner_id` FK and policies | all focus-engine mutations enforce owner checks | `/focus` acting-user scope | `TC-05` |
| Sparse schema resilience in UI | adapter fallback mapping | n/a (read side) | `/focus`, `/team`, `/history` | `TC-06` |
| Project scope is explicit and analytics-default excludes personal | `projects.visibility_scope` check + index | n/a (read/query policy) | `/projects` catalog and reporting queries | `TC-08` |
| Projects carry contextual due date and description only | `projects.description`, `projects.due_at` | n/a (non-execution metadata) | `/projects` create/update form | `TC-09` |
| Milestones carry contextual description | `milestones.description` | n/a (non-execution metadata) | `/milestones` create/update form | `TC-10` |
| Linked milestone item assignment enters offered | `items.state` enum + milestone FK | `createAssignedMilestoneItem` | `/milestones` linked item composer | `TC-11` |
| Same-team users can edit structure without execution control | org/team membership checks in structure actions | n/a (focus transitions unchanged) | `/projects`, `/milestones` actions | `TC-12` |

## Test Case IDs

- `TC-01`: Accept offered item success + invalid owner/state failures.
- `TC-02`: Activate waiting item while another is active.
- `TC-03`: Complete active item and verify next waiting activation.
- `TC-04`: Reorder waiting queue up/down with boundary handling.
- `TC-05`: Cross-user mutation attempts are rejected.
- `TC-06`: Route rendering with sparse optional columns.
- `TC-07`: User-created item inserts at top of waiting and keeps current active unchanged.
- `TC-08`: Team-scope projects appear in analytics; personal scope excluded by default.
- `TC-09`: Project due date/description persist and display with no lifecycle effects.
- `TC-10`: Milestone description persists and renders.
- `TC-11`: Milestone-linked item creates as offered and requires acceptance before waiting.
- `TC-12`: Same-team structure edits succeed; cross-team edits rejected.
| Personal-scope-only structure deletion | `projects.visibility_scope` + app permission checks | `deleteProjectCascade`, `deleteMilestoneCascade` | `/projects`, `/milestones` delete actions | `TC-13` |
| Direct item delete restricted to owner offered/waiting | item state + owner checks | `deleteItem` | `/focus` delete actions for offered/waiting | `TC-14` |
| Cascade blocked by active/completed or origin-linked items | app-level blocker checks before delete | `deleteProjectCascade`, `deleteMilestoneCascade` | `/projects`, `/milestones` error states | `TC-15` |
| Queue remains contiguous after waiting deletions | waiting queue normalization | `deleteItem`, `deleteProjectCascade`, `deleteMilestoneCascade` | `/focus` immediate rerender after delete | `TC-16` |

- `TC-13`: personal project/milestone delete succeeds; team-scope delete hidden and rejected.
- `TC-14`: offered/waiting owner item delete succeeds; non-owner and active/completed states fail.
- `TC-15`: cascade delete blocked when any child item is active/completed/origin-referenced.
- `TC-16`: waiting queue reindexes correctly after single and cascade deletions.
