import { getSupabaseServerClient } from "../supabase/server"

type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

function requireString(value: string, fieldName: string): string {
  if (!value || typeof value !== "string") {
    throw new Error(`${fieldName} is required and must be a non-empty string.`)
  }

  return value
}

async function reindexWaitingQueue(userId: string) {
  const supabase = getSupabaseServerClient()
  const { data: waitingItems, error: waitingItemsError } = await supabase
    .from("items")
    .select("id,waiting_position")
    .eq("execution_owner_id", userId)
    .eq("state", "waiting")
    .order("waiting_position", { ascending: true })

  if (waitingItemsError) {
    throw new Error(
      `Failed to load waiting queue for user "${userId}" during reindex: ${waitingItemsError.message}`
    )
  }

  const queue = waitingItems ?? []
  for (let index = 0; index < queue.length; index += 1) {
    const nextPosition = index + 1
    const queueItem = queue[index]
    if (queueItem.waiting_position === nextPosition) {
      continue
    }

    const { error: updateError } = await supabase
      .from("items")
      .update({ waiting_position: nextPosition })
      .eq("id", queueItem.id)
      .eq("execution_owner_id", userId)
      .eq("state", "waiting")

    if (updateError) {
      throw new Error(
        `Failed to reindex waiting item "${queueItem.id}" for user "${userId}": ${updateError.message}`
      )
    }
  }
}

export async function activateItem({
  itemId,
  userId,
}: {
  itemId: string
  userId: string
}) {
  const normalizedItemId = requireString(itemId, "itemId")
  const normalizedUserId = requireString(userId, "userId")
  const supabase = getSupabaseServerClient()

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("*")
    .eq("id", normalizedItemId)
    .maybeSingle()

  if (itemError) {
    throw new Error(`Failed to load item "${normalizedItemId}": ${itemError.message}`)
  }

  if (!item) {
    throw new Error(`Item "${normalizedItemId}" does not exist.`)
  }

  if (item.state !== "waiting") {
    throw new Error(
      `Illegal transition for item "${normalizedItemId}": expected state "waiting" but found "${item.state}".`
    )
  }

  if (item.execution_owner_id !== normalizedUserId) {
    throw new Error(
      `Item "${normalizedItemId}" is owned by "${item.execution_owner_id}", not "${normalizedUserId}".`
    )
  }

  const { data: currentActive, error: activeError } = await supabase
    .from("items")
    .select("*")
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "active")
    .limit(1)
    .maybeSingle()

  if (activeError) {
    throw new Error(
      `Failed to load current active item for user "${normalizedUserId}": ${activeError.message}`
    )
  }

  if (currentActive && currentActive.id !== normalizedItemId) {
    const { data: previousActiveUpdated, error: previousActiveError } = await supabase
      .from("items")
      .update({
        state: "waiting",
        waiting_position: 0,
      })
      .eq("id", currentActive.id)
      .eq("state", "active")
      .eq("execution_owner_id", normalizedUserId)
      .select("id")
      .maybeSingle()

    if (previousActiveError) {
      throw new Error(
        `Failed to move previous active item "${currentActive.id}" to waiting: ${previousActiveError.message}`
      )
    }

    if (!previousActiveUpdated) {
      throw new Error(
        `Previous active item "${currentActive.id}" could not be moved to waiting because it changed during the transition.`
      )
    }
  }

  const { data: activatedItem, error: activateError } = await supabase
    .from("items")
    .update({
      state: "active",
      waiting_position: null,
    })
    .eq("id", normalizedItemId)
    .eq("state", "waiting")
    .eq("execution_owner_id", normalizedUserId)
    .select("*")
    .maybeSingle()

  if (activateError) {
    throw new Error(`Failed to activate item "${normalizedItemId}": ${activateError.message}`)
  }

  if (!activatedItem) {
    throw new Error(
      `Item "${normalizedItemId}" could not be activated because its state or ownership changed during the transition.`
    )
  }

  await reindexWaitingQueue(normalizedUserId)

  return activatedItem as FocusItem
}
