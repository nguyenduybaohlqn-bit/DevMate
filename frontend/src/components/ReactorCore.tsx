import type { CSSProperties } from "react";
import type { CoreState } from "../types";
import styles from "./ReactorCore.module.css";

interface ReactorCoreProps {
  size: number;
  state?: CoreState;
  className?: string;
}

/** Lõi arc-reactor thu nhỏ, dùng lại cho logo header, avatar tin nhắn AI,
 *  và icon nút gửi. Chuyển động điều khiển hoàn toàn bằng CSS qua
 *  `data-state` — nhẹ, phù hợp cho các chỉ báo nhỏ ít khi là tâm điểm.
 *  Xem `VoiceStage.tsx` cho phiên bản lớn dùng engine rAF liên tục. */
export function ReactorCore({ size, state = "idle", className }: ReactorCoreProps) {
  const style = { "--core-size": `${size}px` } as CSSProperties;
  return (
    <div className={[styles.core, className].filter(Boolean).join(" ")} style={style} data-state={state}>
      <svg viewBox="0 0 60 60" fill="none">
        <circle className={styles.ringOuter} cx="30" cy="30" r="26" strokeWidth={2} />
        <circle className={styles.ringInner} cx="30" cy="30" r="17" strokeWidth={1.5} />
        <circle className={styles.dot} cx="30" cy="30" r="4" />
      </svg>
    </div>
  );
}
