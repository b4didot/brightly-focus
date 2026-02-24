import { createProjectStructureAction, updateProjectStructureAction } from "../actions/projectStructureActions"
import { deleteProjectCascadeAction } from "../actions/projectDeleteActions"
import type { ProjectCatalogRouteData } from "../queries/projectCatalogQueries"

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

export function ProjectCatalogPanel({ data }: { data: ProjectCatalogRouteData }) {
  return (
    <div className="page-shell">
      <header className="top-bar">
        <div>
          <h1>Brightly: Projects</h1>
          <p>Team structure with contextual due dates and scope control.</p>
        </div>
        <div className="actions">
          <a href={`/focus${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}>Focus</a>
          <a href={`/milestones${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}>
            Milestones
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
            <button type="submit" className="solid">
              Switch User
            </button>
          </form>

          <p className="empty">
            Analytics default currently includes only projects with scope <code>team</code>.
          </p>
          <p className="empty">Team-scope projects in analytics: {data.analyticsProjects.length}</p>
        </section>

        <section className="panel">
          <h2>Create Project</h2>
          {data.selectedUserId ? (
            <form action={createProjectStructureAction} className="stack">
              <input type="hidden" name="actingUserId" value={data.selectedUserId} />
              <input type="hidden" name="teamId" value={data.selectedTeamId ?? ""} />
              <label>
                Title
                <input type="text" name="name" maxLength={200} required />
              </label>
              <label>
                Description
                <textarea name="description" rows={3} maxLength={1500} />
              </label>
              <label>
                Due At
                <input type="datetime-local" name="dueAt" />
              </label>
              <label>
                Visibility Scope
                <select name="visibilityScope" defaultValue="team">
                  <option value="team">Team</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              <label>
                Default Assignee
                <select name="defaultUserId" defaultValue={data.selectedUserId}>
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                First Milestone Title
                <input type="text" name="firstMilestoneName" maxLength={200} required />
              </label>
              <button type="submit" className="solid">
                Create Project
              </button>
            </form>
          ) : (
            <p className="empty">Select a user to create projects.</p>
          )}
        </section>

        <section className="panel">
          <h2>Project Catalog</h2>
          {data.projects.length === 0 ? (
            <p className="empty">No projects found in this scope.</p>
          ) : (
            <div className="stack">
              {data.projects.map((project) => (
                <div key={project.id} className="inbox-card">
                  <h3>{project.name}</h3>
                  <p className="muted">Scope: {project.visibilityScope}</p>
                  <p className="empty">Description: {project.description ?? "n/a"}</p>
                  <p className="empty">Due: {formatDate(project.dueAt)}</p>
                  <p className="empty">
                    Milestones: {project.milestoneCount} | Linked Items: {project.itemCount}
                  </p>
                  {data.selectedUserId && project.defaultUserId === data.selectedUserId ? (
                    <form action={deleteProjectCascadeAction} className="stack">
                      <input type="hidden" name="actingUserId" value={data.selectedUserId} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <p className="warn">
                        Deletes project, its milestones, and deletable items.
                      </p>
                      <button type="submit">Delete Project</button>
                    </form>
                  ) : null}

                  <form action={updateProjectStructureAction} className="stack">
                    <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
                    <input type="hidden" name="projectId" value={project.id} />
                    <label>
                      Title
                      <input type="text" name="name" defaultValue={project.name} maxLength={200} required />
                    </label>
                    <label>
                      Description
                      <textarea name="description" defaultValue={project.description ?? ""} rows={2} maxLength={1500} />
                    </label>
                    <label>
                      Due At
                      <input
                        type="datetime-local"
                        name="dueAt"
                        defaultValue={project.dueAt ? new Date(project.dueAt).toISOString().slice(0, 16) : ""}
                      />
                    </label>
                    <label>
                      Visibility Scope
                      <select name="visibilityScope" defaultValue={project.visibilityScope}>
                        <option value="team">Team</option>
                        <option value="personal">Personal</option>
                      </select>
                    </label>
                    <label>
                      Default Assignee
                      <select name="defaultUserId" defaultValue={project.defaultUserId}>
                        {data.users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit">Update Project</button>
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
