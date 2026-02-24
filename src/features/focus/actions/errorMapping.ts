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

  if (error.code === "DELETE_NOT_ALLOWED_SCOPE") {
    return "Only personal-scope structures can be deleted."
  }

  if (error.code === "DELETE_NOT_ALLOWED_PERMISSION") {
    return "You do not have permission to delete this record."
  }

  if (error.code === "DELETE_NOT_ALLOWED_STATE") {
    return "Delete blocked because one or more items are active or completed."
  }

  if (error.code === "DELETE_NOT_ALLOWED_ORIGIN_REF") {
    return "Delete blocked because one or more items are referenced by rework history."
  }

  return error.message
}
