import type { Agent, AgentStatus } from "../../types";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./AgentPanelWidget.module.css";

const STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Idle",
  running: "Đang chạy",
  busy: "Bận",
  error: "Lỗi",
};

const STATUS_DOT: Record<AgentStatus, string> = {
  idle: "",
  running: styles.dotRunning,
  busy: styles.dotBusy,
  error: styles.dotError,
};

export function AgentPanelWidget() {
  const { agents } = useWorkspace();

  // Đúng tinh thần "Agent Panel là progressive disclosure": khi chỉ có 1
  // agent (Companion), nó đã được StatusWidget thể hiện — panel này ẩn.
  if (agents.length <= 1) return null;

  return (
    <div>
      <div className={styles.label}>AGENTS</div>
      <div className={styles.list}>
        {agents.map((agent: Agent) => (
          <div key={agent.id} className={styles.row}>
            <span className={`${styles.dot} ${STATUS_DOT[agent.status]}`} />
            <span className={styles.info}>
              <div className={styles.name}>{agent.name}</div>
              {agent.model && <div className={styles.model}>{agent.model}</div>}
            </span>
            <span className={styles.status}>{STATUS_LABEL[agent.status]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
