import type { AppView } from "../types";
import { ReactorCore } from "./ReactorCore";
import { ChatBubbleIcon, GraphIcon } from "./Icons";
import styles from "./ActivityBar.module.css";

interface ActivityBarProps {
  view: AppView;
  onChangeView: (view: AppView) => void;
}

const ITEMS: { id: AppView; label: string; Icon: typeof ChatBubbleIcon }[] = [
  { id: "chat", label: "Nhắn với Nexus", Icon: ChatBubbleIcon },
  { id: "blueprint", label: "Blueprint — graph codebase", Icon: GraphIcon },
];

export function ActivityBar({ view, onChangeView }: ActivityBarProps) {
  return (
    <nav className={styles.bar} aria-label="Chuyển không gian làm việc">
      <div className={styles.brand}>
        <ReactorCore size={22} state="idle" />
      </div>

      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`${styles.item} ${view === id ? styles.itemActive : ""}`}
          aria-label={label}
          aria-pressed={view === id}
          title={label}
          onClick={() => onChangeView(id)}
        >
          <Icon />
        </button>
      ))}

      <div className={styles.spacer} />
    </nav>
  );
}
