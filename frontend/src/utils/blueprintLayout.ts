import type { BlueprintNode } from "../types";

export interface LayoutPosition {
  x: number;
  y: number;
}

const GROUP_COL_SPACING = 560;
const GROUP_ROW_SPACING = 520;
const CLUSTER_BASE_RADIUS = 70;
const CLUSTER_RADIUS_PER_NODE = 20;
const UNGROUPED_KEY = "—";

function groupNodesByKey(nodes: BlueprintNode[]): Map<string, BlueprintNode[]> {
  const groups = new Map<string, BlueprintNode[]>();
  for (const n of nodes) {
    const key = n.group ?? UNGROUPED_KEY;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(n);
  }
  return groups;
}

/** Vị trí "nhà" cho từng node: nhóm theo `group`, mỗi group là 1 cụm tròn
 *  quanh 1 tâm riêng; các tâm nhóm dàn theo lưới để không đè lên nhau. */
export function computeGraphLayout(nodes: BlueprintNode[]): Record<string, LayoutPosition> {
  const groups = groupNodesByKey(nodes);
  const groupKeys = Array.from(groups.keys());
  const columns = Math.max(1, Math.ceil(Math.sqrt(groupKeys.length)));

  const positions: Record<string, LayoutPosition> = {};

  groupKeys.forEach((key, gi) => {
    const col = gi % columns;
    const row = Math.floor(gi / columns);
    const centerX = col * GROUP_COL_SPACING + GROUP_COL_SPACING / 2;
    const centerY = row * GROUP_ROW_SPACING + GROUP_ROW_SPACING / 2;

    const groupNodes = groups.get(key)!;
    const radius = CLUSTER_BASE_RADIUS + groupNodes.length * CLUSTER_RADIUS_PER_NODE;

    groupNodes.forEach((n, i) => {
      if (groupNodes.length === 1) {
        positions[n.id] = { x: centerX, y: centerY };
        return;
      }
      const angle = (i / groupNodes.length) * Math.PI * 2 - Math.PI / 2;
      positions[n.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      };
    });
  });

  return positions;
}

export interface GroupLabel {
  key: string;
  x: number;
  y: number;
  radius: number;
}

/** Tâm + bán kính của từng cụm group — dùng để vẽ nhãn mờ phía sau graph
 *  (vd chữ "FRONTEND" lớn, mờ, làm nền cho cụm node tương ứng). */
export function computeGroupLabels(nodes: BlueprintNode[]): GroupLabel[] {
  const groups = groupNodesByKey(nodes);
  const groupKeys = Array.from(groups.keys()).filter((k) => k !== UNGROUPED_KEY);
  const columns = Math.max(1, Math.ceil(Math.sqrt(Array.from(groups.keys()).length)));

  return groupKeys.map((key) => {
    const gi = Array.from(groups.keys()).indexOf(key);
    const col = gi % columns;
    const row = Math.floor(gi / columns);
    const groupNodes = groups.get(key)!;
    return {
      key,
      x: col * GROUP_COL_SPACING + GROUP_COL_SPACING / 2,
      y: row * GROUP_ROW_SPACING + GROUP_ROW_SPACING / 2,
      radius: CLUSTER_BASE_RADIUS + groupNodes.length * CLUSTER_RADIUS_PER_NODE + 50,
    };
  });
}
