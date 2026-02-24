import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import { completeItemAction } from "@/features/focus/actions/focusActions"
import styles from "./organisms.module.css"

interface ActiveItemPanelProps {
  item: Item | null
  selectedUserId: string | null
  selectedItemId: string | null
}

export function ActiveItemPanel({ item, selectedUserId, selectedItemId }: ActiveItemPanelProps) {
  const selectHref = item
    ? `/focus?${new URLSearchParams({
        ...(selectedUserId ? { userId: selectedUserId } : {}),
        selectedItemId: item.id,
      }).toString()}`
    : undefined

  return (
    <SectionContainer title="Active Item" emphasize scrollable={false}>
      {item ? (
        <ItemCard
          item={item}
          fillHeight
          selectHref={selectHref}
          isSelected={item.id === selectedItemId}
          action={
            <form action={completeItemAction} className={styles.actionRow}>
              <input type="hidden" name="userId" value={selectedUserId ?? ""} />
              <input type="hidden" name="itemId" value={item.id} />
              <button className={styles.actionButton} type="submit" disabled={!selectedUserId}>
                Complete
              </button>
            </form>
          }
        />
      ) : (
        <p>No active item.</p>
      )}
    </SectionContainer>
  )
}
