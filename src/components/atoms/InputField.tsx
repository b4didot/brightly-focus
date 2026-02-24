import styles from "./atoms.module.css"

interface InputFieldProps {
  value: string
  options: Array<{ id: string; label: string }>
  ariaLabel: string
}

export function InputField({ value, options, ariaLabel }: InputFieldProps) {
  return (
    <select className={styles.input} defaultValue={value} aria-label={ariaLabel}>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
