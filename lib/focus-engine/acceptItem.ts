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

export async function acceptItem({
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

  if (item.state !== "offered") {
    throw new Error(
      `Illegal transition for item "${normalizedItemId}": expected state "offered" but found "${item.state}".`
    )
  }

  if (item.execution_owner_id !== normalizedUserId) {
    throw new Error(
      `Item "${normalizedItemId}" is owned by "${item.execution_owner_id}", not "${normalizedUserId}".`
    )
  }

  const { data: highestWaitingItem, error: waitingError } = await supabase
    .from("items")
    .select("waiting_position")
    .eq("execution_owner_id", normalizedUserId)
    .eq("state", "waiting")
    .order("waiting_position", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (waitingError) {
    throw new Error(
      `Failed to determine next waiting position for user "${normalizedUserId}": ${waitingError.message}`
    )
  }

  const currentMaxWaitingPosition = highestWaitingItem?.waiting_position ?? 0
  const nextWaitingPosition = currentMaxWaitingPosition + 1

  const { data: updatedItem, error: updateError } = await supabase
    .from("items")
    .update({
      state: "waiting",
      waiting_position: nextWaitingPosition,
    })
    .eq("id", normalizedItemId)
    .eq("state", "offered")
    .eq("execution_owner_id", normalizedUserId)
    .select("*")
    .maybeSingle()

  if (updateError) {
    throw new Error(`Failed to accept item "${normalizedItemId}": ${updateError.message}`)
  }

  if (!updatedItem) {
    throw new Error(
      `Item "${normalizedItemId}" could not be accepted because its state or ownership changed during the transaction.`
    )
  }

  return updatedItem as FocusItem
}
