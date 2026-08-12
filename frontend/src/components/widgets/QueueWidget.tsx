import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./QueueWidget.module.css";

export function QueueWidget() {
  const { queue } = useWorkspace();

  return (
    <div>
      <div className={styles.label}>HÀNG ĐỢI</div>
      {queue.length === 0 ? (
        <div className={styles.empty}>Không có việc nào đang chờ.</div>
      ) : (
        <div className={styles.list}>
          {queue.map((item, i) => (
            <div key={item} className={styles.item}>
              <span className={styles.num}>{i + 1}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
