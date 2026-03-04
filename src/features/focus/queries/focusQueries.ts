import { getSupabaseServerClient } from "../../../../lib/supabase/server"
import { withQueryCounter } from "../../../../lib/supabase/queryCounter"
import { toItemView, type DbItem } from "../../items/adapters/itemAdapter"
import { toUserView, type DbUser } from "../../users/adapters/userAdapter"
import type { FocusRouteData } from "../types/viewModels"

function sortByCompletedAtDesc(items: ReturnType<typeof toItemView>[]) {
  return [...items].sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
}

type QueryCounterOptions = {
  queryCounter?: {
    onRequest: (url: string) => void
  }
}

async function _getFocusRouteDataImpl(userId?: string, options?: QueryCounterOptions): Promise<FocusRouteData> {
  const supabase = getSupabaseServerClient({ queryCounter: options?.queryCounter })

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

  const milestoneIds = Array.from(
    new Set(
      items
        .map((item) => item.milestoneId)
        .filter((milestoneId): milestoneId is string => Boolean(milestoneId))
    )
  )

  const milestoneProjectById = new Map<string, string>()
  if (milestoneIds.length > 0) {
    const { data: milestoneRows, error: milestonesError } = await supabase
      .from("milestones")
      .select("id,project_id")
      .in("id", milestoneIds)

    if (milestonesError) {
      throw new Error(`Failed to load milestone projects: ${milestonesError.message}`)
    }

    for (const row of milestoneRows ?? []) {
      const milestoneId = typeof row.id === "string" ? row.id : null
      const projectId = typeof row.project_id === "string" ? row.project_id : null
      if (milestoneId && projectId) {
        milestoneProjectById.set(milestoneId, projectId)
      }
    }
  }

  const hydratedItems = items.map((item) => ({
    ...item,
    projectId: item.projectId ?? (item.milestoneId ? milestoneProjectById.get(item.milestoneId) ?? null : null),
  }))
  const selectedItems = hydratedItems // Already filtered by user at database level

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

export async function getFocusRouteData(userId?: string, options?: QueryCounterOptions) {
  if (options?.queryCounter) {
    return _getFocusRouteDataImpl(userId, options)
  }

  return withQueryCounter({ label: "focus.getFocusRouteData", threshold: 3 }, async (queryCounter) =>
    _getFocusRouteDataImpl(userId, { queryCounter })
  )
}
