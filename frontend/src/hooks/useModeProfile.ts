import { useCallback, useState } from "react";
import type { ModeId, ModeProfile } from "../types";

/**
 * Mode KHÔNG phải hai giao diện khác nhau — chỉ là cấu hình nói "bật
 * widget nào, theo thứ tự nào". Thêm mode mới (Research, Automation...)
 * sau này = thêm 1 entry ở đây, không phải thiết kế lại layout.
 */
const PROFILES: Record<ModeId, ModeProfile> = {
  companion: {
    id: "companion",
    label: "Companion",
    description: "Đồng hành hằng ngày — nhẹ nhàng, ít chi tiết kỹ thuật.",
    widgets: ["status", "task", "inbox", "goal", "capabilities", "timeline", "voiceStatus"],
    capabilityLabel: "ĐANG QUAN SÁT",
  },
  developer: {
    id: "developer",
    label: "Developer",
    description: "Nhiều agent chuyên trách — chi tiết đầy đủ cho công việc kỹ thuật.",
    widgets: ["status", "agentPanel", "task", "queue", "capabilities", "timeline", "memory"],
    capabilityLabel: "TRẠNG THÁI CÔNG CỤ",
  },
};

interface UseModeProfileReturn {
  modeId: ModeId;
  profile: ModeProfile;
  setMode: (id: ModeId) => void;
  allProfiles: ModeProfile[];
}

export function useModeProfile(initial: ModeId = "companion"): UseModeProfileReturn {
  const [modeId, setModeId] = useState<ModeId>(initial);
  const setMode = useCallback((id: ModeId) => setModeId(id), []);
  return { modeId, profile: PROFILES[modeId], setMode, allProfiles: Object.values(PROFILES) };
}
