import { getSupabaseServerClient } from "../supabase/server"
import { FocusEngineError, toFocusEngineError } from "./errors"
import {
  requireAllowedTransition,
  requireItemExists,
  requireNonEmptyString,
  requireOwnership,
  requireState,
} from "./guards"
import { getNextWaitingPosition, normalizeWaitingQueue } from "./queue"

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

    const { data: waitingRows, error: waitingRowsError } = await supabase
      .from("items")
      .select("id,waiting_position")
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .order("waiting_position", { ascending: true })

    if (waitingRowsError) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Failed to load waiting queue for user "${normalizedUserId}" before accept: ${waitingRowsError.message}`
      )
    }

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

    const positions = (waitingRows ?? [])
      .map((row) => row.waiting_position)
      .filter((value): value is number => typeof value === "number")
    positions.push(nextWaitingPosition)
    const currentMin = positions.length > 0 ? Math.min(...positions) : 0
    const topTempPosition = currentMin - positions.length - 100

    const { data: movedToTopTemp, error: topTempError } = await supabase
      .from("items")
      .update({ waiting_position: topTempPosition })
      .eq("id", normalizedItemId)
      .eq("execution_owner_id", normalizedUserId)
      .eq("state", "waiting")
      .eq("waiting_position", nextWaitingPosition)
      .select("id")
      .maybeSingle()

    if (topTempError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed to move accepted item "${normalizedItemId}" to queue top for user "${normalizedUserId}": ${topTempError.message}`,
        true
      )
    }

    if (!movedToTopTemp) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Accepted item "${normalizedItemId}" changed during top placement.`,
        true
      )
    }

    await normalizeWaitingQueue(supabase, normalizedUserId)

    const { data: refreshed, error: refreshedError } = await supabase
      .from("items")
      .select("*")
      .eq("id", normalizedItemId)
      .maybeSingle()

    if (refreshedError || !refreshed) {
      throw new FocusEngineError(
        "DB_ERROR",
        `Accepted item "${normalizedItemId}" could not be reloaded after queue normalization.`
      )
    }

    return refreshed as FocusItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
