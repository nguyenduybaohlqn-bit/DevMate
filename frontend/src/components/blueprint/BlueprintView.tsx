import { useState } from "react";
import { useBlueprint } from "../../hooks/useBlueprint";
import { BlueprintToolbar } from "./BlueprintToolbar";
import { ExplorerPanel } from "./ExplorerPanel";
import { GraphCanvas } from "./GraphCanvas";
import { InspectorPanel } from "./InspectorPanel";
import { BlueprintStatusBar } from "./BlueprintStatusBar";
import styles from "./BlueprintView.module.css";

interface BlueprintViewProps {
  /** Gọi khi người dùng bấm "Hỏi Nexus về node này" — App quyết định làm
   *  gì (vd chuyển view sang Chat). Xem TODO ở App.tsx: hiện chỉ chuyển
   *  view, chưa tự động điền + gửi câu hỏi vào composer. */
  onAskAI?: (question: string) => void;
}

export function BlueprintView({ onAskAI }: BlueprintViewProps) {
  const { blueprint, scanning, selectedId, select, rescan } = useBlueprint();
  const [filterText, setFilterText] = useState("");

  return (
    <div className={styles.view}>
      <BlueprintToolbar
        blueprint={blueprint}
        scanning={scanning}
        filterText={filterText}
        onFilterChange={setFilterText}
        onRescan={rescan}
      />

      <div className={styles.body}>
        <ExplorerPanel
          blueprint={blueprint}
          selectedId={selectedId}
          onSelect={select}
          filterText={filterText}
          onFilterChange={setFilterText}
        />
        <GraphCanvas blueprint={blueprint} selectedId={selectedId} onSelect={select} filterText={filterText} />
        <InspectorPanel
          blueprint={blueprint}
          selectedId={selectedId}
          onSelect={select}
          onAskAI={(q) => onAskAI?.(q)}
        />
      </div>

      <BlueprintStatusBar statistics={blueprint.statistics} />
    </div>
  );
}
