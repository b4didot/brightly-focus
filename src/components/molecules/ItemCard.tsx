import type { ReactNode } from "react"
import Link from "next/link"
import { Bell, CalendarClock, FolderOpen, Milestone, Tag, TicketSlash } from "lucide-react"
import { Pill } from "@/components/atoms"
import type { Item } from "@/types"
import styles from "./molecules.module.css"

type MetaIcon = "project" | "milestone" | "tags" | "alarm" | "datetime" | "steps"

interface MetaItem {
  icon: MetaIcon
  value: string
}

interface HeaderPill {
  text: string
  icon: "project" | "milestone"
}

interface ItemCardProps {
  item: Item
  action?: ReactNode
  fillHeight?: boolean
  selectHref?: string
  isSelected?: boolean
  bottomMeta?: MetaItem[]
  showDescription?: boolean
  headerPills?: HeaderPill[]
  descriptionMaxLines?: 2 | 3
}

export function ItemCard({
  item,
  action,
  fillHeight = false,
  selectHref,
  isSelected = false,
  bottomMeta = [],
  showDescription = true,
  headerPills = [],
  descriptionMaxLines,
}: ItemCardProps) {
  const className = [
    styles.card,
    fillHeight ? styles.cardFill : "",
    selectHref ? styles.cardSelectable : "",
    isSelected ? styles.cardSelected : "",
  ]
    .filter(Boolean)
    .join(" ")
  const normalizedHeaderPills = headerPills
    .filter(
      (pill): pill is HeaderPill =>
        (pill.icon === "project" || pill.icon === "milestone") && Boolean(pill.text)
    )
    .filter((pill, index, list) => list.findIndex((entry) => entry.icon === pill.icon) === index)

  function renderMetaIcon(icon: MetaIcon) {
    const commonProps = { size: 14, strokeWidth: 2.2 }
    switch (icon) {
      case "project":
        return <FolderOpen {...commonProps} />
      case "milestone":
        return <Milestone {...commonProps} />
      case "tags":
        return <Tag {...commonProps} />
      case "alarm":
        return <Bell {...commonProps} />
      case "datetime":
        return <CalendarClock {...commonProps} />
      case "steps":
        return <TicketSlash {...commonProps} />
      default:
        return null
    }
  }

  return (
    <article className={className}>
      {selectHref ? <Link className={styles.cardHitArea} href={selectHref} aria-label={`Select ${item.title}`} /> : null}
      <div className={styles.cardRow}>
        <div className={styles.cardMainTop}>
          <div className={styles.cardTitleRow}>
            <h4 className={styles.cardTitle}>{item.title}</h4>
            {normalizedHeaderPills.length > 0 ? (
              <div className={styles.headerPillRow}>
                {normalizedHeaderPills.map((pill) => (
                  <Pill
                    key={`${pill.icon}-${pill.text}`}
                    text={pill.text}
                    icon={
                      pill.icon === "project" ? (
                        <FolderOpen size={12} strokeWidth={2.2} />
                      ) : pill.icon === "milestone" ? (
                        <Milestone size={12} strokeWidth={2.2} />
                      ) : null
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {action ? <div className={styles.cardAction}>{action}</div> : null}
      </div>
      {bottomMeta.length > 0 ? (
        <div className={styles.metaRow}>
          {bottomMeta.map((meta) => (
            <span key={`${meta.icon}-${meta.value}`} className={styles.metaItem}>
              {renderMetaIcon(meta.icon)}
              <span className={styles.metaText}>{meta.value}</span>
            </span>
          ))}
        </div>
      ) : null}
      {showDescription ? (
        <p
          className={
            descriptionMaxLines === 2
              ? `${styles.cardText} ${styles.clamp2}`
              : descriptionMaxLines === 3
                ? `${styles.cardText} ${styles.clamp3}`
                : styles.cardText
          }
        >
          {item.summary}
        </p>
      ) : null}
    </article>
  )
}
