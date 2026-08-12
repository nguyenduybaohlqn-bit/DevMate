import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./TaskWidget.module.css";

const TICKS = 20;

export function TaskWidget() {
  const { task } = useWorkspace();
  const onCount = Math.round(task.progress * TICKS);

  return (
    <div className={`${styles.wrap} ${task.active ? styles.wrapShow : ""}`}>
      <div>
        <div className={styles.label}>TÁC VỤ HIỆN TẠI</div>
        <div className={styles.card}>
          <div className={styles.top}>
            <span className={styles.taskLabel}>{task.label}</span>
            <span className={styles.eta}>{task.etaText}</span>
          </div>
          <div className={`${styles.gauge} ${task.showGauge ? "" : styles.gaugeHidden}`}>
            {Array.from({ length: TICKS }, (_, i) => (
              <div key={i} className={`${styles.tick} ${i < onCount ? styles.tickOn : ""}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
