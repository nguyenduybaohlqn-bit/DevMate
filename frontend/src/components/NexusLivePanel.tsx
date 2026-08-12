import { Fragment } from "react";
import type { ModeId } from "../types";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { WIDGET_REGISTRY } from "./widgets/widgetRegistry";
import { PermissionCard } from "./widgets/PermissionCard";
import styles from "./NexusLivePanel.module.css";

const MODE_ORDER: { id: ModeId; short: string }[] = [
  { id: "companion", short: "Companion" },
  { id: "developer", short: "Developer" },
];

export function NexusLivePanel() {
  const { modeId, profile, setMode } = useWorkspace();

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.headLabel}>NEXUS LIVE</span>
        <div className={styles.modeSwitch}>
          {MODE_ORDER.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`${styles.modeBtn} ${modeId === m.id ? styles.modeBtnActive : ""}`}
              onClick={() => setMode(m.id)}
            >
              {m.short}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.scroll}>
        <PermissionCard />
        {profile.widgets.map((widgetId) => {
          const Widget = WIDGET_REGISTRY[widgetId];
          return (
            <Fragment key={widgetId}>
              <Widget />
            </Fragment>
          );
        })}
      </div>
    </aside>
  );
}
