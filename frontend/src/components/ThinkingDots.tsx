import styles from "./ThinkingDots.module.css";

interface ThinkingDotsProps {
  label?: string;
}

export function ThinkingDots({ label = "Đang phân tích yêu cầu" }: ThinkingDotsProps) {
  return (
    <span className={styles.wrap}>
      {label}
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </span>
  );
}
