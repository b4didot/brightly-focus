import { useState } from "react"
import { ItemCard, ItemDescription } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface ItemWindowPanelProps {
  item: Item | null
  onComplete?: () => void
  onDelete?: () => void
  canComplete?: boolean
  canDelete?: boolean
  isProcessing?: boolean
}

export function ItemWindowPanel({
  item,
  onComplete,
  onDelete,
  canComplete = false,
  canDelete = false,
  isProcessing = false,
}: ItemWindowPanelProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  function formatDueDateTime(value: string | undefined) {
    if (!value) {
      return "n/a"
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <SectionContainer title="Description" tone="workspace" hideTitle>
      {item ? (
        <div style={{ display: "grid", gap: "0.8rem", height: "100%", minHeight: 0 }}>
          <div className={styles.itemWindowHeader}>
            <h2 className={styles.itemWindowTitle}>Description</h2>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={[styles.actionButton, styles.actionButtonComplete].join(" ")}
                onClick={onComplete}
                disabled={!canComplete || !onComplete || isProcessing}
              >
                Complete
              </button>
              <button
                type="button"
                className={[styles.actionButton, styles.actionButtonDelete].join(" ")}
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={!canDelete || !onDelete || isProcessing}
              >
                Delete
              </button>
            </div>
          </div>
          <ItemCard
            item={item}
            bottomMeta={[
              { icon: "tags", value: item.tags && item.tags.length > 0 ? item.tags.join(", ") : "No tags" },
              { icon: "alarm", value: item.alarmLabel ?? "No alarm" },
              { icon: "datetime", value: formatDueDateTime(item.dueDateTime) },
              { icon: "steps", value: String(item.stepsCount ?? 0) },
            ]}
            showDescription={false}
          />
          <ItemDescription item={item} />
          {isDeleteConfirmOpen ? (
            <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-label="Confirm delete item">
              <div className={styles.confirmModal}>
                <p className={styles.confirmText}>Are you sure you want to delete this item?</p>
                <div className={styles.confirmActions}>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => {
                      setIsDeleteConfirmOpen(false)
                      onDelete?.()
                    }}
                    disabled={!canDelete || !onDelete || isProcessing}
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <p className={styles.placeholderText}>No item selected.</p>
      )}
    </SectionContainer>
  )
}
