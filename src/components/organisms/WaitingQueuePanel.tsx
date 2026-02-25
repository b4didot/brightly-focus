"use client"

import { useTransition, useState, useEffect } from "react"
import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import { activateItemAction, reorderWaitingItemAction } from "@/features/focus/actions/focusActions"
import { ArrowDownToDot, ArrowUpFromDot, CirclePlay } from "lucide-react"
import styles from "./organisms.module.css"

interface WaitingQueuePanelProps {
  items: Item[]
  selectedUserId: string | null
  selectedItemId: string | null
}

export function WaitingQueuePanel({ items, selectedUserId, selectedItemId }: WaitingQueuePanelProps) {
  const [isPending, startTransition] = useTransition()
  const [waitingItems, setWaitingItems] = useState(items)
  const [error, setError] = useState<string | null>(null)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)

  // Sync state when items or selectedUserId changes (e.g., when switching focus to a different user)
  useEffect(() => {
    setWaitingItems(items)
    setError(null)
    setProcessingItemId(null)
  }, [selectedUserId, items])

  function truncate(value: string | undefined, max: number) {
    if (!value || value.trim().length === 0) {
      return "n/a"
    }
    return value.length > max ? `${value.slice(0, max - 3)}...` : value
  }

  function toItemHref(itemId: string) {
    const params = new URLSearchParams({
      ...(selectedUserId ? { userId: selectedUserId } : {}),
      selectedItemId: itemId,
    })

    return `/focus?${params.toString()}`
  }

  function handleActivate(itemId: string) {
    // Save previous state for rollback
    const previousWaiting = waitingItems

    // Remove the activated item from waiting queue
    const newWaiting = waitingItems.filter((item) => item.id !== itemId)
    setWaitingItems(newWaiting)
    setError(null)
    setProcessingItemId(itemId)

    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", selectedUserId ?? "")
        formData.append("itemId", itemId)
        await activateItemAction(formData)
      } catch (err) {
        // Rollback on error
        setWaitingItems(previousWaiting)
        setError(err instanceof Error ? err.message : "Failed to activate item")
        console.error("Failed to activate item:", err)
      } finally {
        setProcessingItemId(null)
      }
    })
  }

  function handleReorder(itemId: string, direction: "up" | "down") {
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
        formData.append("userId", selectedUserId ?? "")
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

  return (
    <SectionContainer title="Item Queue" tone="secondary">
      {error && (
        <div style={{ color: "var(--error)", marginBottom: "1rem", padding: "0.5rem", backgroundColor: "rgba(255, 0, 0, 0.1)", borderRadius: "0.6rem" }}>
          {error}
        </div>
      )}
      <div className={styles.stack}>
        {waitingItems.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            selectHref={toItemHref(item.id)}
            isSelected={item.id === selectedItemId}
            headerPills={[
              { icon: "project", text: truncate(item.projectName, 18) },
              { icon: "milestone", text: truncate(item.milestoneName, 18) },
            ]}
            descriptionMaxLines={2}
            action={
              <div className={styles.actionRow}>
                <button
                  className={`${styles.actionButton} ${styles.iconButton}`}
                  type="button"
                  disabled={!selectedUserId}
                  aria-label="Start Focus"
                  title="Start Focus"
                  onClick={() => handleActivate(item.id)}
                >
                  <CirclePlay strokeWidth={2.5} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.iconButton}`}
                  type="button"
                  disabled={!selectedUserId || index === 0}
                  aria-label="Move Up"
                  title="Move Up"
                  onClick={() => handleReorder(item.id, "up")}
                >
                  <ArrowUpFromDot strokeWidth={2.5} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.iconButton}`}
                  type="button"
                  disabled={!selectedUserId || index === waitingItems.length - 1}
                  aria-label="Move Down"
                  title="Move Down"
                  onClick={() => handleReorder(item.id, "down")}
                >
                  <ArrowDownToDot strokeWidth={2.5} />
                </button>
              </div>
            }
          />
        ))}
        {waitingItems.length === 0 ? <p className={styles.placeholderText}>No waiting items.</p> : null}
      </div>
    </SectionContainer>
  )
}
