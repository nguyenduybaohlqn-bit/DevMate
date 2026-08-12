import { useEffect, useState } from "react";
import type { Agent, ModeId } from "../types";

const COMPANION_AGENTS: Agent[] = [{ id: "nexus", name: "Nexus", status: "idle" }];

const DEVELOPER_AGENTS: Agent[] = [
  { id: "planner", name: "Planner", model: "Qwen 4B", status: "idle" },
  { id: "coder", name: "Coder", model: "DeepSeek", status: "idle" },
  { id: "vision", name: "Vision", model: "Qwen VL", status: "idle" },
  { id: "reviewer", name: "Reviewer", model: "GPT-5", status: "idle" },
];

/**
 * Khi agents.length === 1 (Companion), AgentPanelWidget tự ẩn — panel
 * "nhiều agent" chỉ có ý nghĩa khi thật sự có nhiều agent. Trạng thái
 * chung của agent duy nhất khi đó được StatusWidget đảm nhiệm.
 */
export function useAgents(modeId: ModeId): Agent[] {
  const [agents, setAgents] = useState<Agent[]>(modeId === "developer" ? DEVELOPER_AGENTS : COMPANION_AGENTS);

  useEffect(() => {
    setAgents(modeId === "developer" ? DEVELOPER_AGENTS : COMPANION_AGENTS);
  }, [modeId]);

  useEffect(() => {
    if (modeId !== "developer") return;
    const statuses: Agent["status"][] = ["idle", "running", "busy"];
    const id = setInterval(() => {
      setAgents((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const next = statuses[Math.floor(Math.random() * statuses.length)];
        return prev.map((a, i) => (i === idx ? { ...a, status: next } : a));
      });
    }, 6000);
    return () => clearInterval(id);
  }, [modeId]);

  return agents;
}
