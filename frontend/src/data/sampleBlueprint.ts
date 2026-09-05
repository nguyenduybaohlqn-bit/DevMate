import type { Blueprint } from "../types";

/**
 * TODO: đây là dữ liệu mẫu để dựng UI, dựa trên đúng ví dụ hợp đồng dữ
 * liệu bạn đưa (ChatPage -> useChat -> chatApi -> /api/chat -> chat.py),
 * mở rộng thêm nhánh Auth để graph có nhiều hơn 1 luồng. Khi có endpoint
 * quét codebase thật, `useBlueprint()` sẽ fetch thay vì import file này —
 * miễn giữ đúng shape `Blueprint` thì không phải sửa gì ở UI.
 */
export const SAMPLE_BLUEPRINT: Blueprint = {
  project: {
    name: "DevMate",
    language: "TypeScript",
    framework: "React + FastAPI",
  },

  graph: {
    nodes: [
      { id: "frontend", label: "frontend", kind: "folder", group: "Frontend" },
      { id: "chat-page", label: "ChatPage.tsx", kind: "component", group: "Frontend", path: "src/pages/ChatPage.tsx", tags: ["chat", "streaming"] },
      { id: "use-chat", label: "useChat.ts", kind: "hook", group: "Frontend", path: "src/hooks/useChat.ts" },
      { id: "chat-api", label: "chatApi.ts", kind: "service", group: "Frontend", path: "src/services/chatApi.ts" },
      { id: "login-page", label: "LoginPage.tsx", kind: "component", group: "Frontend", path: "src/pages/LoginPage.tsx", tags: ["auth"] },
      { id: "use-auth", label: "useAuth.ts", kind: "hook", group: "Frontend", path: "src/hooks/useAuth.ts" },
      { id: "auth-api", label: "authApi.ts", kind: "service", group: "Frontend", path: "src/services/authApi.ts" },

      { id: "backend-chat", label: "/api/chat", kind: "endpoint", group: "Backend", path: "backend/app/routes/chat.py" },
      { id: "chat-service", label: "ChatService", kind: "class", group: "Backend", path: "backend/app/services/chat.py" },
      { id: "llm-service", label: "LLMService", kind: "class", group: "Backend", path: "backend/app/services/llm.py" },
      { id: "conversation-repo", label: "ConversationRepository", kind: "repository", group: "Backend", path: "backend/app/repositories/conversation.py" },

      { id: "backend-auth", label: "/api/auth", kind: "endpoint", group: "Backend", path: "backend/app/routes/auth.py" },
      { id: "auth-service", label: "AuthService", kind: "class", group: "Backend", path: "backend/app/services/auth.py" },
      { id: "user-repo", label: "UserRepository", kind: "repository", group: "Backend", path: "backend/app/repositories/user.py" },

      { id: "database", label: "PostgreSQL", kind: "database", group: "Backend" },
    ],
    edges: [
      { id: "e1", from: "chat-page", to: "use-chat", type: "uses" },
      { id: "e2", from: "use-chat", to: "chat-api", type: "calls" },
      { id: "e3", from: "chat-api", to: "backend-chat", type: "http" },
      { id: "e4", from: "backend-chat", to: "chat-service", type: "calls" },
      { id: "e5", from: "chat-service", to: "llm-service", type: "calls" },
      { id: "e6", from: "chat-service", to: "conversation-repo", type: "calls" },
      { id: "e7", from: "conversation-repo", to: "database", type: "calls" },

      { id: "e8", from: "login-page", to: "use-auth", type: "uses" },
      { id: "e9", from: "use-auth", to: "auth-api", type: "calls" },
      { id: "e10", from: "auth-api", to: "backend-auth", type: "http" },
      { id: "e11", from: "backend-auth", to: "auth-service", type: "calls" },
      { id: "e12", from: "auth-service", to: "user-repo", type: "calls" },
      { id: "e13", from: "user-repo", to: "database", type: "calls" },
      { id: "e14", from: "chat-service", to: "auth-service", type: "imports" },
    ],
  },

  modules: [
    { id: "mod-chat", name: "Chat", nodeIds: ["chat-page", "use-chat", "chat-api", "backend-chat", "chat-service", "llm-service", "conversation-repo"] },
    { id: "mod-auth", name: "Auth", nodeIds: ["login-page", "use-auth", "auth-api", "backend-auth", "auth-service", "user-repo"] },
  ],

  features: [
    {
      id: "feat-chat",
      feature: "Chat",
      description: "Streaming chat giữa người dùng và Nexus.",
      entrypoints: ["chat-page", "chat-api", "backend-chat", "chat-service"],
    },
    {
      id: "feat-auth",
      feature: "Auth",
      description: "Đăng nhập/đăng ký, phát hành phiên đăng nhập.",
      entrypoints: ["login-page", "auth-api", "backend-auth", "auth-service"],
    },
  ],

  symbols: [
    { id: "sym-1", name: "stream_chat", kind: "function", nodeId: "chat-service", signature: "stream_chat(message: str) -> AsyncIterator[str]" },
    { id: "sym-2", name: "build_prompt", kind: "function", nodeId: "chat-service", signature: "build_prompt(history: list[Message]) -> str" },
    { id: "sym-3", name: "verify_token", kind: "function", nodeId: "auth-service", signature: "verify_token(token: str) -> User" },
  ],

  dependencies: [
    { from: "chat-service", to: "llm-service", type: "calls" },
    { from: "chat-service", to: "conversation-repo", type: "calls" },
    { from: "chat-service", to: "auth-service", type: "imports" },
  ],

  entrypoints: [
    { id: "ep-chat-page", label: "ChatPage.tsx", nodeId: "chat-page" },
    { id: "ep-chat-api", label: "chatApi.ts", nodeId: "chat-api" },
    { id: "ep-backend-chat", label: "/api/chat", nodeId: "backend-chat" },
    { id: "ep-chat-service", label: "chat.py", nodeId: "chat-service" },
  ],

  metadata: {
    "chat-service": {
      id: "chat-service",
      kind: "class",
      name: "ChatService",
      summary: "Handle chat streaming",
      language: "Python",
      path: "backend/app/services/chat.py",
      lines: 520,
      public_functions: ["stream_chat", "build_prompt"],
      depends_on: ["LLMService", "ConversationRepository"],
      referenced_by: ["/api/chat"],
    },
    "chat-page": {
      id: "chat-page",
      kind: "component",
      name: "ChatPage.tsx",
      summary: "Main chat UI",
      language: "TypeScript",
      path: "src/pages/ChatPage.tsx",
      lines: 280,
    },
    "use-chat": {
      id: "use-chat",
      kind: "hook",
      name: "useChat.ts",
      summary: "Quản lý state tin nhắn, gọi chatApi để gửi/nhận stream.",
      language: "TypeScript",
      path: "src/hooks/useChat.ts",
      lines: 96,
      depends_on: ["chatApi.ts"],
      referenced_by: ["ChatPage.tsx"],
    },
    "chat-api": {
      id: "chat-api",
      kind: "service",
      name: "chatApi.ts",
      summary: "Gọi backend /api/chat, đọc response dạng NDJSON stream.",
      language: "TypeScript",
      path: "src/services/chatApi.ts",
      lines: 74,
      depends_on: ["/api/chat"],
      referenced_by: ["useChat.ts"],
    },
    "backend-chat": {
      id: "backend-chat",
      kind: "endpoint",
      name: "/api/chat",
      summary: "Nhận tin nhắn, trả về stream token từ LLM.",
      language: "Python",
      path: "backend/app/routes/chat.py",
      lines: 64,
      depends_on: ["ChatService"],
      referenced_by: ["chatApi.ts"],
    },
    "llm-service": {
      id: "llm-service",
      kind: "class",
      name: "LLMService",
      summary: "Bọc lời gọi model, quản lý prompt/context window.",
      language: "Python",
      path: "backend/app/services/llm.py",
      lines: 210,
      referenced_by: ["ChatService"],
    },
    "conversation-repo": {
      id: "conversation-repo",
      kind: "repository",
      name: "ConversationRepository",
      summary: "Đọc/ghi hội thoại xuống PostgreSQL.",
      language: "Python",
      path: "backend/app/repositories/conversation.py",
      lines: 140,
      depends_on: ["PostgreSQL"],
      referenced_by: ["ChatService"],
    },
    "login-page": {
      id: "login-page",
      kind: "component",
      name: "LoginPage.tsx",
      summary: "Form đăng nhập/đăng ký.",
      language: "TypeScript",
      path: "src/pages/LoginPage.tsx",
      lines: 150,
    },
    "use-auth": {
      id: "use-auth",
      kind: "hook",
      name: "useAuth.ts",
      summary: "Quản lý trạng thái đăng nhập, gọi authApi.",
      language: "TypeScript",
      path: "src/hooks/useAuth.ts",
      lines: 88,
      depends_on: ["authApi.ts"],
      referenced_by: ["LoginPage.tsx"],
    },
    "auth-api": {
      id: "auth-api",
      kind: "service",
      name: "authApi.ts",
      summary: "Gọi backend /api/auth.",
      language: "TypeScript",
      path: "src/services/authApi.ts",
      lines: 52,
      depends_on: ["/api/auth"],
      referenced_by: ["useAuth.ts"],
    },
    "backend-auth": {
      id: "backend-auth",
      kind: "endpoint",
      name: "/api/auth",
      summary: "Đăng nhập, đăng ký, phát hành token.",
      language: "Python",
      path: "backend/app/routes/auth.py",
      lines: 90,
      depends_on: ["AuthService"],
      referenced_by: ["authApi.ts"],
    },
    "auth-service": {
      id: "auth-service",
      kind: "class",
      name: "AuthService",
      summary: "Xác minh mật khẩu, phát hành/kiểm tra token phiên.",
      language: "Python",
      path: "backend/app/services/auth.py",
      lines: 175,
      public_functions: ["verify_token", "issue_session"],
      depends_on: ["UserRepository"],
      referenced_by: ["/api/auth", "ChatService"],
    },
    "user-repo": {
      id: "user-repo",
      kind: "repository",
      name: "UserRepository",
      summary: "Đọc/ghi user xuống PostgreSQL.",
      language: "Python",
      path: "backend/app/repositories/user.py",
      lines: 98,
      depends_on: ["PostgreSQL"],
      referenced_by: ["AuthService"],
    },
    database: {
      id: "database",
      kind: "database",
      name: "PostgreSQL",
      summary: "Lưu user, phiên hội thoại, tin nhắn.",
      referenced_by: ["ConversationRepository", "UserRepository"],
    },
    frontend: {
      id: "frontend",
      kind: "folder",
      name: "frontend",
      summary: "Toàn bộ mã nguồn giao diện React.",
    },
  },

  diagnostics: [
    {
      id: "diag-1",
      severity: "warning",
      message: "ChatService phụ thuộc chéo vào AuthService — cân nhắc tách interface dùng chung.",
      nodeIds: ["chat-service", "auth-service"],
    },
  ],

  statistics: {
    fileCount: 127,
    moduleCount: 2,
    edgeCount: 14,
    languages: ["TypeScript", "Python"],
    linesOfCode: 8420,
    lastScanAt: new Date(Date.now() - 2 * 60000).toISOString(),
  },
};
