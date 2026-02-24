import { TeamBoard } from "@/features/team/components/TeamBoard"
import { getTeamRouteData } from "@/features/team/queries/teamQueries"

export default async function TeamPage() {
  const data = await getTeamRouteData()
  return <TeamBoard users={data.users} items={data.items} />
}
