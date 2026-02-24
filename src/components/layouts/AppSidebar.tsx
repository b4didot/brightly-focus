import { Icon } from "@/components/atoms"
import styles from "./layouts.module.css"

interface AppSidebarProps {
  navLabels: string[]
}

export function AppSidebar({ navLabels }: AppSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <Icon label="Brightly Logo" size={62} rounded />
      <nav className={styles.sidebarNav} aria-label="Nav Bar">
        {navLabels.map((label) => (
          <button key={label} className={styles.navButton} type="button">
            {label}
          </button>
        ))}
      </nav>
      <Icon label="User Pic" size={56} rounded />
    </aside>
  )
}
