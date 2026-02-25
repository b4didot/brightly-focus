import { ItemCard } from "@/components/molecules"
import { SectionContainer } from "@/components/layouts"
import type { Item } from "@/types"

interface ActiveItemPanelProps {
  item: Item | null
  selectedUserId: string | null
  selectedItemId: string | null
}

export function ActiveItemPanel({ item, selectedUserId, selectedItemId }: ActiveItemPanelProps) {
  function truncate(value: string | undefined, max: number) {
    if (!value || value.trim().length === 0) {
      return "n/a"
    }
    return value.length > max ? `${value.slice(0, max - 3)}...` : value
  }

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

  const selectHref = item
    ? `/focus?${new URLSearchParams({
        ...(selectedUserId ? { userId: selectedUserId } : {}),
        selectedItemId: item.id,
      }).toString()}`
    : undefined

  return (
    <SectionContainer title="Active Item" emphasize scrollable={false}>
      {item ? (
        <ItemCard
          item={item}
          fillHeight
          selectHref={selectHref}
          isSelected={item.id === selectedItemId}
          headerPills={[
            { icon: "project", text: truncate(item.projectName, 20) },
            { icon: "milestone", text: truncate(item.milestoneName, 20) },
          ]}
          bottomMeta={[
            { icon: "tags", value: item.tags && item.tags.length > 0 ? item.tags.join(", ") : "No tags" },
            { icon: "alarm", value: item.alarmLabel ?? "No alarm" },
            { icon: "datetime", value: formatDueDateTime(item.dueDateTime) },
            { icon: "steps", value: String(item.stepsCount ?? 0) },
          ]}
        />
      ) : (
        <p>No active item.</p>
      )}
    </SectionContainer>
  )
}
