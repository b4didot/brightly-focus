"use client"

import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import { ArrowDownToDot, ArrowUpFromDot, CirclePlay } from "lucide-react"
import styles from "./organisms.module.css"

interface WaitingQueuePanelProps {
  items: Item[]
  selectedUserId: string | null
  selectedItemId: string | null
  onActivate: (itemId: string) => void
  onReorder: (itemId: string, direction: "up" | "down") => void
  error?: string | null
  processingItemId?: string | null
}

export function WaitingQueuePanel({
  items,
  selectedUserId,
  selectedItemId,
  onActivate,
  onReorder,
  error = null,
  processingItemId = null,
}: WaitingQueuePanelProps) {

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

  return (
    <SectionContainer title="Item Queue" tone="secondary">
      {error && (
        <div style={{ color: "var(--error)", marginBottom: "1rem", padding: "0.5rem", backgroundColor: "rgba(255, 0, 0, 0.1)", borderRadius: "0.6rem" }}>
          {error}
        </div>
      )}
      <div className={styles.stack}>
        {items.map((item, index) => (
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
                  disabled={!selectedUserId || processingItemId === item.id}
                  aria-label="Start Focus"
                  title="Start Focus"
                  onClick={() => onActivate(item.id)}
                >
                  <CirclePlay strokeWidth={2.5} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.iconButton}`}
                  type="button"
                  disabled={!selectedUserId || index === 0 || processingItemId === item.id}
                  aria-label="Move Up"
                  title="Move Up"
                  onClick={() => onReorder(item.id, "up")}
                >
                  <ArrowUpFromDot strokeWidth={2.5} />
                </button>
                <button
                  className={`${styles.actionButton} ${styles.iconButton}`}
                  type="button"
                  disabled={!selectedUserId || index === items.length - 1 || processingItemId === item.id}
                  aria-label="Move Down"
                  title="Move Down"
                  onClick={() => onReorder(item.id, "down")}
                >
                  <ArrowDownToDot strokeWidth={2.5} />
                </button>
              </div>
            }
          />
        ))}
        {items.length === 0 ? <p className={styles.placeholderText}>No waiting items.</p> : null}
      </div>
    </SectionContainer>
  )
}
