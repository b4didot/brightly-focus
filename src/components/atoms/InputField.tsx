import styles from "./atoms.module.css"

interface InputFieldProps {
  value: string
  options: Array<{ id: string; label: string }>
  ariaLabel: string
  onChange?: (value: string) => void
}

export function InputField({ value, options, ariaLabel, onChange }: InputFieldProps) {
  return (
    <select 
      className={styles.input} 
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
