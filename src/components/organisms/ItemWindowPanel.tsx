import { ItemCard, ItemDescription } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"
import styles from "./organisms.module.css"

interface ItemWindowPanelProps {
  item: Item | null
}

export function ItemWindowPanel({ item }: ItemWindowPanelProps) {
  function formatDueDateTime(value: string | undefined) {
    if (!value) {
      return "n/a"
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return parsed.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <SectionContainer title="Item Window" tone="workspace">
      {item ? (
        <div style={{ display: "grid", gap: "0.8rem", height: "100%", minHeight: 0 }}>
          <ItemCard
            item={item}
            bottomMeta={[
              { icon: "tags", value: item.tags && item.tags.length > 0 ? item.tags.join(", ") : "No tags" },
              { icon: "alarm", value: item.alarmLabel ?? "No alarm" },
              { icon: "datetime", value: formatDueDateTime(item.dueDateTime) },
              { icon: "steps", value: String(item.stepsCount ?? 0) },
            ]}
            showDescription={false}
          />
          <ItemDescription item={item} />
        </div>
      ) : (
        <p className={styles.placeholderText}>No item selected.</p>
      )}
    </SectionContainer>
  )
}

