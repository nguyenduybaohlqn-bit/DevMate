import { useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./InboxWidget.module.css";

function dotClass(kind: string): string {
  if (kind === "warn") return styles.dotWarn;
  if (kind === "ok") return styles.dotOk;
  return "";
}

export function InboxWidget() {
  const { inbox, dismissInboxItem } = useWorkspace();
  const [expanded, setExpanded] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const visible = expanded ? inbox : inbox.slice(0, 3);

  function handleDismiss(id: string) {
    setLeavingId(id);
    setTimeout(() => {
      dismissInboxItem(id);
      setLeavingId(null);
    }, 190);
  }

  return (
    <div>
      <div className={styles.label}>HỘP THƯ</div>
      {inbox.length === 0 ? (
        <div className={styles.empty}>Không có gì mới.</div>
      ) : (
        <>
          <div className={styles.list}>
            {visible.map((item) => (
              <div
                key={item.id}
                className={`${styles.item} ${leavingId === item.id ? styles.itemLeaving : ""}`}
                onClick={() => handleDismiss(item.id)}
              >
                <span className={`${styles.dot} ${dotClass(item.kind)}`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          {inbox.length > 3 && (
            <button type="button" className={styles.viewAll} onClick={() => setExpanded((v) => !v)}>
              {expanded ? "Thu gọn" : `Xem tất cả (${inbox.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
