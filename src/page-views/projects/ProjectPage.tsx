import { TopBar } from "@/components/layouts"
import { getProjectsWorkspaceData } from "@/features/projects/queries/projectsWorkspaceQueries"
import { ProjectPageContent } from "./ProjectPageContent"
import { ProjectTopBar } from "./ProjectTopBar"

export async function ProjectPage({
  userId,
  projectId,
  scopeFilter,
  tab,
  create,
}: {
  userId?: string
  projectId?: string
  scopeFilter?: string
  tab?: string
  create?: string
}) {
  const data = await getProjectsWorkspaceData({ userId, projectId, scopeFilter, tab })
  const showCreateForm = create === "1"

  return (
    <>
      <TopBar>
        <ProjectTopBar
          selectedUserId={data.selectedUserId}
          selectedProjectId={data.selectedProjectId}
          scopeFilter={data.scopeFilter}
          activeTab={data.activeTab}
          showCreateForm={showCreateForm}
        />
      </TopBar>
      <ProjectPageContent data={data} showCreateForm={showCreateForm} />
    </>
  )
}
