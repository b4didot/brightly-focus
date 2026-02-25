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
                <form action={activateItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    className={`${styles.actionButton} ${styles.iconButton}`}
                    type="submit"
                    disabled={!selectedUserId}
                    aria-label="Start Focus"
                    title="Start Focus"
                  >
                    <CirclePlay strokeWidth={2.5} />
                  </button>
                </form>
                <form action={reorderWaitingItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    className={`${styles.actionButton} ${styles.iconButton}`}
                    type="submit"
                    disabled={!selectedUserId || index === 0}
                    aria-label="Move Up"
                    title="Move Up"
                  >
                    <ArrowUpFromDot strokeWidth={2.5} />
                  </button>
                </form>
                <form action={reorderWaitingItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    className={`${styles.actionButton} ${styles.iconButton}`}
                    type="submit"
                    disabled={!selectedUserId || index === items.length - 1}
                    aria-label="Move Down"
                    title="Move Down"
                  >
                    <ArrowDownToDot strokeWidth={2.5} />
                  </button>
                </form>
              </div>
            }
          />
        ))}
        {items.length === 0 ? <p className={styles.placeholderText}>No waiting items.</p> : null}
      </div>
    </SectionContainer>
  )
}
