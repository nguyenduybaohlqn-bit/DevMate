import { useMemo, useState } from "react";
import type { Blueprint, BlueprintNode } from "../../types";
import { colorForGroup, NodeKindIcon } from "./blueprintVisuals";
import styles from "./ExplorerPanel.module.css";

interface ExplorerPanelProps {
  blueprint: Blueprint;
  selectedId: string | null;
  onSelect: (id: string) => void;
  filterText: string;
  onFilterChange: (text: string) => void;
}

export function ExplorerPanel({ blueprint, selectedId, onSelect, filterText, onFilterChange }: ExplorerPanelProps) {
  const groups = useMemo(() => {
    const map = new Map<string, BlueprintNode[]>();
    for (const n of blueprint.graph.nodes) {
      const key = n.group ?? "Khác";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return Array.from(map.entries());
  }, [blueprint.graph.nodes]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(groups.map(([key]) => [key, true]))
  );

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const query = filterText.trim().toLowerCase();

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.headLabel}>EXPLORER</span>
      </div>

      <div className={styles.searchWrap}>
        <div className={styles.search}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            placeholder="Lọc node, file..."
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.scroll}>
        {groups.map(([key, nodes]) => {
          const filtered = query
            ? nodes.filter((n) => n.label.toLowerCase().includes(query) || n.path?.toLowerCase().includes(query))
            : nodes;
          if (query && filtered.length === 0) return null;
          const open = openGroups[key] ?? true;

          return (
            <div key={key} className={styles.group}>
              <button type="button" className={styles.groupHead} onClick={() => toggleGroup(key)}>
                <svg
                  className={`${styles.groupChev} ${open ? styles.groupChevOpen : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
                <span className={styles.groupDot} style={{ background: colorForGroup(key) }} />
                {key}
                <span className={styles.groupCount}>{filtered.length}</span>
              </button>
              <div className={`${styles.itemList} ${open ? styles.itemListOpen : ""}`}>
                <div>
                  {filtered.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className={`${styles.item} ${selectedId === n.id ? styles.itemActive : ""}`}
                      title={n.path ?? n.label}
                      onClick={() => onSelect(n.id)}
                    >
                      <NodeKindIcon kind={n.kind} size={12} />
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
