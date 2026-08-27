import { useMemo } from "react";
import type { Blueprint, BlueprintNode } from "../../types";
import { useGraphPhysics } from "../../hooks/useGraphPhysics";
import { computeGraphLayout, computeGroupLabels } from "../../utils/blueprintLayout";
import { colorForGroup, colorForNode, NodeKindIcon } from "./blueprintVisuals";
import styles from "./GraphCanvas.module.css";

interface GraphCanvasProps {
  blueprint: Blueprint;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  filterText: string;
}

export function GraphCanvas({ blueprint, selectedId, onSelect, filterText }: GraphCanvasProps) {
  const { nodes, edges } = blueprint.graph;

  const layout = useMemo(() => computeGraphLayout(nodes), [nodes]);
  const groupLabels = useMemo(() => computeGroupLabels(nodes), [nodes]);
  const layoutNodes = useMemo(
    () => nodes.map((n) => ({ id: n.id, x: layout[n.id]?.x ?? 0, y: layout[n.id]?.y ?? 0 })),
    [nodes, layout]
  );
  const layoutEdges = useMemo(() => edges.map((e) => ({ from: e.from, to: e.to })), [edges]);

  const physics = useGraphPhysics(layoutNodes, layoutEdges);

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const n of nodes) {
      const g = n.group ?? "Khác";
      if (!seen.has(g)) {
        seen.add(g);
        list.push(g);
      }
    }
    return list;
  }, [nodes]);

  const query = filterText.trim().toLowerCase();
  const matches = (n: BlueprintNode) => !query || n.label.toLowerCase().includes(query) || n.path?.toLowerCase().includes(query);

  const relatedToSelected = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const e of edges) {
      if (e.from === selectedId) set.add(e.to);
      if (e.to === selectedId) set.add(e.from);
    }
    return set;
  }, [edges, selectedId]);

  function handleNodePointerDown(node: BlueprintNode, e: React.PointerEvent) {
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    function handleMove(ev: PointerEvent) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 6) moved = true;
    }
    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      if (!moved) onSelect(node.id);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    physics.onNodePointerDown(node.id, e);
  }

  return (
    <div
      ref={physics.containerRef}
      className={styles.canvas}
      onPointerDown={(e) => {
        physics.onCanvasPointerDown(e);
        if (e.target === physics.containerRef.current) onSelect(null);
      }}
      onWheel={physics.onWheel}
    >
      <div ref={physics.worldRef} className={styles.world}>
        {groupLabels.map((g) => (
          <div key={g.key} className={styles.groupLabel} style={{ transform: `translate(${g.x}px, ${g.y - g.radius - 18}px) translate(-50%,-50%)` }}>
            {g.key}
          </div>
        ))}

        <svg className={styles.edgesSvg}>
          {edges.map((edge, i) => {
            const dim = relatedToSelected ? !relatedToSelected.has(edge.from) || !relatedToSelected.has(edge.to) : false;
            const highlight = relatedToSelected ? relatedToSelected.has(edge.from) && relatedToSelected.has(edge.to) : false;
            return (
              <line
                key={edge.id}
                ref={(el) => physics.registerEdgeEl(i, el)}
                className={[
                  styles.edge,
                  edge.type === "http" ? styles.edgeAlt : "",
                  dim ? styles.edgeDim : "",
                  highlight ? styles.edgeHighlight : "",
                ].join(" ")}
              />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const isDim = (query && !matches(node)) || (relatedToSelected ? !relatedToSelected.has(node.id) : false);
          const color = colorForNode(node.kind, node.group);
          return (
            <div
              key={node.id}
              ref={(el) => physics.registerNodeEl(node.id, el)}
              className={`${styles.node} ${isDim ? styles.nodeDim : ""} ${selectedId === node.id ? styles.nodeSelected : ""}`}
              style={{ borderLeftColor: color }}
              onPointerDown={(e) => handleNodePointerDown(node, e)}
            >
              <div className={styles.nodeTop}>
                <span className={styles.nodeIcon} style={{ color }}>
                  <NodeKindIcon kind={node.kind} />
                </span>
                <span className={styles.nodeKindTag}>{node.kind}</span>
              </div>
              <div className={styles.nodeLabel}>{node.label}</div>
              {node.path && <div className={styles.nodeMeta}>{node.path}</div>}
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        {groups.map((g) => (
          <span key={g} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: colorForGroup(g) }} />
            {g}
          </span>
        ))}
      </div>

      <div className={styles.zoomControls}>
        <button type="button" className={styles.zoomBtn} aria-label="Phóng to" onClick={physics.zoomIn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button type="button" className={styles.zoomBtn} aria-label="Thu nhỏ" onClick={physics.zoomOut}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M5 12h14" />
          </svg>
        </button>
        <button type="button" className={styles.zoomBtn} aria-label="Về vị trí ban đầu" onClick={physics.resetView}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12a9 9 0 109-9M3 12l4-4M3 12l4 4" />
          </svg>
        </button>
      </div>
    </div>
  );
}
