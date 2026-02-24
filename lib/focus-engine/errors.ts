export type FocusEngineErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "OWNERSHIP_MISMATCH"
  | "TRANSITION_NOT_ALLOWED"
  | "QUEUE_CONFLICT"
  | "DELETE_NOT_ALLOWED_SCOPE"
  | "DELETE_NOT_ALLOWED_STATE"
  | "DELETE_NOT_ALLOWED_ORIGIN_REF"
  | "DELETE_NOT_ALLOWED_PERMISSION"
  | "DELETE_CONFLICT"
  | "DELETE_DB_ERROR"
  | "DB_ERROR"

export class FocusEngineError extends Error {
  code: FocusEngineErrorCode
  retryable: boolean

  constructor(code: FocusEngineErrorCode, message: string, retryable = false) {
    super(message)
    this.name = "FocusEngineError"
    this.code = code
    this.retryable = retryable
  }
}

export function toFocusEngineError(error: unknown): FocusEngineError {
  if (error instanceof FocusEngineError) {
    return error
  }

  if (error instanceof Error) {
    return new FocusEngineError("DB_ERROR", error.message)
  }

  return new FocusEngineError("DB_ERROR", "Unexpected focus engine failure.")
}
