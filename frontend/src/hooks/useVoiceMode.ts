import { useCallback, useEffect, useRef, useState } from "react";
import type { AppMode, VoiceState } from "../types";

interface UseVoiceModeReturn {
  mode: AppMode;
  voiceState: VoiceState;
  /** Bấm icon mic: vào voice mode và tự động lắng nghe ngay — không cần
   *  chạm thêm vào lõi. */
  enterVoiceMode: () => void;
  exitVoiceMode: () => void;
  /** Chạm vào lõi để bắt đầu lượt nói tiếp theo (chỉ hoạt động khi đang
   *  ở voice mode và voiceState === "idle"). */
  requestTalk: () => void;
}

/**
 * State machine chat <-> voice.
 *
 * TODO tích hợp thật: 3 mốc setTimeout trong `runCycle` hiện đang MÔ
 * PHỎNG luồng nghe -> suy nghĩ -> trả lời. Khi nối backend thật, thay
 * bằng:
 *   1. "user-speaking": bắt đầu ghi âm (MediaRecorder / Web Speech API),
 *      set "ai-thinking" khi người dùng ngừng nói / nhận được transcript.
 *   2. "ai-thinking": đang chờ phản hồi từ LLM (WebSocket/stream).
 *   3. "ai-speaking": đang phát audio TTS; set "idle" khi audio kết thúc.
 */
export function useVoiceMode(): UseVoiceModeReturn {
  const [mode, setMode] = useState<AppMode>("chat");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");

  const modeRef = useRef(mode);
  const voiceStateRef = useRef(voiceState);
  modeRef.current = mode;
  voiceStateRef.current = voiceState;

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cycleActive = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const runCycle = useCallback(() => {
    if (cycleActive.current) return;
    cycleActive.current = true;
    setVoiceState("user-speaking");

    const talkMs = 1500 + Math.random() * 500;
    timers.current.push(
      setTimeout(() => {
        setVoiceState("ai-thinking");
        const thinkMs = 550 + Math.random() * 350;
        timers.current.push(
          setTimeout(() => {
            setVoiceState("ai-speaking");
            const speakMs = 2100 + Math.random() * 700;
            timers.current.push(
              setTimeout(() => {
                setVoiceState("idle");
                cycleActive.current = false;
              }, speakMs)
            );
          }, thinkMs)
        );
      }, talkMs)
    );
  }, []);

  const requestTalk = useCallback(() => {
    if (modeRef.current === "voice" && voiceStateRef.current === "idle") runCycle();
  }, [runCycle]);

  const enterVoiceMode = useCallback(() => {
    setMode("voice");
    setVoiceState("idle");
    // Đợi đúng 1 nhịp để hiệu ứng phóng to/sáng dần của reactor ổn định
    // trước khi bắt đầu, tránh hai chuyển động tranh chấp thị giác.
    timers.current.push(setTimeout(() => runCycle(), 200));
  }, [runCycle]);

  const exitVoiceMode = useCallback(() => {
    clearTimers();
    cycleActive.current = false;
    setMode("chat");
    setVoiceState("idle");
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { mode, voiceState, enterVoiceMode, exitVoiceMode, requestTalk };
}
