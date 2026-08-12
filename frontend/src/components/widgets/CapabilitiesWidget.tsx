import { useEffect, useState } from "react";
import type { Capability } from "../../types";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { CollapsibleSection } from "./CollapsibleSection";
import styles from "./CapabilitiesWidget.module.css";

function formatAgo(ms: number): string {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s trước`;
  return `${Math.round(s / 60)} phút trước`;
}

/** Companion: "observer" -> đã quan sát lần cuối khi nào.
 *  Developer: "tool" -> đang kết nối/bận/ngắt kết nối ra sao.
 *  Cùng một field `status`, chỉ khác cách đọc theo category. */
function describe(c: Capability): { text: string; className: string } {
  if (c.status === "checking") {
    return { text: c.category === "observer" ? "Đang kiểm tra..." : "Đang kiểm tra...", className: styles.stateChecking };
  }
  if (c.category === "tool") {
    if (c.status === "busy") return { text: "Đang bận", className: "" };
    if (c.status === "error" || c.status === "disconnected") return { text: "Ngắt kết nối", className: "" };
    return { text: "Đã kết nối", className: "" };
  }
  return { text: formatAgo(c.lastUpdate), className: "" };
}

function dotClass(c: Capability): string {
  if (c.status === "checking") return styles.dotChecking;
  if (c.status === "busy") return styles.dotBusy;
  if (c.status === "error" || c.status === "disconnected") return styles.dotError;
  return "";
}

export function CapabilitiesWidget() {
  const { capabilities, profile } = useWorkspace();
  const [, forceTick] = useState(0);

  // Cập nhật "Xs/phút trước" đều đặn dù capability object không đổi.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 15000);
    return () => clearInterval(id);
  }, []);

  const activeCount = capabilities.length;

  return (
    <CollapsibleSection label={profile.capabilityLabel} summary={`${activeCount} hoạt động`}>
      <div className={styles.list}>
        {capabilities.map((c) => {
          const desc = describe(c);
          return (
            <div key={c.id} className={styles.row}>
              <span className={`${styles.dot} ${dotClass(c)}`} />
              <span className={styles.name}>{c.name}</span>
              <span className={`${styles.state} ${desc.className}`}>{desc.text}</span>
            </div>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
