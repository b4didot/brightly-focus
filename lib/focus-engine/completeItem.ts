import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import {
  requireAllowedTransition,
  requireItemExists,
  requireNonEmptyString,
  requireOwnership,
  requireState,
} from "./guards"
import { normalizeWaitingQueue } from "./queue"

type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

export async function completeItem({
  itemId,
  userId,
}: {
  itemId: string
  userId: string
}) {
  try {
    const normalizedItemId = requireNonEmptyString(itemId, "itemId")
    const normalizedUserId = requireNonEmptyString(userId, "userId")
    const supabase = getSupabaseServerClient()

    const item = await requireItemExists(supabase, normalizedItemId)
    requireState(item, "active")
    requireAllowedTransition(item.state, "completed")
    requireOwnership(item, normalizedUserId)

    const { data: nextWaitingItem, error: waitingError } = await supabase
      .from("items")
      .select("*")
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .order("waiting_position", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (waitingError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to determine next waiting item for user "${normalizedUserId}": ${waitingError.message}`
      )
    }

    const { data: completedItem, error: completeError } = await supabase
      .from("items")
      .update({
        state: "completed",
        waiting_position: null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", normalizedItemId)
      .eq("state", "active")
      .eq("execution_owner_id", normalizedUserId)
      .select("*")
      .maybeSingle()

    if (completeError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to complete item "${normalizedItemId}": ${completeError.message}`,
        true
      )
    }

    if (!completedItem) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Item "${normalizedItemId}" could not be completed because its state or ownership changed during the transition.`,
        true
      )
    }

    let activatedNextItem: FocusItem | null = null

    if (nextWaitingItem) {
      const { data: updatedNextItem, error: activateError } = await supabase
        .from("items")
        .update({
          state: "active",
          waiting_position: null,
          completed_at: null,
        })
        .eq("id", nextWaitingItem.id)
        .eq("state", "waiting")
        .eq("execution_owner_id", normalizedUserId)
        .select("*")
        .maybeSingle()

      if (activateError) {
        throw new FocusEngineError(
          "QUEUE_CONFLICT",
          `Failed to activate next waiting item "${nextWaitingItem.id}" after completion: ${activateError.message}`,
          true
        )
      }

      if (!updatedNextItem) {
        throw new FocusEngineError(
          "QUEUE_CONFLICT",
          `Next waiting item "${nextWaitingItem.id}" could not be activated because it changed during the transition.`,
          true
        )
      }

      activatedNextItem = updatedNextItem as FocusItem
    }

    await normalizeWaitingQueue(supabase, normalizedUserId)

    return {
      completedItem: completedItem as FocusItem,
      activatedNextItem,
    }
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
