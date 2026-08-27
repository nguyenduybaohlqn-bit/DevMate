import type { NodeKind } from "../../types";

const GROUP_PALETTE = ["#35d6ff", "#8b7cf6", "#ffb020", "#3ddc97", "#ef5350", "#5b8def"];
const groupColorCache = new Map<string, string>();

/** Màu ổn định cho 1 group — group nào xuất hiện trước lấy màu trước, lặp
 *  lại bảng màu nếu nhiều group hơn số màu. Không hardcode tên group cụ
 *  thể (Frontend/Backend...) vì backend thật có thể trả về bất kỳ tên nào. */
export function colorForGroup(group?: string): string {
  const key = group ?? "—";
  if (!groupColorCache.has(key)) {
    groupColorCache.set(key, GROUP_PALETTE[groupColorCache.size % GROUP_PALETTE.length]);
  }
  return groupColorCache.get(key)!;
}

export function colorForNode(kind: NodeKind, group?: string): string {
  if (kind === "database") return "#3ddc97";
  if (kind === "external") return "#5c7a8c";
  return colorForGroup(group);
}

export const KIND_LABEL: Record<NodeKind, string> = {
  folder: "Folder",
  component: "Component",
  hook: "Hook",
  service: "Service",
  endpoint: "Endpoint",
  class: "Class",
  function: "Function",
  interface: "Interface",
  repository: "Repository",
  database: "Database",
  external: "External",
};

interface KindIconProps {
  kind: NodeKind;
  size?: number;
}

/** Icon nhỏ theo kind — gộp các kind gần nhau dùng chung 1 hình để đỡ phải
 *  vẽ 11 icon riêng biệt (folder / code / endpoint / data / external). */
export function NodeKindIcon({ kind, size = 14 }: KindIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "folder") {
    return (
      <svg {...common}>
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    );
  }
  if (kind === "endpoint") {
    return (
      <svg {...common}>
        <path d="M4 12h16M14 6l6 6-6 6" />
      </svg>
    );
  }
  if (kind === "database" || kind === "repository") {
    return (
      <svg {...common}>
        <ellipse cx="12" cy="6" rx="8" ry="3" />
        <path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" />
        <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </svg>
    );
  }
  if (kind === "external") {
    return (
      <svg {...common}>
        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
        <path d="M15 3h6v6M10 14L21 3" />
      </svg>
    );
  }
  // component / hook / service / class / function / interface -> icon "code"
  return (
    <svg {...common}>
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}
