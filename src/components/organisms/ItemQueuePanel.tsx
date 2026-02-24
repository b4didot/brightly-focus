import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface ItemQueuePanelProps {
  title: string
  items: Item[]
}

export function ItemQueuePanel({ title, items }: ItemQueuePanelProps) {
  return (
    <SectionContainer title={title}>
      <div className={styles.stack}>
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
        {items.length === 0 ? <p className={styles.placeholderText}>No items in queue.</p> : null}
      </div>
    </SectionContainer>
  )
}
