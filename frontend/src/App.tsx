import { useState } from "react";
import { useAuth, getCurrentUser } from "./hooks/useAuth";
import { useSessions } from "./hooks/useSessions";
import { useChat } from "./hooks/useChat";
import { useConnectionStatus } from "./hooks/useConnectionStatus";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { AuthScreen } from "./components/AuthScreen";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { NexusLivePanel } from "./components/NexusLivePanel";
import { useEffect } from "react";
import { fetchMessages } from "./services/conversationApi";
import "./App.css";

export default function App() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return (
      <div className="app">
        <AuthScreen auth={auth} />
      </div>
    );
  }

  return <MainShell onSignOut={auth.signOut} />;
}

interface MainShellProps {
  onSignOut: () => void;
}

function MainShell({ onSignOut }: MainShellProps) {
  const {
    sessions,
    activeKey,
    activeSession,
    isLoadingSessions,
    createSession,
    selectSession,
    renameActiveOnCreated,
  } = useSessions();
  const connection = useConnectionStatus();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const username = getCurrentUser()?.username ?? "Bạn";

  // KHÔNG còn effect tạo session mặc định ở đây nữa.
  // useSessions.ts đã tự lo việc này (fetch xong mà DB trống thì mới tạo
  // đúng 1 session mặc định). Nếu để cả 2 nơi cùng tạo sẽ bị nhân đôi.

  // Trong lúc đang fetch danh sách hội thoại từ backend, hiển thị màn
  // hình loading thay vì <div className="app" /> trống trơn — vừa tránh
  // trắng màn hình, vừa cho người dùng biết app đang tải.
  if (isLoadingSessions || !activeSession) {
    return (
      <div className="app">
        <div className="app-loading">Đang tải...</div>
      </div>
    );
  }

  return (
    <WorkspaceProvider>
      <div className="app">
        <Sidebar
          sessions={sessions}
          activeKey={activeKey}
          onSelectSession={selectSession}
          onNewSession={createSession}
          brandCoreState={connection.coreState}
          username={username}
          onSignOut={onSignOut}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <ChatSession
          key={activeSession.key}
          conversationId={activeSession.id}
          onConversationCreated={renameActiveOnCreated}
          sessionTitle={activeSession.title}
          baseStatusText={connection.statusText}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <NexusLivePanel />
      </div>
    </WorkspaceProvider>
  );
}

interface ChatSessionProps {
  conversationId: number | null;
  onConversationCreated: (id: number, title: string) => void;
  sessionTitle: string;
  baseStatusText: string;
  onOpenMobileMenu: () => void;
}

/**
 * Bọc `useChat` riêng cho từng phiên. Nhờ được mount lại mỗi khi chuyển
 * phiên (App truyền `key={session.key}`), state tin nhắn luôn sạch, không
 * lẫn giữa các phiên khác nhau.
 *
 * TODO: khi chọn lại một phiên đã có lịch sử, gọi API lấy tin nhắn cũ
 * (chưa có endpoint tương ứng trong `chatApi`) rồi `loadMessages(...)`
 * ngay sau khi mount — hiện tại phiên sẽ trống lại vì chưa có bước này.
 */
function ChatSession({
  conversationId,
  onConversationCreated,
  sessionTitle,
  baseStatusText,
  onOpenMobileMenu,
}: ChatSessionProps) {
  const chat = useChat(conversationId, onConversationCreated);

  useEffect(() => {
    if (!conversationId) return; // phiên mới tạo, chưa có lịch sử -> bỏ qua

    let cancelled = false;

    fetchMessages(conversationId)
      .then((msgs) => {
        if (cancelled) return;
        // MessageDTO.timestamp là string, nhưng Message.timestamp (dùng trong
        // useChat/ChatArea) là Date -> phải convert, nếu không MessageBubble
        // có thể lỗi khi gọi .toLocaleTimeString() hay tương tự.
        chat.loadMessages(
          msgs.map((m) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }))
        );
      })
      .catch((err) => {
        console.error("Không thể tải tin nhắn cũ:", err);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  return (
    <ChatArea
      sessionTitle={sessionTitle}
      messages={chat.messages}
      input={chat.input}
      onInputChange={chat.setInput}
      onSend={chat.sendMessage}
      loading={chat.loading}
      onStop={chat.stopGenerating}
      attachments={chat.attachments}
      onAddAttachment={chat.addAttachment}
      onRemoveAttachment={chat.removeAttachment}
      baseStatusText={baseStatusText}
      onOpenMobileMenu={onOpenMobileMenu}
    />
  );
}