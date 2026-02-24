import type { ReactNode } from "react"
import styles from "./layouts.module.css"

interface TopBarProps {
  children: ReactNode
}

export function TopBar({ children }: TopBarProps) {
  return <header className={styles.topBar}>{children}</header>
}
