import type { ReactNode } from "react"
import Link from "next/link"
import type { Item } from "@/types"
import styles from "./molecules.module.css"

interface ItemCardProps {
  item: Item
  action?: ReactNode
  fillHeight?: boolean
  selectHref?: string
  isSelected?: boolean
}

export function ItemCard({
  item,
  action,
  fillHeight = false,
  selectHref,
  isSelected = false,
}: ItemCardProps) {
  const className = [
    styles.card,
    fillHeight ? styles.cardFill : "",
    selectHref ? styles.cardSelectable : "",
    isSelected ? styles.cardSelected : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <article className={className}>
      {selectHref ? <Link className={styles.cardHitArea} href={selectHref} aria-label={`Select ${item.title}`} /> : null}
      <div className={styles.cardRow}>
        <h4 className={styles.cardTitle}>{item.title}</h4>
        {action ? <div className={styles.cardAction}>{action}</div> : null}
      </div>
      <p className={styles.cardText}>{item.summary}</p>
    </article>
  )
}
