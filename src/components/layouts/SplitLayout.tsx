import type { ReactNode } from "react"
import styles from "./layouts.module.css"

interface SplitLayoutProps {
  leftSections: ReactNode[]
  rightHeader: ReactNode
  rightContext?: ReactNode | null
  rightBottom: ReactNode
  leftRowTemplate: string
  isContextOpen: boolean
}

export function SplitLayout({
  leftSections,
  rightHeader,
  rightContext,
  rightBottom,
  leftRowTemplate,
  isContextOpen,
}: SplitLayoutProps) {
  return (
    <section className={styles.splitLayout}>
      <div className={styles.leftColumn} style={{ gridTemplateRows: leftRowTemplate }}>
        {leftSections.map((section, index) => (
          <div key={index} className={styles.splitCell}>
            {section}
          </div>
        ))}
      </div>
      <div className={styles.rightColumn} data-context-open={isContextOpen ? "true" : "false"}>
        {isContextOpen && rightContext ? (
          <div className={styles.rightContext}>
            <div className={styles.rightHeader}>
              <div className={styles.splitCell}>{rightHeader}</div>
            </div>
            <div className={styles.splitCell}>{rightContext}</div>
          </div>
        ) : (
          <div className={styles.rightHeader}>
            <div className={styles.splitCell}>{rightHeader}</div>
          </div>
        )}
        <div className={styles.rightBottom}>
          <div className={styles.splitCell}>{rightBottom}</div>
        </div>
      </div>
    </section>
  )
}
