import styles from "./GoalWidget.module.css";

interface GoalStep {
  label: string;
  state: "done" | "current" | "upcoming";
}

const GOAL_STEPS: GoalStep[] = [
  { label: "Auth", state: "done" },
  { label: "Chat API", state: "done" },
  { label: "Streaming", state: "current" },
  { label: "Testing", state: "upcoming" },
  { label: "Deploy", state: "upcoming" },
];

export function GoalWidget() {
  return (
    <div>
      <div className={styles.label}>MỤC TIÊU</div>
      <div className={styles.card}>
        <div className={styles.top}>
          <span className={styles.name}>AI Coach MVP</span>
          <span className={styles.pct}>72%</span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: "72%" }} />
        </div>
        <div className={styles.steps}>
          {GOAL_STEPS.map((s) => {
            if (s.state === "done") {
              return (
                <span key={s.label} className={`${styles.step} ${styles.stepDone}`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {s.label}
                </span>
              );
            }
            if (s.state === "current") {
              return (
                <span key={s.label} className={`${styles.step} ${styles.stepCurrent}`}>
                  → {s.label}
                </span>
              );
            }
            return (
              <span key={s.label} className={styles.step}>
                {s.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
