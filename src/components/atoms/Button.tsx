import styles from "./atoms.module.css"

type ButtonVariant = "primary" | "secondary"

interface ButtonProps {
  label: string
  onClick?: () => void
  type?: "button" | "submit"
  variant?: ButtonVariant
  disabled?: boolean
}

export function Button({
  label,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  const className =
    variant === "secondary" ? `${styles.button} ${styles.secondary}` : styles.button

  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}
