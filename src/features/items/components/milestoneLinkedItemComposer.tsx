import { createMilestoneLinkedItemAction } from "../actions/milestoneLinkedItemActions"
import type { UserView } from "../../users/adapters/userAdapter"

type MilestoneOption = {
  id: string
  name: string
}

export function MilestoneLinkedItemComposer({
  actingUserId,
  projectId,
  milestones,
  users,
  defaultOwnerId,
}: {
  actingUserId: string | null
  projectId: string | null
  milestones: MilestoneOption[]
  users: UserView[]
  defaultOwnerId: string | null
}) {
  return (
    <div className="stack">
      <h3>Create Linked Item</h3>
      <p className="empty">Assigned milestone items are created as offered and require acceptance.</p>
      {!actingUserId || !projectId ? (
        <p className="empty">Select user and project to create linked items.</p>
      ) : milestones.length === 0 ? (
        <p className="empty">Add at least one milestone before creating linked items.</p>
      ) : (
        <form action={createMilestoneLinkedItemAction} className="stack">
          <input type="hidden" name="actingUserId" value={actingUserId} />
          <input type="hidden" name="projectId" value={projectId} />
          <label>
            Title
            <input type="text" name="title" maxLength={160} required />
          </label>
          <label>
            Description
            <textarea name="description" rows={3} maxLength={1000} />
          </label>
          <label>
            Milestone
            <select name="milestoneId" defaultValue={milestones[0]?.id ?? ""}>
              {milestones.map((milestone) => (
                <option key={milestone.id} value={milestone.id}>
                  {milestone.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select name="executionOwnerId" defaultValue={defaultOwnerId ?? ""}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due At
            <input type="datetime-local" name="dueAt" />
          </label>
          <button type="submit" className="solid">
            Create Offered Item
          </button>
        </form>
      )}
    </div>
  )
}
