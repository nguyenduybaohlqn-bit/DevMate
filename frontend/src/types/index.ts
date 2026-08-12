// ============================================================
//  Kiểu dữ liệu dùng chung cho toàn app
// ============================================================

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: Date;
}

/** Một phiên hội thoại hiển thị trong sidebar.
 *  `key` ổn định phía client (dùng làm React key & để biết phiên nào
 *  đang active) — tách biệt khỏi `id`, vì `id` là null cho tới khi
 *  backend trả về id thật (sau tin nhắn đầu tiên tạo conversation mới).
 *  Tách hai khái niệm này để tránh nhầm "chưa có id thật" thành "có id"
 *  khi dùng số âm/placeholder làm id tạm. */
export interface Chat {
  key: string;
  id: number | null;
  title: string;
}

export type AttachmentKind = "pdf" | "image" | "video";

export interface Attachment {
  file: File;
  kind: AttachmentKind;
}

/** Chế độ tương tác hiện tại của composer. */
export type AppMode = "chat" | "voice";

/** Trạng thái con trong voice mode — điều khiển hoạt ảnh của ReactorCore
 *  và dải sóng âm. Xem hook `useReactorEngine`. */
export type VoiceState = "idle" | "user-speaking" | "ai-thinking" | "ai-speaking";

/** Trạng thái hiển thị của ReactorCore (dùng cho các core nhỏ — header,
 *  avatar tin nhắn, nút gửi — vốn dùng CSS animation đơn giản thay vì
 *  engine vật lý liên tục của reactor trung tâm). */
export type CoreState = "idle" | "thinking" | "streaming";

// ============================================================
//  Kiến trúc Mode / Widget
//
//  Nguyên tắc: Mode KHÔNG quyết định giao diện. Mode chỉ là một config
//  (ModeProfile) nói "bật widget nào, theo thứ tự nào". Bản thân từng
//  widget là component độc lập, tự đọc dữ liệu nó cần qua useWorkspace(),
//  không biết và không quan tâm mode nào đang active. Nhờ vậy thêm một
//  mode mới (Research, Automation...) sau này chỉ là thêm 1 ModeProfile
//  và ghép lại các widget đã có — không cần sửa từng widget.
// ============================================================

export type ModeId = "companion" | "developer";

export type WidgetId =
  | "status"
  | "task"
  | "agentPanel"
  | "capabilities"
  | "queue"
  | "inbox"
  | "goal"
  | "timeline"
  | "memory"
  | "voiceStatus";

export interface ModeProfile {
  id: ModeId;
  label: string;
  description: string;
  /** Thứ tự các widget được mount trong Nexus Live panel. */
  widgets: WidgetId[];
  /** Nhãn của khối Capability đổi theo mode — cùng dữ liệu, khác cách gọi tên. */
  capabilityLabel: string;
}

/** Một "năng lực" — có thể là dịch vụ ngoài Nexus đang quan sát (Gmail,
 *  GitHub...) hoặc một công cụ Nexus có thể thao tác trực tiếp
 *  (Filesystem, Terminal...). Companion hiển thị nhóm "observer" dưới tên
 *  "Đang quan sát"; Developer hiển thị nhóm "tool" dưới tên "Trạng thái
 *  công cụ" — CÙNG một component render, khác nhãn/bộ lọc theo mode. */
export type CapabilityCategory = "observer" | "tool";
export type CapabilityStatus = "idle" | "checking" | "active" | "busy" | "error" | "disconnected";

export interface Capability {
  id: string;
  name: string;
  category: CapabilityCategory;
  status: CapabilityStatus;
  lastUpdate: number;
  /** Capability nào hiển thị ở mode nào — 1 item có thể thuộc nhiều mode (vd GitHub). */
  modes: ModeId[];
}

export type AgentStatus = "idle" | "running" | "busy" | "error";

/** Companion luôn có đúng 1 Agent ("Nexus") — khi chỉ có 1 agent, panel
 *  Agent tự thu gọn thành dòng Status thay vì hiện danh sách riêng.
 *  Developer có N agent chuyên trách, hiện đầy đủ trong AgentPanelWidget. */
export interface Agent {
  id: string;
  name: string;
  model?: string;
  status: AgentStatus;
}

export interface TimelineEntry {
  id: string;
  time: Date;
  text: string;
}

export type InboxKind = "warn" | "ok" | "info";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  text: string;
}

/** Một bước trong tác vụ hiện tại: "progress" có thời lượng + gauge chạy,
 *  "note" chỉ đổi chữ trong chốc lát (không gauge) — dùng cho các mốc kiểu
 *  "Tìm thấy 3 email chưa đọc" xen giữa các bước có tiến trình thật. */
export type CurrentTaskStepType = "progress" | "note";

export interface CurrentTaskStep {
  type: CurrentTaskStepType;
  label: string;
  durationMs?: number;
  holdMs?: number;
}

export interface BackgroundTaskDef {
  steps: CurrentTaskStep[];
  log: string[];
  inboxItem?: Omit<InboxItem, "id">;
}

export interface PermissionRequest {
  id: string;
  summary: string;
  detail?: string;
}
