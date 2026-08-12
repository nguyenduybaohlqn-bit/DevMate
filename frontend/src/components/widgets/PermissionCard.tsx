import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./PermissionCard.module.css";

/** Không phải popup — hiện thẳng trong luồng, ngay tại nơi gọi nó (ở đây
 *  là đầu Nexus Live panel). Bất kỳ hành động nào (chat, tool, agent) cần
 *  xác nhận đều gọi `askPermission()` và đợi, không quan tâm mode nào. */
export function PermissionCard() {
  const { permission, respondPermission } = useWorkspace();

  if (!permission) return null;

  return (
    <div className={styles.card}>
      <div className={styles.label}>CẦN CẤP QUYỀN</div>
      <div className={styles.summary}>{permission.summary}</div>
      {permission.detail && <div className={styles.detail}>{permission.detail}</div>}
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => respondPermission(true)}>
          Cho phép
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnDeny}`} onClick={() => respondPermission(false)}>
          Từ chối
        </button>
      </div>
    </div>
  );
}
