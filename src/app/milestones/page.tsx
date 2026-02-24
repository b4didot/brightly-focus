import { MilestoneEditorPanel } from "@/features/milestones/components/milestoneEditorPanel"
import { getMilestoneEditorRouteData } from "@/features/milestones/queries/milestoneStructureQueries"

type SearchParams = {
  userId?: string
  projectId?: string
}

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const data = await getMilestoneEditorRouteData({ userId: params.userId, projectId: params.projectId })
  return <MilestoneEditorPanel data={data} />
}
