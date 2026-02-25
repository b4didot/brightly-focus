import Image from "next/image"
import { Icon } from "@/components/atoms"
import styles from "./layouts.module.css"

interface AppSidebarProps {
  navLabels: string[]
}

export function AppSidebar({ navLabels }: AppSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <Image
        src="/512px.png"
        alt="Brightly Logo"
        width={58}
        height={58}
        className={styles.sidebarLogo}
        priority
      />
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
