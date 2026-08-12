import styles from "./MemoryWidget.module.css";

const PROJECT_FACTS = ["React", "TypeScript", "Tailwind", "Supabase"];
const PREFERENCES = ["Luôn dùng pnpm", "Tránh Redux"];

export function MemoryWidget() {
  return (
    <div>
      <div className={styles.label}>BỘ NHỚ</div>
      <div className={styles.card}>
        <div className={styles.group}>
          <span className={styles.groupLabel}>DỰ ÁN</span>
          <div className={styles.chips}>
            {PROJECT_FACTS.map((f) => (
              <span key={f} className={styles.chip}>
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.group}>
          <span className={styles.groupLabel}>QUY ƯỚC</span>
          <div className={styles.chips}>
            {PREFERENCES.map((p) => (
              <span key={p} className={styles.chip}>
                {p}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.group}>
          <span className={styles.groupLabel}>MỤC TIÊU HIỆN TẠI</span>
          <div className={styles.chips}>
            <span className={styles.chip}>Hoàn thành MVP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
