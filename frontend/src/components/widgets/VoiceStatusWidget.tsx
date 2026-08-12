import { useState } from "react";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import styles from "./VoiceStatusWidget.module.css";

export function VoiceStatusWidget() {
  const { voiceMode, voiceState } = useWorkspace();
  const [micDisabled, setMicDisabled] = useState(false);

  let content: React.ReactNode = (
    <>
      Wake word <b>đã bật</b>
    </>
  );
  let cls = "";

  if (micDisabled) {
    content = (
      <>
        Micro <b>đã tắt</b>
      </>
    );
    cls = styles.disabled;
  } else if (voiceMode === "voice" && voiceState === "user-speaking") {
    content = <b>Đang nghe...</b>;
    cls = styles.listening;
  } else if (voiceMode === "voice" && voiceState === "ai-speaking") {
    content = <b>Đang nói...</b>;
    cls = styles.speaking;
  }

  return (
    <button type="button" className={styles.btn} aria-label="Bật/tắt micro" onClick={() => setMicDisabled((v) => !v)}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4" />
      </svg>
      <span className={`${styles.text} ${cls}`}>{content}</span>
    </button>
  );
}
