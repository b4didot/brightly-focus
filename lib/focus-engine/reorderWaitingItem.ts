import { getSupabaseServerClient } from "../supabase/server"

type Direction = "up" | "down"

function requireString(value: string, fieldName: string): string {
  if (!value || typeof value !== "string") {
    throw new Error(`${fieldName} is required and must be a non-empty string.`)
  }

  return value
}

function requireDirection(value: string): Direction {
  if (value === "up" || value === "down") {
    return value
  }

  throw new Error(`direction must be either "up" or "down".`)
}

export async function reorderWaitingItem({
  itemId,
  userId,
  direction,
}: {
  itemId: string
  userId: string
  direction: "up" | "down"
}) {
  const normalizedItemId = requireString(itemId, "itemId")
  const normalizedUserId = requireString(userId, "userId")
  const normalizedDirection = requireDirection(direction)
  const supabase = getSupabaseServerClient()

  const { data: queue, error: queueError } = await supabase
    .from("items")
    .select("id,execution_owner_id,state,waiting_position")
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "waiting")
    .order("waiting_position", { ascending: true })

  if (queueError) {
    throw new Error(
      `Failed to load waiting queue for user "${normalizedUserId}": ${queueError.message}`
    )
  }

  const waitingItems = queue ?? []
  const currentIndex = waitingItems.findIndex((entry) => entry.id === normalizedItemId)

  if (currentIndex < 0) {
    throw new Error(
      `Item "${normalizedItemId}" is not in waiting for user "${normalizedUserId}".`
    )
  }

  const currentItem = waitingItems[currentIndex]

  if (currentItem.execution_owner_id !== normalizedUserId) {
    throw new Error(
      `Item "${normalizedItemId}" is owned by "${currentItem.execution_owner_id}", not "${normalizedUserId}".`
    )
  }

  if (currentItem.state !== "waiting") {
    throw new Error(
      `Illegal reorder for item "${normalizedItemId}": expected state "waiting" but found "${currentItem.state}".`
    )
  }

  const targetIndex = normalizedDirection === "up" ? currentIndex - 1 : currentIndex + 1
  if (targetIndex < 0 || targetIndex >= waitingItems.length) {
    throw new Error(
      `Cannot move item "${normalizedItemId}" ${normalizedDirection}; it is already at the queue boundary.`
    )
  }

  const targetItem = waitingItems[targetIndex]
  const currentPosition = currentItem.waiting_position
  const targetPosition = targetItem.waiting_position

  if (currentPosition == null || targetPosition == null) {
    throw new Error(
      `Cannot reorder waiting queue because one or more waiting_position values are null.`
    )
  }

  const tempPosition = -1

  const { data: tempMoved, error: tempError } = await supabase
    .from("items")
    .update({ waiting_position: tempPosition })
    .eq("id", currentItem.id)
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "waiting")
    .eq("waiting_position", currentPosition)
    .select("id")
    .maybeSingle()

  if (tempError) {
    throw new Error(`Failed to begin queue reorder for item "${currentItem.id}": ${tempError.message}`)
  }

  if (!tempMoved) {
    throw new Error(
      `Queue reorder aborted because item "${currentItem.id}" changed during the operation.`
    )
  }

  const { data: targetMoved, error: targetError } = await supabase
    .from("items")
    .update({ waiting_position: currentPosition })
    .eq("id", targetItem.id)
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "waiting")
    .eq("waiting_position", targetPosition)
    .select("id")
    .maybeSingle()

  if (targetError) {
    throw new Error(
      `Failed to move neighboring item "${targetItem.id}" during reorder: ${targetError.message}`
    )
  }

  if (!targetMoved) {
    throw new Error(
      `Queue reorder aborted because neighboring item "${targetItem.id}" changed during the operation.`
    )
  }

  const { data: itemMoved, error: itemError } = await supabase
    .from("items")
    .update({ waiting_position: targetPosition })
    .eq("id", currentItem.id)
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "waiting")
    .eq("waiting_position", tempPosition)
    .select("*")
    .maybeSingle()

  if (itemError) {
    throw new Error(`Failed to finalize reorder for item "${currentItem.id}": ${itemError.message}`)
  }

  if (!itemMoved) {
    throw new Error(
      `Queue reorder failed to finalize because item "${currentItem.id}" changed during the operation.`
    )
  }

  return itemMoved
}
