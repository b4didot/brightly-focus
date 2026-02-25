import type { Item } from "@/types"
import styles from "./molecules.module.css"

interface ItemDescriptionProps {
  item: Item
}

export function ItemDescription({ item }: ItemDescriptionProps) {
  return (
    <div className={styles.descriptionContainer}>
      <h5 className={styles.descriptionLabel}>Description</h5>
      <div className={styles.descriptionContent}>
        {item.summary ? (
          <p className={styles.descriptionText}>{item.summary}</p>
        ) : (
          <p className={styles.descriptionPlaceholder}>No description provided.</p>
        )}
      </div>
    </div>
  )
}
