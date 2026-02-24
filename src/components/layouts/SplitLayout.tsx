import type { ReactNode } from "react"
import styles from "./layouts.module.css"

interface SplitLayoutProps {
  leftSections: ReactNode[]
  rightTopSections: ReactNode[]
  rightBottom: ReactNode
  leftRowTemplate: string
  rightTopColumns?: number
}

export function SplitLayout({
  leftSections,
  rightTopSections,
  rightBottom,
  leftRowTemplate,
  rightTopColumns = 2,
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
      <div className={styles.rightColumn}>
        <div
          className={styles.rightTop}
          style={{ gridTemplateColumns: `repeat(${rightTopColumns}, minmax(0, 1fr))` }}
        >
          {rightTopSections.map((section, index) => (
            <div key={index} className={styles.splitCell}>
              {section}
            </div>
          ))}
        </div>
        <div className={styles.rightBottom}>
          <div className={styles.splitCell}>{rightBottom}</div>
        </div>
      </div>
    </section>
  )
}
