import type { FocusEngineError } from "../../../../lib/focus-engine/errors"

export function mapFocusEngineErrorToUserMessage(error: FocusEngineError) {
  if (error.code === "QUEUE_CONFLICT") {
    return "The queue changed while processing your action. Please retry."
  }

  if (error.code === "OWNERSHIP_MISMATCH") {
    return "You can only modify your own items."
  }

  if (error.code === "INVALID_STATE" || error.code === "TRANSITION_NOT_ALLOWED") {
    return "This action is not allowed from the current item state."
  }

  return error.message
}
