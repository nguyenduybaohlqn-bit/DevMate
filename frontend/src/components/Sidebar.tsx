import type { Chat, CoreState } from "../types";
import { ReactorCore } from "./ReactorCore";
import { ChevronLeftIcon, LogOutIcon, PlusIcon } from "./Icons";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  sessions: Chat[];
  activeKey: string | null;
  onSelectSession: (key: string) => void;
  onNewSession: () => void;
  brandCoreState: CoreState;
  username: string;
  onSignOut: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  sessions,
  activeKey,
  onSelectSession,
  onNewSession,
  brandCoreState,
  username,
  onSignOut,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <>
      <div
        className={`${styles.backdrop} ${mobileOpen ? styles.backdropShow : ""}`}
        onClick={onCloseMobile}
      />
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""} ${
          mobileOpen ? styles.mobileOpen : ""
        }`}
      >
        <button className={styles.collapseToggle} onClick={onToggleCollapse} aria-label="Thu gọn sidebar">
          <ChevronLeftIcon width={11} height={11} />
        </button>

        <div className={styles.top}>
          <ReactorCore size={30} state={brandCoreState} />
          <div className={styles.brand}>
            <b>NEXUS</b>
            <span>AI ASSISTANT</span>
          </div>
        </div>

        <button className={`${styles.newSession} frame`} onClick={onNewSession}>
          <PlusIcon width={14} height={14} />
          <span>PHIÊN LÀM VIỆC MỚI</span>
        </button>

        <div className={styles.label}>GẦN ĐÂY</div>
        <div className={styles.sessionList}>
          {sessions.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`${styles.sessionItem} ${s.key === activeKey ? styles.sessionItemActive : ""}`}
              onClick={() => onSelectSession(s.key)}
              title={s.title}
            >
              {s.title}
            </button>
          ))}
        </div>

        <div className={styles.account}>
          <div className={styles.avatarRing}>{username.charAt(0).toUpperCase() || "?"}</div>
          <div className={styles.accountInfo}>
            <b>{username}</b>
            <span>ĐÃ ĐĂNG NHẬP</span>
          </div>
          <button className={styles.iconBtn} aria-label="Đăng xuất" title="Đăng xuất" onClick={onSignOut}>
            <LogOutIcon width={15} height={15} />
          </button>
        </div>
      </aside>
    </>
  );
}
