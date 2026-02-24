import { describe, expect, it } from "vitest"
import { isAllowedTransition } from "../lib/focus-engine/policy"

describe("focus transition policy", () => {
  it("allows expected transitions", () => {
    expect(isAllowedTransition("offered", "waiting")).toBe(true)
    expect(isAllowedTransition("waiting", "active")).toBe(true)
    expect(isAllowedTransition("active", "waiting")).toBe(true)
    expect(isAllowedTransition("active", "completed")).toBe(true)
  })

  it("blocks illegal transitions", () => {
    expect(isAllowedTransition("completed", "active")).toBe(false)
    expect(isAllowedTransition("offered", "active")).toBe(false)
    expect(isAllowedTransition("waiting", "completed")).toBe(false)
  })
})
