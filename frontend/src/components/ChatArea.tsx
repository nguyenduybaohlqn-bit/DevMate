import { useEffect, useRef } from "react";
import type { Attachment, Message, VoiceState } from "../types";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { StatusBar } from "./StatusBar";
import { VoiceStage } from "./VoiceStage";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";
import { ThinkingDots } from "./ThinkingDots";
import { ReactorCore } from "./ReactorCore";
import bubbleStyles from "./MessageBubble.module.css";
import styles from "./ChatArea.module.css";

interface ChatAreaProps {
  sessionTitle: string;
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  onStop: () => void;
  attachments: Attachment[];
  onAddAttachment: (a: Attachment) => void;
  onRemoveAttachment: (index: number) => void;
  /** Trạng thái kết nối nền (từ useConnectionStatus ở App) — dùng khi
   *  không ở voice mode; trong voice mode, statusbar phản ánh voiceState. */
  baseStatusText: string;
  onOpenMobileMenu: () => void;
}

const VOICE_STATUS_TEXT: Record<VoiceState, string> = {
  idle: "TRỰC TUYẾN",
  "user-speaking": "ĐANG LẮNG NGHE",
  "ai-thinking": "ĐANG XỬ LÝ",
  "ai-speaking": "NEXUS ĐANG NÓI",
};

export function ChatArea({
  sessionTitle,
  messages,
  input,
  onInputChange,
  onSend,
  loading,
  onStop,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  baseStatusText,
  onOpenMobileMenu,
}: ChatAreaProps) {
  const { voiceMode: mode, voiceState, enterVoiceMode, exitVoiceMode, requestTalk } = useWorkspace();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tự cuộn xuống cuối mỗi khi danh sách tin nhắn đổi (kể cả từng ký tự stream).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages]);

  const statusText = mode === "voice" ? VOICE_STATUS_TEXT[voiceState] : baseStatusText;
  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const isStreamingLast = loading && lastMessage?.role === "assistant";

  return (
    <main className={styles.chat}>
      <StatusBar sessionTitle={sessionTitle} statusText={statusText} onOpenMobileMenu={onOpenMobileMenu} />

      <div className={styles.stage}>
        <VoiceStage
          mode={mode}
          voiceState={voiceState}
          isEmpty={isEmpty}
          onCoreClick={requestTalk}
          onExitVoice={exitVoiceMode}
        />

        <div
          className={`${styles.messages} ${mode === "voice" ? styles.messagesHidden : ""}`}
          ref={scrollRef}
        >
          <div className={styles.messagesInner}>
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1;
              const streamingThis = isStreamingLast && isLast;

              // Trong lúc chờ chunk đầu tiên (content rỗng) -> hiện ThinkingDots
              // thay vì một bubble trống.
              if (streamingThis && msg.content === "") {
                return (
                  <div key={msg.id} className={`${bubbleStyles.msg} ${bubbleStyles.msgAssistant}`}>
                    <div className={bubbleStyles.avatar}>
                      <ReactorCore size={26} state="thinking" />
                    </div>
                    <div className={`${bubbleStyles.bubble} frame`}>
                      <ThinkingDots />
                    </div>
                  </div>
                );
              }

              return <MessageBubble key={msg.id} message={msg} isStreaming={streamingThis} />;
            })}
          </div>
        </div>
      </div>

      <Composer
        mode={mode}
        voiceState={voiceState}
        input={input}
        onInputChange={onInputChange}
        onSend={onSend}
        loading={loading}
        onStop={onStop}
        attachments={attachments}
        onAddAttachment={onAddAttachment}
        onRemoveAttachment={onRemoveAttachment}
        onEnterVoice={enterVoiceMode}
        onExitVoice={exitVoiceMode}
      />
    </main>
  );
}
