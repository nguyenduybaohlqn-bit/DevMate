import { useEffect, useState } from "react";
import type { Capability, ModeId } from "../types";

/**
 * MỘT danh sách Capability duy nhất cho cả hai mode. Companion lọc ra
 * category "observer" (dịch vụ ngoài đang quan sát), Developer lọc ra
 * category "tool" (công cụ Nexus có thể thao tác). Một vài capability
 * (vd GitHub) thuộc cả hai mode với ý nghĩa khác nhau — đúng như nhận
 * xét "Observer chính là Tool Status ở chế độ Companion".
 */
const SEED: Capability[] = [
  { id: "gmail", name: "Gmail", category: "observer", status: "idle", lastUpdate: Date.now() - 2 * 60000, modes: ["companion"] },
  { id: "calendar", name: "Lịch", category: "observer", status: "idle", lastUpdate: Date.now() - 8 * 60000, modes: ["companion"] },
  { id: "hackernews", name: "Hacker News", category: "observer", status: "idle", lastUpdate: Date.now() - 5 * 60000, modes: ["companion"] },
  { id: "github", name: "GitHub", category: "tool", status: "idle", lastUpdate: Date.now() - 1 * 60000, modes: ["companion", "developer"] },
  { id: "filesystem", name: "Filesystem", category: "tool", status: "idle", lastUpdate: Date.now(), modes: ["developer"] },
  { id: "docker", name: "Docker", category: "tool", status: "busy", lastUpdate: Date.now(), modes: ["developer"] },
  { id: "terminal", name: "Terminal", category: "tool", status: "idle", lastUpdate: Date.now(), modes: ["developer"] },
  { id: "browser", name: "Trình duyệt", category: "tool", status: "idle", lastUpdate: Date.now(), modes: ["developer"] },
];

export function useCapabilities(modeId: ModeId): Capability[] {
  const [capabilities, setCapabilities] = useState<Capability[]>(SEED);

  // Mỗi khoảng ngẫu nhiên, một capability đang hiển thị thoáng qua trạng
  // thái "checking" rồi trở lại — chỉ đổi text/dot, tạo cảm giác "sống".
  useEffect(() => {
    let cancelled = false;
    let holdTimer: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const delay = 9000 + Math.random() * 9000;
      const nextTimer = setTimeout(() => {
        if (cancelled) return;
        let targetId: string | null = null;
        setCapabilities((prev) => {
          const visible = prev.filter((c) => c.modes.includes(modeId) && c.status !== "checking");
          if (visible.length === 0) return prev;
          const target = visible[Math.floor(Math.random() * visible.length)];
          targetId = target.id;
          return prev.map((c) => (c.id === target.id ? { ...c, status: "checking" } : c));
        });
        holdTimer = setTimeout(() => {
          if (cancelled || !targetId) return;
          setCapabilities((prev) =>
            prev.map((c) => (c.id === targetId ? { ...c, status: "idle", lastUpdate: Date.now() } : c))
          );
        }, 1400 + Math.random() * 1200);
        scheduleNext();
      }, delay);
      return nextTimer;
    }

    const timer = scheduleNext();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(holdTimer);
    };
  }, [modeId]);

  return capabilities.filter((c) => c.modes.includes(modeId));
}
