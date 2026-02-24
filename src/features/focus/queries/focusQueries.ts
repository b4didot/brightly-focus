import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toItemView, type DbItem } from "../../items/adapters/itemAdapter"
import { toUserView, type DbUser } from "../../users/adapters/userAdapter"
import type { FocusRouteData } from "../types/viewModels"

function sortByCompletedAtDesc(items: ReturnType<typeof toItemView>[]) {
  return [...items].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
}

export async function getFocusRouteData(userId?: string): Promise<FocusRouteData> {
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

  const items = ((itemsData ?? []) as DbItem[]).map(toItemView)
  const selectedItems = selectedUserId
    ? items.filter((item) => item.ownerId === selectedUserId)
    : []

  const activeItem = selectedItems.find((item) => item.state === "active") ?? null
  const offeredItems = [...selectedItems]
    .filter((item) => item.state === "offered")
    .sort(
      (a, b) =>
        (a.waitingPosition ?? Number.MAX_SAFE_INTEGER) -
        (b.waitingPosition ?? Number.MAX_SAFE_INTEGER)
    )
  const waitingItems = [...selectedItems]
    .filter((item) => item.state === "waiting")
    .sort(
      (a, b) =>
        (a.waitingPosition ?? Number.MAX_SAFE_INTEGER) -
        (b.waitingPosition ?? Number.MAX_SAFE_INTEGER)
    )
  const completedItems = sortByCompletedAtDesc(
    selectedItems.filter((item) => item.state === "completed")
  ).slice(0, 10)

  return {
    users,
    selectedUserId,
    selectedUser: users.find((user) => user.id === selectedUserId) ?? null,
    activeItem,
    offeredItems,
    waitingItems,
    completedItems,
  }
}
