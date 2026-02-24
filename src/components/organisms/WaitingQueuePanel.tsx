import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import { activateItemAction, reorderWaitingItemAction } from "@/features/focus/actions/focusActions"
import styles from "./organisms.module.css"

interface WaitingQueuePanelProps {
  items: Item[]
  selectedUserId: string | null
  selectedItemId: string | null
}

export function WaitingQueuePanel({ items, selectedUserId, selectedItemId }: WaitingQueuePanelProps) {
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
            action={
              <div className={styles.actionRow}>
                <form action={activateItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <button className={styles.actionButton} type="submit" disabled={!selectedUserId}>
                    Start Focus
                  </button>
                </form>
                <form action={reorderWaitingItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    className={styles.actionButton}
                    type="submit"
                    disabled={!selectedUserId || index === 0}
                  >
                    Up
                  </button>
                </form>
                <form action={reorderWaitingItemAction}>
                  <input type="hidden" name="userId" value={selectedUserId ?? ""} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    className={styles.actionButton}
                    type="submit"
                    disabled={!selectedUserId || index === items.length - 1}
                  >
                    Down
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
