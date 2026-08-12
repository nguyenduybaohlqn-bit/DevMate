import { useCallback, useState } from "react";
import type { InboxItem } from "../types";

const SEED: InboxItem[] = [
  { id: "i1", kind: "warn", text: "3 email quan trọng chưa đọc" },
  { id: "i2", kind: "warn", text: "Hạn mức Gemini còn dưới 10%" },
  { id: "i3", kind: "info", text: "Có bài báo AI mới đáng chú ý" },
  { id: "i4", kind: "ok", text: "Server production đang hoạt động ổn định" },
];

let counter = 0;

export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>(SEED);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const push = useCallback((item: Omit<InboxItem, "id">) => {
    setItems((prev) => [{ ...item, id: `i-${Date.now()}-${counter++}` }, ...prev]);
  }, []);

  return { items, dismiss, push };
}
