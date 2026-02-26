import { HistoryBoard } from "@/features/history/components/HistoryBoard"
import { getHistoryRouteData } from "@/features/history/queries/historyQueries"

type SearchParams = {
  userId?: string
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  const data = await getHistoryRouteData(params.userId)
  return <HistoryBoard users={data.users} selectedUserId={data.selectedUserId} items={data.items} />
}
