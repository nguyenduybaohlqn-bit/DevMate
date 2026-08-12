import { useWorkspace } from "../../contexts/WorkspaceContext";
import { CollapsibleSection } from "./CollapsibleSection";
import styles from "./TimelineWidget.module.css";

function formatTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimelineWidget() {
  const { timeline } = useWorkspace();
  const latest = timeline[0];

  const preview = latest ? (
    <div className={styles.preview}>
      <span className={styles.previewTime}>{formatTime(latest.time)}</span>
      {latest.text}
    </div>
  ) : null;

  return (
    <CollapsibleSection label="NHẬT KÝ" preview={preview}>
      <div className={styles.list}>
        {timeline.map((entry) => (
          <div key={entry.id} className={styles.item}>
            <span className={styles.itemTime}>{formatTime(entry.time)}</span>
            <span className={styles.itemText}>{entry.text}</span>
          </div>
        ))}
      </div>
    </CollapsibleSection>
  );
}
