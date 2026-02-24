import type { ReactNode } from "react"
import { Badge } from "@/components/atoms"
import type { Item } from "@/types"
import styles from "./molecules.module.css"

interface ItemCardProps {
  item: Item
  action?: ReactNode
}

export function ItemCard({ item, action }: ItemCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.cardRow}>
        <h4 className={styles.cardTitle}>{item.title}</h4>
        <Badge text={item.status} />
      </div>
      <p className={styles.cardText}>{item.summary}</p>
      {action}
    </article>
  )
}
