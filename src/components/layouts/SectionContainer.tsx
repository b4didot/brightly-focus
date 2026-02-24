import type { ReactNode } from "react"
import styles from "./layouts.module.css"

interface SectionContainerProps {
  title: string
  children?: ReactNode
  emphasize?: boolean
}

export function SectionContainer({ title, children, emphasize = false }: SectionContainerProps) {
  const className = emphasize ? `${styles.section} ${styles.activeSection}` : styles.section

  return (
    <section className={className}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.sectionContent}>{children}</div>
    </section>
  )
}
