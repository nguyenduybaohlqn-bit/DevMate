import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { Attachment, AttachmentKind } from "../types";
import { PdfIcon, PlusIcon, ImageIcon, VideoIcon } from "./Icons";
import styles from "./AttachButton.module.css";

interface AttachOption {
  kind: AttachmentKind;
  accept: string;
  label: string;
  desc: string;
  Icon: typeof PdfIcon;
}

const OPTIONS: AttachOption[] = [
  { kind: "pdf", accept: "application/pdf", label: "Tệp PDF", desc: "Tài liệu, báo cáo, spec", Icon: PdfIcon },
  { kind: "image", accept: "image/*", label: "Hình ảnh", desc: "JPG, PNG, WEBP...", Icon: ImageIcon },
  { kind: "video", accept: "video/*", label: "Video", desc: "MP4, MOV, WEBM...", Icon: VideoIcon },
];

interface AttachButtonProps {
  onFileSelected: (attachment: Attachment) => void;
}

export function AttachButton({ onFileSelected }: AttachButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingKind = useRef<AttachmentKind>("pdf");

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const handleOptionClick = (option: AttachOption) => {
    pendingKind.current = option.kind;
    if (fileInputRef.current) {
      fileInputRef.current.accept = option.accept;
      fileInputRef.current.click();
    }
    setOpen(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected({ file, kind: pendingKind.current });
    e.target.value = "";
  };

  return (
    <div className={styles.attachWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.attachBtn} ${open ? styles.open : ""}`}
        aria-label="Đính kèm tệp"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <PlusIcon width={15} height={15} />
      </button>

      <div className={`${styles.attachMenu} ${open ? styles.open : ""}`} role="menu">
        {OPTIONS.map((option) => (
          <button
            key={option.kind}
            type="button"
            className={styles.attachOption}
            role="menuitem"
            onClick={() => handleOptionClick(option)}
          >
            <span className={styles.attachOptionIcon}>
              <option.Icon width={14} height={14} />
            </span>
            <span className={styles.attachOptionText}>
              <b>{option.label}</b>
              <small>{option.desc}</small>
            </span>
          </button>
        ))}
      </div>

      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />
    </div>
  );
}
