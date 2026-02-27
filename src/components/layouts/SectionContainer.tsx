import type { ReactNode } from "react"
import styles from "./layouts.module.css"

interface SectionContainerProps {
  title: string
  children?: ReactNode
  emphasize?: boolean
  tone?: "default" | "secondary" | "context" | "workspace"
  scrollable?: boolean
  hideTitle?: boolean
  headerAction?: ReactNode
}

export function SectionContainer({
  title,
  children,
  emphasize = false,
  tone = "default",
  scrollable = true,
  hideTitle = false,
  headerAction,
}: SectionContainerProps) {
  const toneClassMap = {
    default: "",
    secondary: styles.secondarySection,
    context: styles.contextSection,
    workspace: styles.workspaceSection,
  }
  const className = [styles.section, emphasize ? styles.activeSection : "", toneClassMap[tone]]
    .filter(Boolean)
    .join(" ")

  const contentClassName = [styles.sectionContent, scrollable ? "" : styles.noScroll]
    .filter(Boolean)
    .join(" ")

  return (
    <section className={className}>
      {!hideTitle ? (
        headerAction ? (
          <div className={styles.sectionTitleRow}>
            <h2 className={styles.sectionTitle}>{title}</h2>
            {headerAction}
          </div>
        ) : (
          <h2 className={styles.sectionTitle}>{title}</h2>
        )
      ) : null}
      <div className={contentClassName}>{children}</div>
    </section>
  )
}
