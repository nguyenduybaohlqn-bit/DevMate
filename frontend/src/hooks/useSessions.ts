import { useCallback, useEffect, useState } from "react";
import type { Chat } from "../types";
import { fetchConversations } from "../services/conversationApi";

function makeKey(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface UseSessionsReturn {
  sessions: Chat[];
  activeKey: string | null;
  activeSession: Chat | undefined;
  isLoadingSessions: boolean;
  createSession: () => void;
  selectSession: (key: string) => void;
  renameActiveOnCreated: (id: number, title: string) => void;
}

const CURRENT_USER_ID = 1;

/** Quản lý danh sách phiên hội thoại trong sidebar. Việc lưu trữ tin nhắn
 *  thực tế của phiên đang hoạt động do `useChat` đảm nhiệm. */
export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<Chat[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // LƯU Ý: KHÔNG dùng thêm cờ kiểu `hasInitialized` (useRef) để chặn effect
  // chạy 2 lần ở đây — làm vậy sẽ xung đột với cơ chế `cancelled` bên dưới:
  // lượt effect "thật" (không bị hủy) sẽ bị chặn không cho chạy, chỉ còn
  // lại lượt bị hủy (cancelled=true) chạy fetch nhưng kết quả bị vứt bỏ vì
  // `if (cancelled) return` — khiến `isLoadingSessions` không bao giờ được
  // set về false (loading vô hạn). Cơ chế `cancelled` dưới đây tự nó đã đủ
  // để xử lý đúng StrictMode double-invoke (lượt ảo tự hủy, lượt thật chạy
  // và set state bình thường) — không cần thêm ref nào nữa.
  useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        setIsLoadingSessions(true);
        const convs = await fetchConversations(CURRENT_USER_ID);
        if (cancelled) return;

        const mapped: Chat[] = convs.map((c) => ({
          key: `s_${c.id}`,
          id: Number(c.id),
          title: c.title,
        }));

        if (mapped.length > 0) {
          setSessions(mapped);
          setActiveKey(mapped[0].key);
        } else {
          // DB thực sự trống → tạo đúng 1 session mặc định, không hơn.
          const key = makeKey();
          setSessions([{ key, id: null, title: "Phiên làm việc mới" }]);
          setActiveKey(key);
        }
      } catch (err) {
        console.error("Không thể tải danh sách hội thoại:", err);
        // Lỗi mạng/backend: vẫn tạo 1 session tạm để tránh màn hình trắng.
        const key = makeKey();
        setSessions([{ key, id: null, title: "Phiên làm việc mới" }]);
        setActiveKey(key);
      } finally {
        if (!cancelled) setIsLoadingSessions(false);
      }
    }

    loadConversations();
    return () => {
      cancelled = true;
    };
  }, []);

  const createSession = useCallback(() => {
    const key = makeKey();
    setSessions((prev) => [{ key, id: null, title: "Phiên làm việc mới" }, ...prev]);
    setActiveKey(key);
  }, []);

  const selectSession = useCallback((key: string) => {
    setActiveKey(key);
  }, []);

  const renameActiveOnCreated = useCallback(
    (id: number, title: string) => {
      setSessions((prev) => prev.map((s) => (s.key === activeKey ? { ...s, id, title } : s)));
    },
    [activeKey]
  );

  const activeSession = sessions.find((s) => s.key === activeKey);

  return {
    sessions,
    activeKey,
    activeSession,
    isLoadingSessions,
    createSession,
    selectSession,
    renameActiveOnCreated,
  };
}