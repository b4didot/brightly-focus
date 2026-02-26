"use client"

import { useTransition, useState, useEffect } from "react"
import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import { acceptItemAction } from "@/features/focus/actions/focusActions"
import { deleteItemAction } from "@/features/items/actions/itemDeleteActions"
import styles from "./organisms.module.css"

interface OfferedQueuePanelProps {
  items: Item[]
  selectedUserId?: string | null
}

export function OfferedQueuePanel({ items, selectedUserId }: OfferedQueuePanelProps) {
  const [isPending, startTransition] = useTransition()
  const [offeredItems, setOfferedItems] = useState(items)
  const [error, setError] = useState<string | null>(null)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)

  // Sync state when items or selectedUserId changes
  useEffect(() => {
    setOfferedItems(items)
    setError(null)
    setProcessingItemId(null)
  }, [selectedUserId, items])

  function handleAccept(itemId: string) {
    // Save previous state for rollback
    const previousOffered = offeredItems

    // 1. IMMEDIATE optimistic update
    const acceptedItem = offeredItems.find((item) => item.id === itemId)
    if (!acceptedItem) return

    // Remove from offered
    const newOffered = offeredItems.filter((item) => item.id !== itemId)

    // Update state optimistically
    setOfferedItems(newOffered)
    setError(null)
    setProcessingItemId(itemId)

    // 2. Run server action in parallel
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("userId", selectedUserId ?? "")
        formData.append("itemId", itemId)
        await acceptItemAction(formData)
        // 3. SUCCESS: Keep optimistic state, server confirmed it
      } catch (err) {
        // 4. FAILURE: Rollback on error
        setOfferedItems(previousOffered)
        setError(err instanceof Error ? err.message : "Failed to accept item")
        console.error("Failed to accept item:", err)
      } finally {
        setProcessingItemId(null)
      }
    })
  }

  function handleDelete(itemId: string) {
    // Save previous state for rollback
    const previousOffered = offeredItems

    // 1. IMMEDIATE optimistic delete
    const newOffered = offeredItems.filter((item) => item.id !== itemId)

    // Update state optimistically
    setOfferedItems(newOffered)
    setError(null)
    setProcessingItemId(itemId)

    // 2. Run server action in parallel
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append("actingUserId", selectedUserId ?? "")
        formData.append("itemId", itemId)
        await deleteItemAction(formData)
        // 3. SUCCESS: Keep optimistic state, server confirmed it
      } catch (err) {
        // 4. FAILURE: Rollback on error
        setOfferedItems(previousOffered)
        setError(err instanceof Error ? err.message : "Failed to delete item")
        console.error("Failed to delete item:", err)
      } finally {
        setProcessingItemId(null)
      }
    })
  }

  return (
    <SectionContainer title="Request Queue (Offer)" tone="secondary">
      {error && (
        <div style={{ color: "var(--error)", marginBottom: "1rem", padding: "0.5rem", backgroundColor: "rgba(255, 0, 0, 0.1)", borderRadius: "0.6rem" }}>
          {error}
        </div>
      )}
      <div className={styles.stack}>
        {offeredItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            action={
              <div className={styles.actionRow}>
                <button
                  className={styles.actionButton}
                  type="button"
                  disabled={!selectedUserId || processingItemId === item.id}
                  aria-label="Accept"
                  title="Accept"
                  onClick={() => handleAccept(item.id)}
                >
                  Accept
                </button>
                <button
                  className={styles.actionButton}
                  type="button"
                  disabled={!selectedUserId || processingItemId === item.id}
                  aria-label="Delete"
                  title="Delete"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </div>
            }
          />
        ))}
        {offeredItems.length === 0 ? <p className={styles.placeholderText}>No offered items.</p> : null}
      </div>
    </SectionContainer>
  )
}
