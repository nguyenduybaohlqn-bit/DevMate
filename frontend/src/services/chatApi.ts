import type { Attachment } from "../types";

const BACKEND_URL = "http://127.0.0.1:8000/api/chat";

/** Mỗi dòng backend trả về (NDJSON) là một trong hai dạng sự kiện này.
 *  Điều chỉnh lại cho khớp format thật của FastAPI khi tích hợp. */
type StreamEvent =
  | { type: "chunk"; content: string }
  | { type: "done"; conversationId?: number; title?: string }
  | { type: "error"; message: string };

/**
 * Gửi tin nhắn tới backend và đọc phản hồi dạng stream (NDJSON qua
 * ReadableStream). Giữ đúng chữ ký (text, conversationId, onChunk, onDone,
 * onError) mà `useChat.ts` đang gọi.
 */
export async function sendChatMessage(
  text: string,
  conversationId: number | null,
  onChunk: (chunk: string) => void,
  onDone: (newId?: number, newTitle?: string) => void,
  onError: (err: Error) => void,
  attachments: Attachment[] = [],
  signal?: AbortSignal
): Promise<void> {
  try {
    const form = new FormData();
    form.append("message", text);
    if (conversationId !== null) {
      form.append("conversation_id", String(conversationId));
    }
    attachments.forEach((a) => form.append("attachments", a.file, a.file.name));

    const res = await fetch(`${BACKEND_URL}`, {
      method: "POST",
      headers: {
    "Content-Type": "application/json",
  },
      body: JSON.stringify({  
    user_id: 1,      // sau này upload file sẽ sửa
    message: text,
    conversation_id: conversationId,
  }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        const event = JSON.parse(line) as StreamEvent;
        if (event.type === "chunk") {
          onChunk(event.content);
        } else if (event.type === "done") {
          onDone(event.conversationId, event.title);
          return;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    }

    // Stream kết thúc mà backend không gửi sự kiện "done" tường minh.
    onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Người dùng chủ động dừng — không phải lỗi thật, xử lý êm.
      onDone();
      return;
    }
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
