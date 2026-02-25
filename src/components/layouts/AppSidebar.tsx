import Image from "next/image"
import { CircleDot, List, FolderOpen } from "lucide-react"
import { Icon } from "@/components/atoms"
import styles from "./layouts.module.css"

interface AppSidebarProps {
  navLabels: string[]
}

function getIconForLabel(label: string) {
  switch (label) {
    case "Nav 1":
      return <CircleDot size={24} strokeWidth={2} />
    case "Nav 2":
      return <List size={24} strokeWidth={2} />
    case "Nav 3":
      return <FolderOpen size={24} strokeWidth={2} />
    default:
      return null
  }
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
          <button key={label} className={styles.navButton} type="button" aria-label={label}>
            {getIconForLabel(label)}
          </button>
        ))}
      </nav>
      <Icon label="User Pic" size={56} rounded />
    </aside>
  )
}
