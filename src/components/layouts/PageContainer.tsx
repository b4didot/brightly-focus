import type { ReactNode } from "react"
import styles from "./layouts.module.css"

interface PageContainerProps {
  sidebar: ReactNode
  topBar?: ReactNode
  children: ReactNode
}

export function PageContainer({ sidebar, topBar, children }: PageContainerProps) {
  return (
    <div className={styles.pageContainer}>
      {sidebar}
      <div className={styles.mainArea}>
        {topBar ? topBar : null}
        {children}
      </div>
    </div>
  )
}
