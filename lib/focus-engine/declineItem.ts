import { toFocusEngineError } from "./errors"
import {
  requireItemExists,
  requireNonEmptyString,
  requireOwnership,
  requireState,
} from "./guards"
import { getSupabaseServerClient } from "../supabase/server"

type FocusItem = {
  id: string
  state: string
  execution_owner_id: string
  waiting_position: number | null
  [key: string]: unknown
}

export async function declineItem({
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
    requireOwnership(item, normalizedUserId)
    requireState(item, "offered")

    // Decline is explicit acknowledgment only; lifecycle state remains offered.
    return item as FocusItem
  } catch (error) {
    throw toFocusEngineError(error)
  }
}
