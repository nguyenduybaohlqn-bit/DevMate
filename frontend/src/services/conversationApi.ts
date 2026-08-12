const BACKEND_BASE = "http://127.0.0.1:8000/api";

export interface ConversationDTO {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export async function fetchConversations(userId: number | string): Promise<ConversationDTO[]> {
  const res = await fetch(`${BACKEND_BASE}/conversations?user_id=${userId}`);
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  return res.json();
}

export interface MessageDTO {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string | null;
}

export async function fetchMessages(conversationId: number | string): Promise<MessageDTO[]> {
  const res = await fetch(`${BACKEND_BASE}/conversations/${conversationId}/messages`);
  if (!res.ok) {
    throw new Error(`HTTP Error: ${res.status}`);
  }
  return res.json();
}