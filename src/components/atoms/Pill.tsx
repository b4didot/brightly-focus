import type { ReactNode } from "react"
import styles from "./atoms.module.css"

interface PillProps {
  text: string
  icon?: ReactNode
}

export function Pill({ text, icon }: PillProps) {
  return (
    <span className={styles.pill}>
      {icon ? <span className={styles.pillIcon}>{icon}</span> : null}
      <span>{text}</span>
    </span>
  )
}
