export type FocusEngineErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "OWNERSHIP_MISMATCH"
  | "TRANSITION_NOT_ALLOWED"
  | "QUEUE_CONFLICT"
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
