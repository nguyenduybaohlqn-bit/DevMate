import { useEffect, useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./StatusWidget.module.css";

const AMBIENT_LABELS = ["Rảnh", "Đang quan sát desktop", "Rảnh", "Đang theo dõi màn hình"];

const RUNTIME_BASE_MS = Date.now() - (3 * 3600 + 26 * 60) * 1000;

function formatRuntime(): string {
  const elapsed = Date.now() - RUNTIME_BASE_MS;
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  return `Đang hoạt động ${h}h ${m}m`;
}

export function StatusWidget() {
  const { task, voiceMode, voiceState } = useWorkspace();
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [runtime, setRuntime] = useState(formatRuntime);

  useEffect(() => {
    const id = setInterval(() => setRuntime(formatRuntime()), 30000);
    return () => clearInterval(id);
  }, []);

  // Chỉ tự đổi khi không có trạng thái thật nào đang khoá — text-only, không animation thừa.
  useEffect(() => {
    const id = setInterval(() => {
      if (!task.active && voiceMode !== "voice") {
        setAmbientIdx((i) => (i + 1) % AMBIENT_LABELS.length);
      }
    }, 22000);
    return () => clearInterval(id);
  }, [task.active, voiceMode]);

  let state: "idle" | "active" | "listening" = "idle";
  let label = AMBIENT_LABELS[ambientIdx];

  if (voiceMode === "voice") {
    if (voiceState === "user-speaking") {
      state = "listening";
      label = "Đang lắng nghe";
    } else if (voiceState === "ai-thinking") {
      state = "active";
      label = "Đang suy nghĩ";
    } else if (voiceState === "ai-speaking") {
      state = "active";
      label = "Đang trả lời";
    } else {
      state = "idle";
      label = "Rảnh";
    }
  } else if (task.active) {
    state = "active";
    label = task.label || "Đang xử lý";
  }

  return (
    <div className={styles.row} data-state={state}>
      <span className={styles.dot} />
      <span className={styles.text}>
        <div className={styles.label}>{label}</div>
        <div className={styles.runtime}>{runtime}</div>
      </span>
    </div>
  );
}
