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

export async function activateItem({
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
    requireState(item, "waiting")
    requireAllowedTransition(item.state, "active")
    requireOwnership(item, normalizedUserId)

    const { data: currentActive, error: activeError } = await supabase
      .from("items")
      .select("*")
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "active")
      .limit(1)
      .maybeSingle()

    if (activeError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load current active item for user "${normalizedUserId}": ${activeError.message}`
      )
    }

    if (currentActive && currentActive.id !== normalizedItemId) {
      const { data: previousActiveUpdated, error: previousActiveError } = await supabase
        .from("items")
        .update({
          state: "waiting",
          waiting_position: 0,
          completed_at: null,
        })
        .eq("id", currentActive.id)
        .eq("state", "active")
        .eq("execution_owner_id", normalizedUserId)
        .select("id")
        .maybeSingle()

      if (previousActiveError) {
        throw new FocusEngineError(
          "QUEUE_CONFLICT",
          `Failed to move previous active item "${currentActive.id}" to waiting: ${previousActiveError.message}`,
          true
        )
      }

      if (!previousActiveUpdated) {
        throw new FocusEngineError(
          "QUEUE_CONFLICT",
          `Previous active item "${currentActive.id}" could not be moved to waiting because it changed during the transition.`,
          true
        )
      }
    }

    const { data: activatedItem, error: activateError } = await supabase
      .from("items")
      .update({
        state: "active",
        waiting_position: null,
        completed_at: null,
      })
      .eq("id", normalizedItemId)
      .eq("state", "waiting")
      .eq("execution_owner_id", normalizedUserId)
      .select("*")
      .maybeSingle()

    if (activateError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to activate item "${normalizedItemId}": ${activateError.message}`,
        true
      )
    }

    if (!activatedItem) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Item "${normalizedItemId}" could not be activated because its state or ownership changed during the transition.`,
        true
      )
    }

    await normalizeWaitingQueue(supabase, normalizedUserId)

    return activatedItem as FocusItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
