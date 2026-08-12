import { useEffect, useMemo, useRef, type FormEvent, type KeyboardEvent } from "react";
import type { AppMode, Attachment, AttachmentKind, VoiceState } from "../types";
import { ReactorCore } from "./ReactorCore";
import { AttachButton } from "./AttachButton";
import { CloseIcon, ImageIcon, MicIcon, PdfIcon, SendIcon, VideoIcon } from "./Icons";
import styles from "./Composer.module.css";

const ATTACHMENT_ICONS: Record<AttachmentKind, typeof PdfIcon> = {
  pdf: PdfIcon,
  image: ImageIcon,
  video: VideoIcon,
};

interface ComposerProps {
  mode: AppMode;
  voiceState: VoiceState;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  onStop: () => void;
  attachments: Attachment[];
  onAddAttachment: (a: Attachment) => void;
  onRemoveAttachment: (index: number) => void;
  onEnterVoice: () => void;
  onExitVoice: () => void;
}

const WAVE_BAR_COUNT = 46;

export function Composer({
  mode,
  voiceState,
  input,
  onInputChange,
  onSend,
  loading,
  onStop,
  attachments,
  onAddAttachment,
  onRemoveAttachment,
  onEnterVoice,
  onExitVoice,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự giãn chiều cao textarea theo nội dung (tối đa 140px, phần còn lại cuộn).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  // Pha/độ dài animation ngẫu nhiên cố định cho từng thanh sóng âm — sinh 1 lần.
  const waveBars = useMemo(
    () =>
      Array.from({ length: WAVE_BAR_COUNT }, () => {
        const duration = 0.45 + Math.random() * 0.65;
        const delay = -Math.random() * duration;
        return { duration, delay };
      }),
    []
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loading) {
      onStop();
      return;
    }
    onSend();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (loading) onStop();
      else onSend();
    }
  };

  const isVoice = mode === "voice";
  const firstAttachment = attachments[0];

  return (
    <div className={styles.composer}>
      <div className={styles.composerInner}>
        <div className={styles.stack}>
          <form
            className={`${styles.inputFrame} frame ${isVoice ? styles.inputFrameHidden : ""}`}
            onSubmit={handleSubmit}
          >
            <AttachButton onFileSelected={onAddAttachment} />

            <div className={styles.body}>
              {firstAttachment && (
                <div className={styles.attachmentChip}>
                  <span className={styles.attachmentChipIcon}>
                    {(() => {
                      const Icon = ATTACHMENT_ICONS[firstAttachment.kind];
                      return <Icon width={12} height={12} />;
                    })()}
                  </span>
                  <span className={styles.attachmentChipName}>{firstAttachment.file.name}</span>
                  <button
                    type="button"
                    className={styles.attachmentChipRemove}
                    aria-label="Bỏ tệp đính kèm"
                    onClick={() => onRemoveAttachment(0)}
                  >
                    <CloseIcon width={11} height={11} />
                  </button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                rows={1}
                placeholder="Nhập lệnh của bạn..."
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>

            <button
              type="button"
              className={styles.micBtn}
              aria-label="Chuyển sang trò chuyện bằng giọng nói"
              onClick={onEnterVoice}
            >
              <MicIcon width={15} height={15} />
            </button>

            <button type="submit" className={styles.sendBtn} aria-label={loading ? "Dừng" : "Gửi tin nhắn"}>
              <ReactorCore size={26} state={loading ? "streaming" : "idle"} />
              <SendIcon className={`${styles.sendIcon} ${loading ? styles.sendIconHidden : ""}`} />
              {loading && <span className={styles.stopIcon} />}
            </button>
          </form>

          <div
            className={`${styles.voiceBar} frame ${isVoice ? styles.voiceBarVisible : styles.voiceBarBase}`}
          >
            <div className={styles.waveTrack}>
              {waveBars.map((bar, i) => (
                <div
                  key={i}
                  className={`${styles.waveBar} ${voiceState === "user-speaking" ? styles.waveBarActive : ""}`}
                  style={{ animationDuration: `${bar.duration}s`, animationDelay: `${bar.delay}s` }}
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.voiceBarExit}
              aria-label="Quay lại chat"
              onClick={onExitVoice}
            >
              <CloseIcon width={15} height={15} />
            </button>
          </div>
        </div>

        <div className={styles.hint}>
          {isVoice
            ? "Chạm vào lõi để nói tiếp · nhấn ESC để quay lại chat"
            : "NEXUS v1.0 · Powered by Gemini · Enter để gửi, Shift+Enter xuống dòng"}
        </div>
      </div>
    </div>
  );
}
