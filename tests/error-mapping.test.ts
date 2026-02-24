import { describe, expect, it } from "vitest"
import { FocusEngineError } from "../lib/focus-engine/errors"
import { mapFocusEngineErrorToUserMessage } from "../src/features/focus/actions/errorMapping"

describe("focus action error mapping", () => {
  it("returns retry message for queue conflicts", () => {
    const message = mapFocusEngineErrorToUserMessage(
      new FocusEngineError("QUEUE_CONFLICT", "conflict")
    )
    expect(message).toContain("Please retry")
  })

  it("returns clear ownership/state messages", () => {
    expect(
      mapFocusEngineErrorToUserMessage(
        new FocusEngineError("OWNERSHIP_MISMATCH", "x")
      )
    ).toBe("You can only modify your own items.")

    expect(
      mapFocusEngineErrorToUserMessage(new FocusEngineError("INVALID_STATE", "x"))
    ).toBe("This action is not allowed from the current item state.")
  })
})
