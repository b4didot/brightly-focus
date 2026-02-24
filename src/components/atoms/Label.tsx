import styles from "./atoms.module.css"

interface LabelProps {
  text: string
}

export function Label({ text }: LabelProps) {
  return <span className={styles.label}>{text}</span>
}
