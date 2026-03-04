import { beforeEach, describe, expect, it, vi } from "vitest"

const getSupabaseServerClientMock = vi.fn()
const getItemEnrichmentQueryMock = vi.fn()

vi.mock("../lib/supabase/server", () => ({
  getSupabaseServerClient: (...args: unknown[]) => getSupabaseServerClientMock(...args),
}))

vi.mock("../src/features/focus/queries/itemEnrichmentQuery", () => ({
  getItemEnrichmentQuery: (...args: unknown[]) => getItemEnrichmentQueryMock(...args),
}))

describe("focus select/enrichment actions", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("selectItemAction validates required fields", async () => {
    const { selectItemAction } = await import("../src/features/focus/actions/focusActions")

    await expect(selectItemAction({ userId: "", itemId: "item-1" })).rejects.toThrow(
      "Missing required field \"userId\"."
    )
    await expect(selectItemAction({ userId: "user-1", itemId: "" })).rejects.toThrow(
      "Missing required field \"itemId\"."
    )
  })

  it("selectItemAction returns minimal payload on success", async () => {
    getSupabaseServerClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: { id: "item-1", state: "waiting" }, error: null }),
            }),
          }),
        }),
      }),
    })

    const { selectItemAction } = await import("../src/features/focus/actions/focusActions")
    await expect(selectItemAction({ userId: "user-1", itemId: "item-1" })).resolves.toEqual({
      itemId: "item-1",
      state: "waiting",
    })
  })

  it("getItemEnrichmentAction delegates to centralized query", async () => {
    getSupabaseServerClientMock.mockReturnValue({ mocked: true })
    getItemEnrichmentQueryMock.mockResolvedValue({ id: "item-1", title: "A", summary: "B", status: "waiting" })

    const { getItemEnrichmentAction } = await import("../src/features/focus/actions/focusActions")
    const result = await getItemEnrichmentAction({ userId: "user-1", itemId: "item-1" })

    expect(result).toMatchObject({ id: "item-1", status: "waiting" })
    expect(getItemEnrichmentQueryMock).toHaveBeenCalledTimes(1)
  })
})
