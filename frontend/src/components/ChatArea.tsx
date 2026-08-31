import { useCallback, useEffect, useRef } from "react";
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
  baseStatusText: string;
  onOpenMobileMenu: () => void;
}

const VOICE_STATUS_TEXT: Record<VoiceState, string> = {
  idle: "TRỰC TUYẾN",
  "user-speaking": "ĐANG LẮNG NGHE",
  "ai-thinking": "ĐANG XỬ LÝ",
  "ai-speaking": "NEXUS ĐANG NÓI",
};

const BOTTOM_THRESHOLD_PX = 80;
// Thời gian chờ sau khi nhả tay, để hết đà cuộn (momentum scroll) trên
// mobile trước khi cho phép auto-scroll hoạt động trở lại.
const TOUCH_SETTLE_MS = 300;

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

  // Ý định "bám đáy" của user — dựa trên khoảng cách thực tế sau khi cuộn.
  const isNearBottomRef = useRef(true);
  // Đang trong lúc user chạm/kéo (hoặc vừa nhả tay, còn đà cuộn) ->
  // TUYỆT ĐỐI không ép scrollTop trong lúc này, bất kể isNearBottomRef.
  const isUserTouchingRef = useRef(false);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recomputeNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distance < BOTTOM_THRESHOLD_PX;
  }, []);

  // Gắn listener bắt Ý ĐỊNH kéo, không chỉ kết quả sau khi đã cuộn.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => recomputeNearBottom();

    const handleTouchStart = () => {
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      // Chạm tay vào là dừng auto-scroll NGAY, không chờ đo khoảng cách.
      isUserTouchingRef.current = true;
    };

    const handleTouchEnd = () => {
      // Đợi hết đà cuộn (iOS/Android có momentum scroll kéo dài sau khi
      // nhả tay) rồi mới cho phép auto-scroll hoạt động trở lại.
      settleTimeoutRef.current = setTimeout(() => {
        isUserTouchingRef.current = false;
        recomputeNearBottom();
      }, TOUCH_SETTLE_MS);
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        // Cuộn lên bằng chuột/trackpad -> ngắt bám đáy ngay lập tức,
        // không chờ vượt ngưỡng khoảng cách.
        isNearBottomRef.current = false;
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });
    el.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
      el.removeEventListener("wheel", handleWheel);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    };
  }, [recomputeNearBottom]);

  // Reset về "bám đáy" khi chuyển sang conversation khác.
  const firstMessageId = messages[0]?.id;
  useEffect(() => {
    isNearBottomRef.current = true;
    isUserTouchingRef.current = false;
  }, [firstMessageId]);

  // Chỉ auto-scroll khi: không đang chạm tay/còn đà cuộn, VÀ đang bám đáy.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isUserTouchingRef.current) return;
    if (!isNearBottomRef.current) return;

    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
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