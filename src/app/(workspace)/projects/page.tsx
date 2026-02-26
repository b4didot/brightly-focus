import { ProjectPage } from "@/page-views/projects/ProjectPage"

type SearchParams = {
  userId?: string
  projectId?: string
  scopeFilter?: string
  tab?: string
  create?: string
}

export default async function ProjectsRoutePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  return (
    <ProjectPage
      userId={params.userId}
      projectId={params.projectId}
      scopeFilter={params.scopeFilter}
      tab={params.tab}
      create={params.create}
    />
  )
}
