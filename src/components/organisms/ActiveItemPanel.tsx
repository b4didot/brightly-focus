import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"

interface ActiveItemPanelProps {
  item: Item | null
}

export function ActiveItemPanel({ item }: ActiveItemPanelProps) {
  return (
    <SectionContainer title="Active Item" emphasize>
      {item ? <ItemCard item={item} /> : <p>No active item.</p>}
    </SectionContainer>
  )
}
