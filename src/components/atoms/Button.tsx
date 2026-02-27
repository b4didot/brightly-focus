import styles from "./atoms.module.css"

type ButtonVariant = "primary" | "secondary"

interface ButtonProps {
  label: string
  onClick?: () => void
  type?: "button" | "submit"
  variant?: ButtonVariant
  disabled?: boolean
  className?: string
  form?: string
}

export function Button({
  label,
  onClick,
  type = "button",
  variant = "primary",
  disabled = false,
  className = "",
  form,
}: ButtonProps) {
  const buttonClassName =
    variant === "secondary" ? `${styles.button} ${styles.secondary}` : styles.button

  return (
    <button className={`${buttonClassName} ${className}`.trim()} type={type} onClick={onClick} disabled={disabled} form={form}>
      {label}
    </button>
  )
}
