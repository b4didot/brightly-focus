import { FocusBoard } from "@/features/focus/components/FocusBoard"
import { getFocusRouteData } from "@/features/focus/queries/focusQueries"

type SearchParams = {
  userId?: string
}

export default async function FocusPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const data = await getFocusRouteData(params.userId)
  return <FocusBoard data={data} />
}
