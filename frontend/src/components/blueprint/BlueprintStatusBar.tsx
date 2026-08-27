import type { BlueprintStatistics } from "../../types";
import styles from "./BlueprintStatusBar.module.css";

interface BlueprintStatusBarProps {
  statistics: BlueprintStatistics;
}

function formatAgo(iso?: string): string {
  if (!iso) return "chưa quét";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s trước`;
  return `${Math.round(s / 60)} phút trước`;
}

export function BlueprintStatusBar({ statistics }: BlueprintStatusBarProps) {
  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.item}>{statistics.fileCount} Files</span>
        <span className={styles.item}>{statistics.moduleCount} Modules</span>
        <span className={styles.item}>{statistics.edgeCount} Edges</span>
        {statistics.languages.length > 0 && <span className={styles.item}>{statistics.languages.join(" · ")}</span>}
      </div>
      <div className={styles.right}>
        <span>Lần quét cuối: {formatAgo(statistics.lastScanAt)}</span>
        <span className={styles.dot} />
      </div>
    </footer>
  );
}
