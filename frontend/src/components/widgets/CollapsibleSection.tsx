import { useState, type ReactNode } from "react";
import styles from "./CollapsibleSection.module.css";

interface CollapsibleSectionProps {
  label: string;
  summary?: string;
  /** Nội dung luôn hiện, kể cả khi thu gọn (vd dòng preview mới nhất). */
  preview?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ label, summary, preview, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className={styles.label}>{label}</span>
        <span className={styles.right}>
          {summary && <span className={styles.summary}>{summary}</span>}
          <svg className={`${styles.chev} ${open ? styles.chevOpen : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {preview}
      <div className={`${styles.body} ${open ? styles.bodyOpen : ""}`}>
        <div>{children}</div>
      </div>
    </div>
  );
}
