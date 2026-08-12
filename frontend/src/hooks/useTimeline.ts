import { useCallback, useState } from "react";
import type { TimelineEntry } from "../types";

let counter = 0;

/** Mồi sẵn lịch sử để panel trông như đã hoạt động một lúc, không trống
 *  trơn khi vừa mở app. `minutesAgo` giảm dần = càng gần hiện tại. */
const SEED_LOG: Array<{ minutesAgo: number; text: string }> = [
  { minutesAgo: 14, text: "Đã kiểm tra Gmail" },
  { minutesAgo: 12, text: "Tìm thấy 3 email quan trọng" },
  { minutesAgo: 8, text: "Đã đồng bộ Git" },
  { minutesAgo: 5, text: "Đọc xong Hacker News" },
  { minutesAgo: 2, text: "Cập nhật hạn mức API" },
];

export function useTimeline() {
  const [entries, setEntries] = useState<TimelineEntry[]>(() => {
    const now = Date.now();
    return SEED_LOG.map((s, i) => ({
      id: `seed-${i}`,
      time: new Date(now - s.minutesAgo * 60000),
      text: s.text,
    })).reverse();
  });

  const addEntry = useCallback((text: string, time?: Date) => {
    setEntries((prev) => {
      const entry: TimelineEntry = { id: `t-${Date.now()}-${counter++}`, time: time ?? new Date(), text };
      return [entry, ...prev].slice(0, 10);
    });
  }, []);

  return { entries, addEntry };
}
