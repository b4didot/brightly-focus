import { describe, expect, it } from "vitest"
import { toItemView } from "../src/features/items/adapters/itemAdapter"
import { toUserView } from "../src/features/users/adapters/userAdapter"

describe("adapter fallbacks", () => {
  it("maps user display name from fallback fields", () => {
    expect(toUserView({ id: "u1", full_name: "Alex Doe" }).name).toBe("Alex Doe")
    expect(toUserView({ id: "u2", email: "a@b.com" }).name).toBe("a@b.com")
    expect(toUserView({ id: "u3" }).name).toBe("u3")
  })

  it("maps item with owner/waiting/completed fallbacks", () => {
    const item = toItemView({
      id: "i1",
      owner_id: "u1",
      queue_order: 2,
      completedAt: "2026-01-01T00:00:00Z",
    })

    expect(item.ownerId).toBe("u1")
    expect(item.waitingPosition).toBe(2)
    expect(item.completedAt).toBe("2026-01-01T00:00:00Z")
  })
})
