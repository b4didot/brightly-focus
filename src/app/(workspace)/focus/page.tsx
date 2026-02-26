import { FocusPage } from "@/page-views/focus/FocusPage"

type SearchParams = {
  userId?: string
  selectedItemId?: string
}

export default async function FocusRoutePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const params = (await searchParams) ?? {}
  return <FocusPage userId={params.userId} selectedItemId={params.selectedItemId} />
}
