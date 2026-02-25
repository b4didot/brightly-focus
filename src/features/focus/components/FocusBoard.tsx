"use client"

import { useTransition, useState, useEffect, useCallback } from "react"
import type { FocusRouteData, EnrichedItemData } from "../types/viewModels"
import {
  acceptItemAction,
  activateItemAction,
  completeItemAction,
  createUserItemAction,
  reorderWaitingItemAction,
  enrichItemAction,
} from "../actions/focusActions"
import { deleteItemAction } from "../../items/actions/itemDeleteActions"

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function FocusBoard({ data }: { data: FocusRouteData }) {
  const [isPending, startTransition] = useTransition()
  const [activeItem, setActiveItem] = useState(data.activeItem)
  const [waitingItems, setWaitingItems] = useState(data.waitingItems)
  const [offeredItems, setOfferedItems] = useState(data.offeredItems)
  const [completedItems, setCompletedItems] = useState(data.completedItems)
  const [error, setError] = useState<string | null>(null)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)
  
  // Enrichment state
  const [enrichedItems, setEnrichedItems] = useState<Map<string, EnrichedItemData>>(new Map())
  const [enrichmentLoading, setEnrichmentLoading] = useState<string | null>(null)
  const [enrichmentError, setEnrichmentError] = useState<{ itemId: string; message: string } | null>(null)

  // Sync state when data changes (e.g., when switching focus to a different user)
  useEffect(() => {
    setActiveItem(data.activeItem)
    setWaitingItems(data.waitingItems)
    setOfferedItems(data.offeredItems)
    setCompletedItems(data.completedItems)
    setError(null)
    setProcessingItemId(null)
    setEnrichedItems(new Map())
    setEnrichmentError(null)
  }, [data.selectedUserId])

  // Trigger enrichment for active item
  const triggerEnrichment = useCallback(
    async (itemId: string, projectId: string | null, milestoneId: string | null) => {
      // Skip if already enriched
      if (enrichedItems.has(itemId)) {
        return
      }

      setEnrichmentLoading(itemId)
      setEnrichmentError(null)

      try {
        const enriched = await enrichItemAction(itemId, projectId, milestoneId)
        setEnrichedItems((prev) => new Map(prev).set(itemId, enriched))
      } catch (err) {
        setEnrichmentError({
          itemId,
          message: err instanceof Error ? err.message : "Failed to enrich item",
        })
      } finally {
        setEnrichmentLoading(null)
      }
    },
    [enrichedItems]
  )

  // When active item changes, trigger enrichment
  useEffect(() => {
    if (activeItem) {
      triggerEnrichment(activeItem.id, activeItem.projectId ?? null, activeItem.milestoneId ?? null)
    }
  }, [activeItem?.id, triggerEnrichment])

  function handleComplete(userId: string, itemId: string) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", userId)
        formData.append("itemId", itemId)
        await completeItemAction(formData)
      } catch (error) {
        console.error("Failed to complete item:", error)
      }
    })
  }

  function handleAccept(userId: string, itemId: string) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", userId)
        formData.append("itemId", itemId)
        await acceptItemAction(formData)
      } catch (error) {
        console.error("Failed to accept item:", error)
      }
    })
  }

  function handleActivate(userId: string, itemId: string) {
    // Save previous state for rollback
    const previousActive = activeItem
    const previousWaiting = waitingItems

    // Optimistically update state
    const selectedItem = waitingItems.find((item) => item.id === itemId)
    if (!selectedItem) return

    const newWaiting = waitingItems.filter((item) => item.id !== itemId)
    if (previousActive) {
      newWaiting.unshift(previousActive)
    }

    setActiveItem(selectedItem)
    setWaitingItems(newWaiting)
    setError(null)
    setProcessingItemId(itemId)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", userId)
        formData.append("itemId", itemId)
        await activateItemAction(formData)
      } catch (err) {
        // Rollback on error
        setActiveItem(previousActive)
        setWaitingItems(previousWaiting)
        setError(err instanceof Error ? err.message : "Failed to activate item")
        console.error("Failed to activate item:", err)
      } finally {
        setProcessingItemId(null)
      }
    })
  }

  function handleReorder(userId: string, itemId: string, direction: "up" | "down") {
    // Save previous state for rollback
    const previousWaiting = waitingItems

    // Find the item and its current index
    const currentIndex = waitingItems.findIndex((item) => item.id === itemId)
    if (currentIndex === -1) return

    // Calculate target index
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= waitingItems.length) return

    // Optimistically swap items
    const newWaiting = [...waitingItems]
    ;[newWaiting[currentIndex], newWaiting[targetIndex]] = [newWaiting[targetIndex], newWaiting[currentIndex]]
    setWaitingItems(newWaiting)
    setError(null)
    setProcessingItemId(itemId)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", userId)
        formData.append("itemId", itemId)
        formData.append("direction", direction)
        await reorderWaitingItemAction(formData)
      } catch (err) {
        // Rollback on error
        setWaitingItems(previousWaiting)
        setError(err instanceof Error ? err.message : "Failed to reorder item")
        console.error("Failed to reorder item:", err)
      } finally {
        setProcessingItemId(null)
      }
    })
  }

  function handleCreateItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const title = String(formData.get("title") ?? "").trim()
    const userId = String(formData.get("userId") ?? "").trim()

    if (!title || !userId) return

    // Save previous state for rollback
    const previousWaiting = waitingItems

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Create optimistic item
    const optimisticItem = {
      id: tempId,
      title,
      description: null,
      state: "waiting",
      ownerId: null,
      projectId: null,
      milestoneId: null,
      waitingPosition: 0,
      dueAt: null,
      completedAt: null,
    }

    // Optimistically add to waiting queue at position 0
    setWaitingItems([optimisticItem, ...waitingItems])
    setError(null)
    setProcessingItemId(tempId)
    ;(e.target as HTMLFormElement).reset()

    startTransition(async () => {
      try {
        await createUserItemAction(formData)
        // Keep the optimistic item - server confirmed it
      } catch (err) {
        // Rollback on error
        setWaitingItems(previousWaiting)
        setError(err instanceof Error ? err.message : "Failed to create item")
        console.error("Failed to create item:", err)
      } finally {
        setProcessingItemId(null)
      }
    })
  }

  return (
    <div className="page-shell">
      {/* Enrichment Error Dialog */}
      {enrichmentError && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--surface)",
              color: "var(--ink)",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "400px",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Failed to Enrich Item</h3>
            <p style={{ marginBottom: "1.5rem", color: "var(--error)" }}>
              {enrichmentError.message}
            </p>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setEnrichmentError(null)}
                style={{ cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="solid"
                disabled={enrichmentLoading !== null}
                onClick={() => {
                  if (enrichmentError) {
                    triggerEnrichment(
                      enrichmentError.itemId,
                      activeItem?.projectId ?? null,
                      activeItem?.milestoneId ?? null
                    )
                  }
                }}
                style={{ cursor: enrichmentLoading ? "not-allowed" : "pointer" }}
              >
                {enrichmentLoading === enrichmentError.itemId ? "Retrying..." : "Retry"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="top-bar">
        <div>
          <h1>Brightly: Focus</h1>
          <p>Execution state changes are enforced through the Focus Engine.</p>
        </div>
        <form method="get">
          <label>
            Acting as
            <select name="userId" defaultValue={data.selectedUserId ?? ""}>
              {data.users.length === 0 ? (
                <option value="">No users found</option>
              ) : (
                data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                    {user.role ? ` (${user.role})` : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <button type="submit" className="solid" style={{ marginTop: "0.5rem" }}>
            Switch
          </button>
        </form>
      </header>

      <main className="layout-grid">
        <section className="panel">
          <h2>My Focus</h2>
          <p className="muted">{data.selectedUser?.name ?? "No user selected"}</p>

          {error && (
            <div style={{ color: "var(--error)", marginBottom: "1rem", padding: "0.5rem", backgroundColor: "rgba(255, 0, 0, 0.1)", borderRadius: "0.6rem" }}>
              {error}
            </div>
          )}

          <div className="stack">
            <h3>Active</h3>
            {activeItem ? (
              <div className="item-card">
                <p>{activeItem.title}</p>
                {enrichmentLoading === activeItem.id && (
                  <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                    Loading details...
                  </p>
                )}
                {enrichedItems.has(activeItem.id) && (
                  <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.5rem" }}>
                    {enrichedItems.get(activeItem.id)?.projectName && (
                      <div>📁 {enrichedItems.get(activeItem.id)?.projectName}</div>
                    )}
                    {enrichedItems.get(activeItem.id)?.milestoneName && (
                      <div>🎯 {enrichedItems.get(activeItem.id)?.milestoneName}</div>
                    )}
                    {enrichedItems.get(activeItem.id)?.tags.length ?? 0 > 0 && (
                      <div>🏷️ {enrichedItems.get(activeItem.id)?.tags.join(", ")}</div>
                    )}
                    {enrichedItems.get(activeItem.id)?.stepsCount ?? 0 > 0 && (
                      <div>✓ {enrichedItems.get(activeItem.id)?.stepsCount} steps</div>
                    )}
                    {enrichedItems.get(activeItem.id)?.alarmLabel && (
                      <div>⏱️ {enrichedItems.get(activeItem.id)?.alarmLabel}</div>
                    )}
                  </div>
                )}
                <button
                  className="solid"
                  disabled={!data.selectedUserId || isPending}
                  onClick={() => handleComplete(data.selectedUserId ?? "", activeItem!.id)}
                >
                  Complete
                </button>
              </div>
            ) : (
              <p className="empty">No active item.</p>
            )}
          </div>

          <div className="stack">
            <h3>Offered</h3>
            {offeredItems.length === 0 ? (
              <p className="empty">No offered items.</p>
            ) : (
              offeredItems.map((item) => (
                <div key={item.id} className="item-card">
                  <p>{item.title}</p>
                  <button
                    disabled={!data.selectedUserId || isPending}
                    onClick={() => handleAccept(data.selectedUserId ?? "", item.id)}
                  >
                    Accept
                  </button>
                  <form action={deleteItemAction}>
                    <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit">Delete</button>
                  </form>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <h3>Waiting Queue</h3>
            {waitingItems.length === 0 ? (
              <p className="empty">No waiting items.</p>
            ) : (
              waitingItems.map((item, index) => (
                <div key={item.id} className="item-card">
                  <p>
                    {index + 1}. {item.title}
                  </p>
                  <div className="actions">
                    <button
                      disabled={!data.selectedUserId}
                      onClick={() => handleActivate(data.selectedUserId ?? "", item.id)}
                    >
                      Start Focus
                    </button>
                    <button
                      disabled={!data.selectedUserId || index === 0}
                      onClick={() => handleReorder(data.selectedUserId ?? "", item.id, "up")}
                    >
                      Up
                    </button>
                    <button
                      disabled={!data.selectedUserId || index === waitingItems.length - 1}
                      onClick={() => handleReorder(data.selectedUserId ?? "", item.id, "down")}
                    >
                      Down
                    </button>
                    <form action={deleteItemAction}>
                      <input type="hidden" name="actingUserId" value={data.selectedUserId ?? ""} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit">Delete</button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <h3>Create Item</h3>
            <p className="empty">New items are added to the top of your waiting queue.</p>
            <form onSubmit={handleCreateItem} className="stack">
              <input type="hidden" name="userId" value={data.selectedUserId ?? ""} />
              <input type="text" name="title" placeholder="Item title" maxLength={160} required />
              <textarea
                name="description"
                placeholder="Description (optional)"
                rows={3}
                maxLength={1000}
                style={{
                  resize: "vertical",
                  border: "1px solid var(--line)",
                  borderRadius: "0.6rem",
                  background: "var(--surface)",
                  color: "var(--ink)",
                  padding: "0.55rem 0.7rem",
                }}
              />
              <button type="submit" className="solid" disabled={!data.selectedUserId}>
                Add to Waiting
              </button>
            </form>
          </div>
        </section>

        <section className="panel">
          <h2>Recent Completed</h2>
          <p className="muted">Latest completed items for selected user</p>
          <div className="stack">
            {completedItems.length === 0 ? (
              <p className="empty">No completed history yet.</p>
            ) : (
              completedItems.map((item) => (
                <div key={item.id} className="history-row">
                  <span>{item.title}</span>
                  <span>{item.completedAt ? formatDate(item.completedAt) : "n/a"}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Navigation</h2>
          <div className="stack">
            <a href={`/team${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}>
              Team Visibility
            </a>
            <a
              href={`/projects${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}
            >
              Projects
            </a>
            <a
              href={`/milestones${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}
            >
              Milestones
            </a>
            <a
              href={`/history${data.selectedUserId ? `?userId=${encodeURIComponent(data.selectedUserId)}` : ""}`}
            >
              History
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
