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

export async function completeItem({
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

  if (item.state !== "active") {
    throw new Error(
      `Illegal transition for item "${normalizedItemId}": expected state "active" but found "${item.state}".`
    )
  }

  if (item.execution_owner_id !== normalizedUserId) {
    throw new Error(
      `Item "${normalizedItemId}" is owned by "${item.execution_owner_id}", not "${normalizedUserId}".`
    )
  }

  const { data: nextWaitingItem, error: waitingError } = await supabase
    .from("items")
    .select("*")
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "waiting")
    .order("waiting_position", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (waitingError) {
    throw new Error(
      `Failed to determine next waiting item for user "${normalizedUserId}": ${waitingError.message}`
    )
  }

  const { data: completedItem, error: completeError } = await supabase
    .from("items")
    .update({
      state: "completed",
      waiting_position: null,
    })
    .eq("id", normalizedItemId)
    .eq("state", "active")
    .eq("execution_owner_id", normalizedUserId)
    .select("*")
    .maybeSingle()

  if (completeError) {
    throw new Error(`Failed to complete item "${normalizedItemId}": ${completeError.message}`)
  }

  if (!completedItem) {
    throw new Error(
      `Item "${normalizedItemId}" could not be completed because its state or ownership changed during the transition.`
    )
  }

  let activatedNextItem: FocusItem | null = null

  if (nextWaitingItem) {
    const { data: updatedNextItem, error: activateError } = await supabase
      .from("items")
      .update({
        state: "active",
        waiting_position: null,
      })
      .eq("id", nextWaitingItem.id)
      .eq("state", "waiting")
      .eq("execution_owner_id", normalizedUserId)
      .select("*")
      .maybeSingle()

    if (activateError) {
      throw new Error(
        `Failed to activate next waiting item "${nextWaitingItem.id}" after completion: ${activateError.message}`
      )
    }

    if (!updatedNextItem) {
      throw new Error(
        `Next waiting item "${nextWaitingItem.id}" could not be activated because it changed during the transition.`
      )
    }

    activatedNextItem = updatedNextItem as FocusItem
  }

  return {
    completedItem: completedItem as FocusItem,
    activatedNextItem,
  }
}
