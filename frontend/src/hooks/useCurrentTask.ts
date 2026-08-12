import { useCallback, useRef, useState } from "react";
import type { CurrentTaskStep } from "../types";

export interface CurrentTaskState {
  active: boolean;
  label: string;
  etaText: string;
  progress: number; // 0..1, chỉ có ý nghĩa khi bước hiện tại là "progress"
  showGauge: boolean;
}

const IDLE_STATE: CurrentTaskState = { active: false, label: "", etaText: "", progress: 0, showGauge: false };

interface UseCurrentTaskReturn {
  task: CurrentTaskState;
  runSteps: (steps: CurrentTaskStep[]) => Promise<void>;
}

export function useCurrentTask(): UseCurrentTaskReturn {
  const [task, setTask] = useState<CurrentTaskState>(IDLE_STATE);
  const busyRef = useRef(false);

  const runSteps = useCallback(async (steps: CurrentTaskStep[]) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setTask((s) => ({ ...s, active: true }));

    for (const step of steps) {
      if (step.type === "progress" && step.durationMs) {
        const duration = step.durationMs;
        setTask((s) => ({ ...s, label: step.label, showGauge: true, progress: 0, etaText: "" }));
        const start = performance.now();
        await new Promise<void>((resolve) => {
          function tick(now: number) {
            const elapsed = now - start;
            const pct = Math.min(elapsed / duration, 1);
            setTask((s) => ({
              ...s,
              progress: pct,
              etaText: `${Math.max((duration - elapsed) / 1000, 0).toFixed(1)}s còn lại`,
            }));
            if (pct < 1) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
      } else if (step.type === "note") {
        setTask((s) => ({ ...s, label: step.label, showGauge: false, etaText: "" }));
        await new Promise((r) => setTimeout(r, step.holdMs ?? 1200));
      }
    }

    setTask(IDLE_STATE);
    busyRef.current = false;
  }, []);

  return { task, runSteps };
}
