import { useCallback, useRef, useState } from "react";
import type { Attachment, Message } from "../types";
import { sendChatMessage } from "../services/chatApi";

interface UseChatReturn {
  messages: Message[];
  input: string;
  loading: boolean;
  attachments: Attachment[];
  setInput: (v: string) => void;
  addAttachment: (a: Attachment) => void;
  removeAttachment: (index: number) => void;
  sendMessage: () => Promise<void>;
  /** Dừng streaming đang chạy (bấm nút gửi lần nữa trong lúc AI đang trả lời). */
  stopGenerating: () => void;
  clearMessages: () => void;
  loadMessages: (msgs: Message[]) => void;
}

export function useChat(
  conversationId: number | null,
  onConversationCreated: (id: number, title: string) => void
): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const addAttachment = useCallback((a: Attachment) => {
    setAttachments((prev) => [...prev, a]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const pendingAttachments = attachments;
    setAttachments([]);
    setLoading(true);

    const assistantId = Date.now().toString() + "_assistant";
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date() },
    ]);

    const queue: string[] = [];
    let done = false;
    const interval = setInterval(() => {
      if (queue.length > 0) {
        // Lấy 1 chunk từ queue, append vào UI
        const next = queue.shift()!;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: msg.content + next } : msg
          )
        );
      } else if (done) {
        // Queue rỗng và stream đã xong → dừng interval
        clearInterval(interval);
      }
    }, 12);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    await sendChatMessage(
      text,
      conversationId,
      (chunk) => {
        const chars = chunk.split("");
        for (const char of chars) {
          queue.push(char);
        }
      },
      (newId, newTitle) => {
        done = true;
        abortControllerRef.current = null;
        if (!conversationId && newId) {
          onConversationCreated(newId, newTitle || text);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: `Lỗi: ${err.message}` } : msg
          )
        );
        done = true;
        abortControllerRef.current = null;
        setLoading(false);
      },
      pendingAttachments,
      controller.signal
    );
  }, [input, loading, attachments, conversationId, onConversationCreated]);

  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }, []);

  const clearMessages = useCallback(() => setMessages([]), []);
  const loadMessages = useCallback((msgs: Message[]) => setMessages(msgs), []);

  return {
    messages,
    input,
    loading,
    attachments,
    setInput,
    addAttachment,
    removeAttachment,
    sendMessage,
    stopGenerating,
    clearMessages,
    loadMessages,
  };
}
