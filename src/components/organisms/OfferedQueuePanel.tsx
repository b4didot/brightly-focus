import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface OfferedQueuePanelProps {
  items: Item[]
}

export function OfferedQueuePanel({ items }: OfferedQueuePanelProps) {
  return (
    <SectionContainer title="Request Queue (Offer)">
      <div className={styles.stack}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {items.length === 0 ? <p className={styles.placeholderText}>No offered items.</p> : null}
      </div>
    </SectionContainer>
  )
}
