import { memo, useCallback, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import type { Message } from "../types";
import { formatTime } from "../utils/format";
import { ReactorCore } from "./ReactorCore";
import styles from "./MessageBubble.module.css";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.css";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

// Khối code riêng: có header hiện tên ngôn ngữ + nút copy,
// tách biệt hẳn về mặt hình ảnh so với đoạn văn thường.
function CodeBlock({ className, children }: { className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = /language-(\w+)/.exec(className || "")?.[1] ?? "text";
  const codeText = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [codeText]);

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{language}</span>
        <button type="button" className={styles.copyBtn} onClick={handleCopy}>
          {copied ? "Đã copy" : "Copy"}
        </button>
      </div>
      <pre className={className}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    // react-markdown: code inline không có className "language-*",
    // code block thì có -> dùng để phân biệt.
    if (!className) {
      return (
        <code className={styles.inlineCode} {...props}>
          {children}
        </code>
      );
    }
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre({ children }) {
    // pre đã được xử lý bên trong CodeBlock, tránh bọc đôi <pre><pre>
    return <>{children}</>;
  },
  a({ href, children, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link} {...props}>
        {children}
      </a>
    );
  },
};

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`${styles.msg} ${isUser ? styles.msgUser : styles.msgAssistant}`}>
      {!isUser && (
        <div className={styles.avatar}>
          <ReactorCore size={26} state={isStreaming ? "streaming" : "idle"} />
        </div>
      )}
      <div className={`${styles.bubble} frame`}>
        <div className={`${styles.bubbleText} ${isStreaming ? styles.streaming : ""}`}>
          {isUser ? (
            // Tin nhắn user: giữ plain text, không parse markdown
            // (tránh user tự gõ ký tự markdown/HTML gây hiểu nhầm hoặc lệch UI).
            <p className={styles.plainText}>{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex, rehypeHighlight]}
              components={markdownComponents}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        <span className={styles.bubbleTime}>{formatTime(message.timestamp)}</span>
      </div>
    </div>
  );
});