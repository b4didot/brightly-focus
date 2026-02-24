import styles from "./atoms.module.css"

interface IconProps {
  label: string
  size?: number
  rounded?: boolean
}

export function Icon({ label, size = 64, rounded = false }: IconProps) {
  return (
    <span
      className={styles.icon}
      style={{
        width: size,
        height: size,
        borderRadius: rounded ? "50%" : "0",
      }}
    >
      {label}
    </span>
  )
}
