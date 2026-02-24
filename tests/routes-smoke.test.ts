import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("route smoke", () => {
  it("has core route files", () => {
    expect(existsSync("src/app/focus/page.tsx")).toBe(true)
    expect(existsSync("src/app/team/page.tsx")).toBe(true)
    expect(existsSync("src/app/history/page.tsx")).toBe(true)
  })
})
