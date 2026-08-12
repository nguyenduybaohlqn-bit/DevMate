# NEXUS — AI Assistant (Frontend)

Giao diện chat kiểu JARVIS (đen + xanh cyan, HUD, arc-reactor trung tâm, voice
mode) **cộng với** kiến trúc AI Operating System nhiều mode (Companion /
Developer), viết bằng **React + TypeScript + Vite**.

## Chạy thử

```bash
npm install
npm run dev
```

Mặc định chạy ở `http://localhost:5173`.

```bash
npm run typecheck   # kiểm tra kiểu, không build
npm run build        # build production vào dist/
npm run preview      # xem thử bản build
```

## Kiến trúc Mode / Widget (Nexus Live panel)

Đây là phần quan trọng nhất được bổ sung ở vòng này. Nguyên tắc cốt lõi:

> **Mode không quyết định giao diện. Mode chỉ là config nói "bật widget nào,
> theo thứ tự nào".** Bản thân từng widget là component độc lập, tự đọc dữ
> liệu qua `useWorkspace()`, không biết và không quan tâm mode nào đang
> active.

```
src/
├── types/index.ts              ModeProfile, WidgetId, Capability, Agent...
├── contexts/
│   └── WorkspaceContext.tsx    Nguồn sự thật duy nhất: mode, agents,
│                                capabilities, task, timeline, inbox,
│                                permission, voice — mọi widget đọc từ đây
├── hooks/
│   ├── useModeProfile.ts        2 ModeProfile (companion/developer) — mỗi
│   │                            profile chỉ là { widgets: WidgetId[] }
│   ├── useAgents.ts             Companion = 1 agent, Developer = N agent
│   ├── useCapabilities.ts       MỘT danh sách Capability cho cả Observer
│   │                            (companion) lẫn Tool Status (developer)
│   ├── useCurrentTask.ts        Chạy chuỗi bước progress/note, dùng chung
│   │                            cho tác vụ do chat kích hoạt lẫn tác vụ nền
│   ├── useTimeline.ts / useInbox.ts / usePermission.ts
│   └── useVoiceMode.ts          Nâng lên context để VoiceStage (trung tâm)
│                                và VoiceStatusWidget (panel) dùng chung
└── components/
    ├── NexusLivePanel.tsx       Đọc profile.widgets, mount đúng widget
    │                            qua registry — KHÔNG hard-code widget nào
    └── widgets/
        ├── widgetRegistry.tsx    Bảng ánh xạ WidgetId -> component
        ├── StatusWidget, TaskWidget, AgentPanelWidget,
        ├── CapabilitiesWidget, QueueWidget, InboxWidget,
        ├── GoalWidget, TimelineWidget, MemoryWidget,
        ├── VoiceStatusWidget, PermissionCard
        └── CollapsibleSection.tsx  Thu gọn/mở rộng dùng chung
```

**Thêm mode mới (Research, Automation...) sau này** = thêm 1 entry trong
`useModeProfile.ts` liệt kê widget nào dùng lại từ registry hiện có, cộng
thêm widget mới nếu thật sự cần — không sửa layout, không sửa widget cũ.

**Điểm chứng minh kiến trúc đáng chú ý:**
- `AgentPanelWidget` tự trả về `null` khi `agents.length <= 1` — panel
  "nhiều agent" chỉ có ý nghĩa khi thật sự có nhiều agent; N=1 đã được
  `StatusWidget` thể hiện dưới dạng dòng trạng thái đơn.
- `CapabilitiesWidget` là MỘT component duy nhất render cả "Đang quan sát"
  (Gmail, Lịch...) lẫn "Trạng thái công cụ" (Filesystem, Docker...) — cùng
  dữ liệu `Capability`, chỉ khác `category` và nhãn nhóm theo
  `profile.capabilityLabel`.
- Bộ lên lịch "tác vụ nền" trong `WorkspaceContext` đổi nội dung theo mode
  (`BG_TASKS_BY_MODE`) — Companion đọc Gmail/GitHub, Developer chạy
  build/test — nhưng dùng chung một cơ chế `useCurrentTask`.

## Những chỗ cần nối backend thật (đã đánh dấu `TODO` trong code)

1. **`services/chatApi.ts`** — hiện giả định backend trả về NDJSON với 3 dạng
   sự kiện `{"type":"chunk"|"done"|"error", ...}`. Đổi lại cho khớp format
   thật của FastAPI khi tích hợp.
2. **`App.tsx` → `ChatSession`** — khi người dùng chọn lại một phiên cũ,
   hiện tại danh sách tin nhắn sẽ trống lại (vì chưa có endpoint lấy lịch sử
   hội thoại). Cần thêm API `GET /api/chat/:id/messages` rồi gọi
   `loadMessages(...)` ngay sau khi mount.
3. **`hooks/useVoiceMode.ts` → `runCycle`** — chu trình nghe → suy nghĩ →
   trả lời hiện đang **mô phỏng** bằng `setTimeout`. Khi nối STT/TTS thật,
   thay 3 mốc thời gian giả lập bằng sự kiện thật.
4. **`contexts/WorkspaceContext.tsx` → `BG_TASKS_BY_MODE`, `useCapabilities`,
   `useAgents`** — toàn bộ dữ liệu Capability/Agent/tác vụ nền hiện là mô
   phỏng phía client. Khi có backend thật, thay các mảng seed này bằng dữ
   liệu fetch/subscribe (WebSocket) từ server — interface (`Capability`,
   `Agent`, `CurrentTaskStep`) đã được thiết kế đủ tổng quát để không cần
   đổi widget khi đổi nguồn dữ liệu.
5. **`usePermission`** — `askPermission()` hiện chỉ cập nhật state cục bộ.
   Khi nối backend, hành động thật (agent xoá file, gửi email...) cần đợi
   đúng Promise này trước khi thực thi ở phía server.

## Ghi chú thiết kế

- Toàn bộ transition dùng chung 3 mốc thời lượng (`--t1/t2/t3`) và 1 easing
  (`--ease`) khai báo ở `index.css`.
- `ReactorCore` (nhỏ, CSS-driven) và `VoiceStage` (lớn, rAF-driven) tách
  riêng: các chỉ báo nhỏ dùng CSS keyframe đơn giản; lõi trung tâm dùng
  engine vật lý liên tục để tốc độ quay/độ sáng nội suy mượt khi đổi trạng
  thái, tránh "khựng" khi chuyển nghe → suy nghĩ → trả lời.
- Tôn trọng `prefers-reduced-motion` ở cả CSS lẫn engine rAF.
- **Cố tình KHÔNG có**: CPU/RAM/GPU chart, token graph, log console kiểu
  DevOps — đúng tinh thần "AI Companion, không phải Grafana".
