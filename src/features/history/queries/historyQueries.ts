import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toItemView, type DbItem } from "../../items/adapters/itemAdapter"
import { toUserView, type DbUser } from "../../users/adapters/userAdapter"

export async function getHistoryRouteData(userId?: string) {
  const supabase = getSupabaseServerClient()
  const { data: usersData, error: usersError } = await supabase.from("users").select("*")
  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`)
  }

  const users = ((usersData ?? []) as DbUser[])
    .map(toUserView)
    .sort((a, b) => a.name.localeCompare(b.name))
  const selectedUserId =
    userId && users.some((user) => user.id === userId) ? userId : (users[0]?.id ?? null)

  const { data: itemsData, error: itemsError } = await supabase.from("items").select("*")
  if (itemsError) {
    throw new Error(`Failed to load items: ${itemsError.message}`)
  }

  const items = ((itemsData ?? []) as DbItem[])
    .map(toItemView)
    .filter((item) => item.state === "completed" && item.ownerId === selectedUserId)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))

  return { users, selectedUserId, items }
}
