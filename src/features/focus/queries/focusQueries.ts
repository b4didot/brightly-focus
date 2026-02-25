import { unstable_cache } from "next/cache"
import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { toItemView, type DbItem } from "../../items/adapters/itemAdapter"
import { toUserView, type DbUser } from "../../users/adapters/userAdapter"
import type { FocusRouteData } from "../types/viewModels"

function sortByCompletedAtDesc(items: ReturnType<typeof toItemView>[]) {
  return [...items].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
}

async function _getFocusRouteDataImpl(userId?: string): Promise<FocusRouteData> {
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

  // Only fetch items for the selected user (if one is selected)
  let itemsQuery = supabase.from("items").select("*")
  if (selectedUserId) {
    itemsQuery = itemsQuery.eq("execution_owner_id", selectedUserId)
  }

  const { data: itemsData, error: itemsError } = await itemsQuery
  if (itemsError) {
    throw new Error(`Failed to load items: ${itemsError.message}`)
  }

  const items = ((itemsData ?? []) as DbItem[]).map(toItemView)
  const selectedItems = items // Already filtered by user at database level

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

// Cached version with revalidation tag for server actions
export const getFocusRouteData = unstable_cache(_getFocusRouteDataImpl, ["focus-route-data"], {
  revalidate: 3600, // Fallback cache time: 1 hour
  tags: ["focus-route-data"],
})
