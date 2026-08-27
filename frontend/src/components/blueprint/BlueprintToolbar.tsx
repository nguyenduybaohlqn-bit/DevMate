import type { Blueprint } from "../../types";
import styles from "./BlueprintToolbar.module.css";

interface BlueprintToolbarProps {
  blueprint: Blueprint;
  scanning: boolean;
  filterText: string;
  onFilterChange: (text: string) => void;
  onRescan: () => void;
}

function downloadBlueprintJson(blueprint: Blueprint) {
  const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${blueprint.project.name.toLowerCase()}-blueprint.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BlueprintToolbar({ blueprint, scanning, filterText, onFilterChange, onRescan }: BlueprintToolbarProps) {
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="6" cy="6" r="2.4" />
            <circle cx="18" cy="6" r="2.4" />
            <circle cx="12" cy="18" r="2.4" />
            <path d="M8 7l3 9M16 7l-3 9" />
          </svg>
          BLUEPRINT
        </div>
        <div className={styles.projectPill}>
          <b>{blueprint.project.name}</b>
          <span>· {blueprint.project.framework}</span>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <div className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            placeholder="Tìm node, file hoặc service..."
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRescan} disabled={scanning}>
          <svg
            className={scanning ? styles.spinning : ""}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 12a9 9 0 11-2.6-6.4" />
            <path d="M21 3v6h-6" />
          </svg>
          {scanning ? "Đang quét..." : "Quét Workspace"}
        </button>
        <button type="button" className={styles.btn} onClick={() => downloadBlueprintJson(blueprint)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <path d="M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export
        </button>
      </div>
    </header>
  );
}
