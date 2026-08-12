import type { ComponentType } from "react";
import type { WidgetId } from "../../types";
import { StatusWidget } from "./StatusWidget";
import { TaskWidget } from "./TaskWidget";
import { AgentPanelWidget } from "./AgentPanelWidget";
import { CapabilitiesWidget } from "./CapabilitiesWidget";
import { QueueWidget } from "./QueueWidget";
import { InboxWidget } from "./InboxWidget";
import { GoalWidget } from "./GoalWidget";
import { TimelineWidget } from "./TimelineWidget";
import { MemoryWidget } from "./MemoryWidget";
import { VoiceStatusWidget } from "./VoiceStatusWidget";

export const WIDGET_REGISTRY: Record<WidgetId, ComponentType> = {
  status: StatusWidget,
  task: TaskWidget,
  agentPanel: AgentPanelWidget,
  capabilities: CapabilitiesWidget,
  queue: QueueWidget,
  inbox: InboxWidget,
  goal: GoalWidget,
  timeline: TimelineWidget,
  memory: MemoryWidget,
  voiceStatus: VoiceStatusWidget,
};
