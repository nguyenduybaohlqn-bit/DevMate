import { useMemo, type CSSProperties } from "react";
import type { AppMode, VoiceState } from "../types";
import { useReactorEngine } from "../hooks/useReactorEngine";
import { KeyboardIcon } from "./Icons";
import coreStyles from "./ReactorCore.module.css";
import styles from "./VoiceStage.module.css";

const SPOKE_COUNT = 44;
const SPOKE_RADIUS = 172;

const VOICE_CAPTIONS: Record<VoiceState, string> = {
  idle: "CHẠM VÀO LÕI ĐỂ NÓI",
  "user-speaking": "ĐANG LẮNG NGHE...",
  "ai-thinking": "ĐANG XỬ LÝ...",
  "ai-speaking": "NEXUS ĐANG NÓI...",
};

interface VoiceStageProps {
  mode: AppMode;
  voiceState: VoiceState;
  isEmpty: boolean;
  onCoreClick: () => void;
  onExitVoice: () => void;
}

/** Reactor trung tâm — LUÔN ở giữa màn hình (đóng vai hoa văn nền lúc
 *  chat), phóng to & sáng rõ khi vào voice mode. Chạm vào lõi để bắt
 *  đầu/tiếp tục một lượt nói. */
export function VoiceStage({ mode, voiceState, isEmpty, onCoreClick, onExitVoice }: VoiceStageProps) {
  const { visualRef, ringOuterRef, ringInnerRef, dotRef, spokeRefs } = useReactorEngine(
    voiceState,
    SPOKE_COUNT
  );

  const spokeAngles = useMemo(
    () => Array.from({ length: SPOKE_COUNT }, (_, i) => (360 / SPOKE_COUNT) * i),
    []
  );

  const canTalk = mode === "voice" && voiceState === "idle";
  const showWelcome = mode === "chat" && isEmpty;
  const showVoiceText = mode === "voice";

  return (
    <div className={styles.reactorLayer} data-mode={mode}>
      <div
        ref={visualRef}
        className={styles.reactorVisual}
        style={{ cursor: canTalk ? "pointer" : "default" }}
        onClick={() => canTalk && onCoreClick()}
        role="button"
        tabIndex={canTalk ? 0 : -1}
        aria-label="Chạm để nói"
        onKeyDown={(e) => {
          if (canTalk && (e.key === "Enter" || e.key === " ")) onCoreClick();
        }}
      >
        <div
          className={`${coreStyles.core} ${coreStyles.engine}`}
          style={{ "--core-size": "270px" } as CSSProperties}
        >
          <svg viewBox="0 0 60 60" fill="none">
            <circle ref={ringOuterRef} className={coreStyles.ringOuter} cx={30} cy={30} r={26} strokeWidth={2} />
            <circle ref={ringInnerRef} className={coreStyles.ringInner} cx={30} cy={30} r={17} strokeWidth={1.5} />
            <circle ref={dotRef} className={coreStyles.dot} cx={30} cy={30} r={4} />
          </svg>
        </div>

        <div className={styles.reactorSpokes}>
          {spokeAngles.map((angle, i) => (
            <div
              key={i}
              className={styles.spoke}
              style={{ transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-${SPOKE_RADIUS}px)` }}
            >
              <div
                ref={(el) => {
                  spokeRefs.current[i] = el;
                }}
                className={styles.spokeBar}
              />
            </div>
          ))}
        </div>
      </div>

      {showWelcome && (
        <div className={styles.reactorWelcome}>
          <h1>NEXUS SẴN SÀNG</h1>
          <p>Hỏi tôi bất cứ điều gì — tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn.</p>
        </div>
      )}

      {showVoiceText &&
        (voiceState === "idle" ? (
          <div className={styles.voiceHint}>{VOICE_CAPTIONS.idle}</div>
        ) : (
          <div className={styles.voiceCaption}>{VOICE_CAPTIONS[voiceState]}</div>
        ))}

      <button type="button" className={styles.voiceExit} onClick={onExitVoice} aria-label="Quay lại chat">
        <KeyboardIcon width={13} height={13} />
        <span>QUAY LẠI CHAT</span>
      </button>
    </div>
  );
}
