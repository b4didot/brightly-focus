import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface WaitingQueuePanelProps {
  items: Item[]
}

export function WaitingQueuePanel({ items }: WaitingQueuePanelProps) {
  return (
    <SectionContainer title="Item Queue">
      <div className={styles.stack}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {items.length === 0 ? <p className={styles.placeholderText}>No waiting items.</p> : null}
      </div>
    </SectionContainer>
  )
}
