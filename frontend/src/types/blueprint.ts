// ============================================================
//  Blueprint — hợp đồng dữ liệu giữa backend (engine quét codebase)
//  và frontend (Blueprint view). Ba lớp tách bạch có chủ đích:
//
//    1. graph      — CHỈ để vẽ. Frontend không cần hiểu code, chỉ render
//                    nodes[]/edges[].
//    2. metadata    — để hiện panel bên phải khi click 1 node. Tra theo
//                    id, không cần AI chạy lại.
//    3. modules / features / symbols / dependencies / entrypoints
//                  — lớp ngữ nghĩa để AI tái sử dụng (trả lời "How does
//                    chat work?" mà không cần quét lại codebase).
//
//  Frontend chỉ tiêu thụ dữ liệu này — không tự suy luận quan hệ.
// ============================================================

export type NodeKind =
  | "folder"
  | "component"
  | "hook"
  | "service"
  | "endpoint"
  | "class"
  | "function"
  | "interface"
  | "repository"
  | "database"
  | "external";

export interface BlueprintNodeMetrics {
  loc?: number;
  complexity?: number;
}

export interface BlueprintNode {
  id: string;
  label: string;
  kind: NodeKind;
  /** Nhóm logic để cụm layout — "Frontend", "Backend"... Không có thì node đứng riêng. */
  group?: string;
  path?: string;
  summary?: string;
  /** id các node con (quan hệ chứa đựng — vd folder chứa file). */
  children?: string[];
  metrics?: BlueprintNodeMetrics;
  tags?: string[];
}

export type EdgeType = "imports" | "uses" | "calls" | "http" | "extends" | "implements";

export interface BlueprintEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
}

export interface BlueprintGraph {
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

/** Nhóm logic của hệ thống (Chat, Auth, Payment, AI...) — dùng để lọc/tô
 *  sáng trong Explorer, không phải để vẽ (đó là việc của `group` trên node). */
export interface BlueprintModule {
  id: string;
  name: string;
  nodeIds: string[];
}

export interface BlueprintFeature {
  id: string;
  feature: string;
  description: string;
  /** id các node là điểm bắt đầu của tính năng này (khớp với entrypoints[].id). */
  entrypoints: string[];
}

export type SymbolKind = "class" | "function" | "interface" | "hook" | "endpoint" | "type";

export interface BlueprintSymbol {
  id: string;
  name: string;
  kind: SymbolKind;
  /** node chứa symbol này (vd 1 file có nhiều function). */
  nodeId: string;
  signature?: string;
}

export interface BlueprintDependency {
  from: string;
  to: string;
  type: EdgeType;
}

export interface BlueprintEntrypoint {
  id: string;
  label: string;
  nodeId: string;
}

/** Thông tin hiển thị khi chọn 1 node — tra theo id, panel không cần AI
 *  chạy lại để có nội dung này. */
export interface BlueprintMetadataEntry {
  id: string;
  kind: NodeKind;
  name: string;
  summary?: string;
  language?: string;
  path?: string;
  lines?: number;
  public_functions?: string[];
  depends_on?: string[];
  referenced_by?: string[];
  notes?: string;
}

export type DiagnosticSeverity = "info" | "warning" | "error";

export interface BlueprintDiagnostic {
  id: string;
  severity: DiagnosticSeverity;
  message: string;
  nodeIds?: string[];
}

export interface BlueprintStatistics {
  fileCount: number;
  moduleCount: number;
  edgeCount: number;
  languages: string[];
  linesOfCode?: number;
  lastScanAt?: string; // ISO timestamp
}

export interface BlueprintProjectInfo {
  name: string;
  language: string;
  framework: string;
}

export interface Blueprint {
  project: BlueprintProjectInfo;
  graph: BlueprintGraph;
  modules: BlueprintModule[];
  features: BlueprintFeature[];
  symbols: BlueprintSymbol[];
  dependencies: BlueprintDependency[];
  entrypoints: BlueprintEntrypoint[];
  /** Map theo node id để tra O(1) khi click chọn node. */
  metadata: Record<string, BlueprintMetadataEntry>;
  diagnostics: BlueprintDiagnostic[];
  statistics: BlueprintStatistics;
}
