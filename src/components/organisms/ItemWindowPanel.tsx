import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface ItemWindowPanelProps {
  item: Item | null
}

export function ItemWindowPanel({ item }: ItemWindowPanelProps) {
  return (
    <SectionContainer title="Item Window">
      {item ? <ItemCard item={item} /> : <p className={styles.placeholderText}>No item selected.</p>}
    </SectionContainer>
  )
}
