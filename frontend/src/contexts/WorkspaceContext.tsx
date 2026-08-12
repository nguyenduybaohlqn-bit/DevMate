import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type {
  Agent,
  AppMode,
  BackgroundTaskDef,
  Capability,
  InboxItem,
  ModeId,
  ModeProfile,
  PermissionRequest,
  VoiceState,
} from "../types";
import { useModeProfile } from "../hooks/useModeProfile";
import { useAgents } from "../hooks/useAgents";
import { useCapabilities } from "../hooks/useCapabilities";
import { useCurrentTask, type CurrentTaskState } from "../hooks/useCurrentTask";
import { useTimeline } from "../hooks/useTimeline";
import { useInbox } from "../hooks/useInbox";
import { usePermission } from "../hooks/usePermission";
import { useVoiceMode } from "../hooks/useVoiceMode";

interface WorkspaceContextValue {
  modeId: ModeId;
  profile: ModeProfile;
  setMode: (id: ModeId) => void;

  agents: Agent[];
  capabilities: Capability[];

  task: CurrentTaskState;
  runTask: (def: BackgroundTaskDef) => Promise<void>;

  timeline: { id: string; time: Date; text: string }[];
  addTimelineEntry: (text: string, time?: Date) => void;

  inbox: InboxItem[];
  dismissInboxItem: (id: string) => void;
  pushInboxItem: (item: Omit<InboxItem, "id">) => void;

  queue: string[];

  permission: PermissionRequest | null;
  askPermission: (req: { summary: string; detail?: string }) => Promise<boolean>;
  respondPermission: (allowed: boolean) => void;

  // Voice — nâng lên đây vì cả VoiceStage (trung tâm chat) lẫn
  // VoiceStatusWidget (panel phải) đều cần cùng một trạng thái thật.
  voiceMode: AppMode;
  voiceState: VoiceState;
  enterVoiceMode: () => void;
  exitVoiceMode: () => void;
  requestTalk: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const BG_TASKS_BY_MODE: Record<ModeId, BackgroundTaskDef[]> = {
  companion: [
    {
      steps: [
        { type: "progress", label: "Đang đọc Gmail", durationMs: 2200 },
        { type: "note", label: "Tìm thấy 3 email chưa đọc", holdMs: 1700 },
        { type: "progress", label: "Đang tóm tắt", durationMs: 1800 },
        { type: "note", label: "Hoàn tất", holdMs: 1100 },
      ],
      log: ["Đã kiểm tra Gmail", "Tìm thấy 3 email quan trọng"],
      inboxItem: { kind: "warn", text: "3 email quan trọng chưa đọc" },
    },
    {
      steps: [
        { type: "progress", label: "Đang xem GitHub", durationMs: 1900 },
        { type: "note", label: "Có 2 pull request mới", holdMs: 1500 },
      ],
      log: ["Đã đồng bộ GitHub", "Có 2 pull request mới"],
    },
    {
      steps: [
        { type: "progress", label: "Đang đọc Hacker News", durationMs: 2000 },
        { type: "note", label: "1 bài viết đáng chú ý", holdMs: 1400 },
      ],
      log: ["Đọc xong Hacker News"],
    },
  ],
  developer: [
    {
      steps: [
        { type: "progress", label: "Coder đang sửa Login.tsx", durationMs: 2200 },
        { type: "note", label: "Đã sửa 3 tệp", holdMs: 1400 },
        { type: "progress", label: "Đang chạy kiểm thử", durationMs: 1800 },
        { type: "note", label: "Kiểm thử đã pass", holdMs: 1100 },
      ],
      log: ["Coder đã sửa 3 tệp", "Kiểm thử đã pass"],
    },
    {
      steps: [
        { type: "progress", label: "Reviewer đang xem PR #42", durationMs: 1900 },
        { type: "note", label: "Đề xuất 2 thay đổi nhỏ", holdMs: 1500 },
      ],
      log: ["Reviewer đã xem xong PR #42"],
    },
  ],
};

const QUEUE_BY_MODE: Record<ModeId, string[]> = {
  companion: [],
  developer: ["Viết test cho Streaming", "Review PR #42", "Deploy staging"],
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { modeId, profile, setMode } = useModeProfile();
  const agents = useAgents(modeId);
  const capabilities = useCapabilities(modeId);
  const { task, runSteps } = useCurrentTask();
  const { entries, addEntry } = useTimeline();
  const { items, dismiss, push } = useInbox();
  const { request, ask, respond } = usePermission();
  const { mode: voiceMode, voiceState, enterVoiceMode, exitVoiceMode, requestTalk } = useVoiceMode();

  const taskRef = useRef(task);
  taskRef.current = task;

  async function runTask(def: BackgroundTaskDef) {
    await runSteps(def.steps);
    def.log.forEach((line, i) => setTimeout(() => addEntry(line), i * 550));
    if (def.inboxItem) {
      const item = def.inboxItem;
      setTimeout(() => push(item), def.log.length * 550 + 300);
    }
  }

  // Tác vụ nền: Nexus tự làm việc định kỳ, kể cả khi không ai chat.
  // Chỉ đổi chữ trong TaskWidget — không popup, không loading lớn.
  useEffect(() => {
    let cancelled = false;
    function scheduleNext() {
      const delay = 20000 + Math.random() * 16000;
      const timer = setTimeout(() => {
        if (!cancelled && !taskRef.current.active && voiceMode !== "voice") {
          const pool = BG_TASKS_BY_MODE[modeId];
          const def = pool[Math.floor(Math.random() * pool.length)];
          void runTask(def);
        }
        scheduleNext();
      }, delay);
      return timer;
    }
    const t = scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modeId, voiceMode]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      modeId,
      profile,
      setMode,
      agents,
      capabilities,
      task,
      runTask,
      timeline: entries,
      addTimelineEntry: addEntry,
      inbox: items,
      dismissInboxItem: dismiss,
      pushInboxItem: push,
      queue: QUEUE_BY_MODE[modeId],
      permission: request,
      askPermission: ask,
      respondPermission: respond,
      voiceMode,
      voiceState,
      enterVoiceMode,
      exitVoiceMode,
      requestTalk,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modeId, profile, agents, capabilities, task, entries, items, request, voiceMode, voiceState]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace phải được gọi bên trong <WorkspaceProvider>");
  return ctx;
}
