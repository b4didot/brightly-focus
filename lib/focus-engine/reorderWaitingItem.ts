import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import { requireNonEmptyString } from "./guards"
import { normalizeWaitingQueue } from "./queue"

type Direction = "up" | "down"

function requireDirection(value: string): Direction {
  if (value === "up" || value === "down") {
    return value
  }

  throw new FocusEngineError("VALIDATION_ERROR", `direction must be either "up" or "down".`)
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
  try {
    const normalizedItemId = requireNonEmptyString(itemId, "itemId")
    const normalizedUserId = requireNonEmptyString(userId, "userId")
    const normalizedDirection = requireDirection(direction)
    const supabase = getSupabaseServerClient()

    const { data: queue, error: queueError } = await supabase
      .from("items")
      .select("id,execution_owner_id,state,waiting_position")
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .order("waiting_position", { ascending: true })

    if (queueError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load waiting queue for user "${normalizedUserId}": ${queueError.message}`
      )
    }

    const waitingItems = queue ?? []
    const currentIndex = waitingItems.findIndex((entry) => entry.id === normalizedItemId)
    if (currentIndex < 0) {
      throw new FocusEngineError(
        "NOT_FOUND",
        `Item "${normalizedItemId}" is not in waiting for user "${normalizedUserId}".`
      )
    }

    const targetIndex = normalizedDirection === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= waitingItems.length) {
      throw new FocusEngineError(
        "VALIDATION_ERROR",
        `Cannot move item "${normalizedItemId}" ${normalizedDirection}; it is already at the queue boundary.`
      )
    }

    const currentItem = waitingItems[currentIndex]
    const targetItem = waitingItems[targetIndex]
    const currentPosition = currentItem.waiting_position
    const targetPosition = targetItem.waiting_position

    if (currentPosition == null || targetPosition == null) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Cannot reorder waiting queue because one or more waiting_position values are null.`,
        true
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
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to begin queue reorder for item "${currentItem.id}": ${tempError.message}`,
        true
      )
    }

    if (!tempMoved) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Queue reorder aborted because item "${currentItem.id}" changed during the operation.`,
        true
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
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to move neighboring item "${targetItem.id}" during reorder: ${targetError.message}`,
        true
      )
    }

    if (!targetMoved) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Queue reorder aborted because neighboring item "${targetItem.id}" changed during the operation.`,
        true
      )
    }

    const { data: updatedItem, error: updateError } = await supabase
      .from("items")
      .update({ waiting_position: targetPosition })
      .eq("id", currentItem.id)
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .eq("waiting_position", tempPosition)
      .select("*")
      .maybeSingle()

    if (updateError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to finalize reorder for item "${currentItem.id}": ${updateError.message}`,
        true
      )
    }

    if (!updatedItem) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Queue reorder failed to finalize because item "${currentItem.id}" changed during the operation.`,
        true
      )
    }

    await normalizeWaitingQueue(supabase, normalizedUserId)
    return updatedItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
