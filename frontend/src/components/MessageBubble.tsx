import type { Message } from "../types";
import { formatTime } from "../utils/format";
import { ReactorCore } from "./ReactorCore";
import styles from "./MessageBubble.module.css";

interface MessageBubbleProps {
  message: Message;
  /** true nếu đây là tin nhắn AI đang được stream từng ký tự */
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`${styles.msg} ${isUser ? styles.msgUser : styles.msgAssistant}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <ReactorCore size={26} state={isStreaming ? "streaming" : "idle"} />
        </div>
      )}
      <div className={`${styles.bubble} frame`}>
        <p className={styles.bubbleText}>
          {message.content}
          {isStreaming && <span className={styles.cursor} />}
        </p>
        <span className={styles.bubbleTime}>{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
