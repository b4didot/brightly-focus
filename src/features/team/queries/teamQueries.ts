import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toItemView, type DbItem } from "../../items/adapters/itemAdapter"
import { toUserView, type DbUser } from "../../users/adapters/userAdapter"

export async function getTeamRouteData() {
  const supabase = getSupabaseServerClient()

  const { data: usersData, error: usersError } = await supabase.from("users").select("*")
  if (usersError) {
    throw new Error(`Failed to load users: ${usersError.message}`)
  }

  const { data: itemsData, error: itemsError } = await supabase.from("items").select("*")
  if (itemsError) {
    throw new Error(`Failed to load items: ${itemsError.message}`)
  }

  const users = ((usersData ?? []) as DbUser[]).map(toUserView)
  const items = ((itemsData ?? []) as DbItem[]).map(toItemView)
  return { users, items }
}
