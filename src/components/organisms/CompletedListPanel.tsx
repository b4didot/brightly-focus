import { Button } from "@/components/atoms"
import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface CompletedListPanelProps {
  items: Item[]
  onRecreate?: (itemId: string) => void
}

export function CompletedListPanel({ items, onRecreate }: CompletedListPanelProps) {
  return (
    <SectionContainer title="Completed Items" tone="secondary">
      <div className={styles.stack}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            action={<Button label="Recreate" onClick={() => onRecreate?.(item.id)} variant="secondary" />}
          />
        ))}
        {items.length === 0 ? <p className={styles.placeholderText}>No completed items.</p> : null}
      </div>
    </SectionContainer>
  )
}
