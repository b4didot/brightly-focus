import { FocusEngineError } from "./errors"

export async function getNextWaitingPosition(
  supabase: ReturnType<typeof import("../supabase/server").getSupabaseServerClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("items")
    .select("waiting_position")
    .eq("execution_owner_id", userId)
    .eq("state", "waiting")
    .order("waiting_position", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new FocusEngineError(
      "DB_ERROR",
      `Failed to determine next waiting position for user "${userId}": ${error.message}`
    )
  }

  return (data?.waiting_position ?? 0) + 1
}

export async function normalizeWaitingQueue(
  supabase: ReturnType<typeof import("../supabase/server").getSupabaseServerClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from("items")
    .select("id,waiting_position")
    .eq("execution_owner_id", userId)
    .eq("state", "waiting")
    .order("waiting_position", { ascending: true })

  if (error) {
    throw new FocusEngineError(
      "DB_ERROR",
      `Failed to load waiting queue for user "${userId}" during normalization: ${error.message}`
    )
  }

  const queue = data ?? []
  const existingPositions = queue
    .map((row) => row.waiting_position)
    .filter((value): value is number => typeof value === "number")
  const currentMin = existingPositions.length > 0 ? Math.min(...existingPositions) : 0
  const tempBase = currentMin - queue.length - 10

  // Phase 1: move all waiting positions to unique negative values to avoid
  // collisions with the unique (execution_owner_id, waiting_position) index.
  for (let index = 0; index < queue.length; index += 1) {
    const row = queue[index]
    // Choose temp values strictly below current minimum to prevent collisions.
    const tempPosition = tempBase - index
    const { error: tempUpdateError } = await supabase
      .from("items")
      .update({ waiting_position: tempPosition })
      .eq("id", row.id)
      .eq("execution_owner_id", userId)
      .eq("state", "waiting")

    if (tempUpdateError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed temporary queue normalization for item "${row.id}" and user "${userId}": ${tempUpdateError.message}`,
        true
      )
    }
  }

  // Phase 2: assign final positive sequential positions.
  for (let index = 0; index < queue.length; index += 1) {
    const row = queue[index]
    const expectedPosition = index + 1
    const { error: finalUpdateError } = await supabase
      .from("items")
      .update({ waiting_position: expectedPosition })
      .eq("id", row.id)
      .eq("execution_owner_id", userId)
      .eq("state", "waiting")

    if (finalUpdateError) {
      throw new FocusEngineError(
        "QUEUE_CONFLICT",
        `Failed final queue normalization for item "${row.id}" and user "${userId}": ${finalUpdateError.message}`,
        true
      )
    }
  }
}
