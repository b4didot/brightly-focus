import { createProjectMilestoneAction, updateProjectMilestoneAction } from "../actions/milestoneStructureActions"
import { deleteMilestoneCascadeAction } from "../actions/milestoneDeleteActions"
import { MilestoneLinkedItemComposer } from "../../items/components/milestoneLinkedItemComposer"
import type { MilestoneEditorRouteData } from "../queries/milestoneStructureQueries"

function formatDate(value: string | null) {
  if (!value) {
    return "n/a"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export function MilestoneEditorPanel({ data }: { data: MilestoneEditorRouteData }) {
  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: Milestones</h1>
          <p>Structure editing and milestone-linked item creation.</p>
        </div>
        <div className="actions">
          <a href={`/focus${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}>Focus</a>
          <a href={`/projects${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}>
            Projects
          </a>
        </div>
      </header>

      <main className="layout-grid">
        <section className="panel">
          <h2>Context</h2>
          <form method="get" className="stack">
            <label>
              Acting as
              <select name="userId" defaultValue={data.selectedUserId ?? ""}>
                {data.users.length === 0 ? (
                  <option value="">No users found</option>
                ) : (
                  data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                      {user.role ? ` (${user.role})` : ""}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label>
              Project
              <select name="projectId" defaultValue={data.selectedProjectId ?? ""}>
                {data.projects.length === 0 ? (
                  <option value="">No projects found</option>
                ) : (
                  data.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.visibilityScope})
                    </option>
                  ))
                )}
              </select>
            </label>
            <button type="submit" className="solid">
              Load Project
            </button>
          </form>

          {data.selectedProject ? (
            <div className="inbox-card">
              <p>
                <strong>Project:</strong> {data.selectedProject.name}
              </p>
              <p className="empty">Description: {data.selectedProject.description ?? "n/a"}</p>
              <p className="empty">Due: {formatDate(data.selectedProject.dueAt)}</p>
            </div>
          ) : (
            <p className="empty">Select a project to manage milestones.</p>
          )}
        </section>

        <section className="panel">
          <h2>Create Milestone</h2>
          {!data.selectedUserId || !data.selectedProjectId ? (
            <p className="empty">Select user and project first.</p>
          ) : (
            <form action={createProjectMilestoneAction} className="stack">
              <input type="hidden" name="actingUserId" value={data.selectedUserId} />
              <input type="hidden" name="projectId" value={data.selectedProjectId} />
              <label>
                Title
                <input type="text" name="name" maxLength={200} required />
              </label>
              <label>
                Description
                <textarea name="description" rows={3} maxLength={1500} />
              </label>
              <button type="submit" className="solid">
                Add Milestone
              </button>
            </form>
          )}

          <MilestoneLinkedItemComposer
            actingUserId={data.selectedUserId}
            projectId={data.selectedProjectId}
            milestones={data.milestones}
            users={data.users}
            defaultOwnerId={data.selectedProject?.defaultUserId ?? null}
          />
        </section>

        <section className="panel">
          <h2>Milestone List</h2>
          {data.milestones.length === 0 ? (
            <p className="empty">No milestones yet for this project.</p>
          ) : (
            <div className="stack">
              {data.milestones.map((milestone) => (
                <div key={milestone.id} className="inbox-card">
                  <p>
                    <strong>{milestone.name}</strong>
                  </p>
                  <p className="empty">Items: {milestone.itemCount}</p>
                  <p className="empty">Description: {milestone.description ?? "n/a"}</p>
                  {data.selectedUserId &&
                  data.selectedProject &&
                  data.selectedProject.defaultUserId === data.selectedUserId ? (
                    <form action={deleteMilestoneCascadeAction} className="stack">
                      <input type="hidden" name="actingUserId" value={data.selectedUserId} />
                      <input type="hidden" name="projectId" value={data.selectedProjectId ?? ""} />
                      <input type="hidden" name="milestoneId" value={milestone.id} />
                      <p className="warn">Deletes milestone and deletable items.</p>
                      <button type="submit">Delete Milestone</button>
                    </form>
                  ) : null}

                  <form action={updateProjectMilestoneAction} className="stack">
                    <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
                    <input type="hidden" name="projectId" value={data.selectedProjectId ?? ""} />
                    <input type="hidden" name="milestoneId" value={milestone.id} />
                    <label>
                      Title
                      <input type="text" name="name" defaultValue={milestone.name} maxLength={200} required />
                    </label>
                    <label>
                      Description
                      <textarea name="description" defaultValue={milestone.description ?? ""} rows={2} maxLength={1500} />
                    </label>
                    <button type="submit">Update Milestone</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
