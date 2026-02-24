import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import {
  requireAllowedTransition,
  requireItemExists,
  requireNonEmptyString,
  requireOwnership,
  requireState,
} from "./guards"
import { getNextWaitingPosition } from "./queue"

type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

export async function acceptItem({
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
    requireState(item, "offered")
    requireAllowedTransition(item.state, "waiting")
    requireOwnership(item, normalizedUserId)

    const nextWaitingPosition = await getNextWaitingPosition(supabase, normalizedUserId)

    const { data: updatedItem, error: updateError } = await supabase
      .from("items")
      .update({
        state: "waiting",
        waiting_position: nextWaitingPosition,
        completed_at: null,
      })
      .eq("id", normalizedItemId)
      .eq("state", "offered")
      .eq("execution_owner_id", normalizedUserId)
      .select("*")
      .maybeSingle()

    if (updateError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to accept item "${normalizedItemId}": ${updateError.message}`,
        true
      )
    }

    if (!updatedItem) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Item "${normalizedItemId}" could not be accepted because its state or ownership changed during the transition.`,
        true
      )
    }

    return updatedItem as FocusItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
