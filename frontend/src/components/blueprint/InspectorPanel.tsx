import type { Blueprint } from "../../types";
import { KIND_LABEL, NodeKindIcon } from "./blueprintVisuals";
import styles from "./InspectorPanel.module.css";

interface InspectorPanelProps {
  blueprint: Blueprint;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAskAI: (question: string) => void;
}

export function InspectorPanel({ blueprint, selectedId, onSelect, onAskAI }: InspectorPanelProps) {
  const node = blueprint.graph.nodes.find((n) => n.id === selectedId);
  const meta = selectedId ? blueprint.metadata[selectedId] : undefined;
  const diagnostics = selectedId
    ? blueprint.diagnostics.filter((d) => d.nodeIds?.includes(selectedId))
    : [];

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.headLabel}>INSPECTOR</span>
      </div>

      {!node ? (
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <span>Chọn một node trên graph để xem chi tiết.</span>
        </div>
      ) : (
        <div className={styles.scroll}>
          <div>
            <div className={styles.titleRow}>
              <span className={styles.title}>{meta?.name ?? node.label}</span>
              <span className={styles.kindBadge}>{KIND_LABEL[node.kind]}</span>
            </div>
            {meta?.summary && <p className={styles.summary} style={{ marginTop: 8 }}>{meta.summary}</p>}
          </div>

          {node.tags && node.tags.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>TAGS</div>
              <div className={styles.tagRow}>
                {node.tags.map((t) => (
                  <span key={t} className={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(meta?.language || meta?.path || meta?.lines != null) && (
            <div>
              <div className={styles.sectionLabel}>THÔNG TIN</div>
              <div className={styles.metaGrid}>
                {meta?.language && (
                  <div className={styles.metaRow}>
                    <span>Ngôn ngữ</span>
                    <span>{meta.language}</span>
                  </div>
                )}
                {meta?.path && (
                  <div className={styles.metaRow}>
                    <span>Đường dẫn</span>
                    <span>{meta.path}</span>
                  </div>
                )}
                {meta?.lines != null && (
                  <div className={styles.metaRow}>
                    <span>Số dòng</span>
                    <span>{meta.lines}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {meta?.public_functions && meta.public_functions.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>HÀM CÔNG KHAI ({meta.public_functions.length})</div>
              <div className={styles.fileList}>
                {meta.public_functions.map((fn) => (
                  <div key={fn} className={styles.fileRow}>
                    <NodeKindIcon kind="function" size={12} />
                    {fn}(...)
                  </div>
                ))}
              </div>
            </div>
          )}

          {node.children && node.children.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>FILES ({node.children.length})</div>
              <div className={styles.linkList}>
                {node.children.map((childId) => {
                  const child = blueprint.graph.nodes.find((n) => n.id === childId);
                  return (
                    <button key={childId} type="button" className={styles.linkBtn} onClick={() => onSelect(childId)}>
                      <span className={styles.linkDot} />
                      {child?.label ?? childId}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {meta?.depends_on && meta.depends_on.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>DEPENDENCIES ({meta.depends_on.length})</div>
              <div className={styles.linkList}>
                {meta.depends_on.map((dep) => (
                  <div key={dep} className={styles.fileRow}>
                    <span className={styles.linkDot} />
                    {dep}
                  </div>
                ))}
              </div>
            </div>
          )}

          {meta?.referenced_by && meta.referenced_by.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>REFERENCED BY ({meta.referenced_by.length})</div>
              <div className={styles.linkList}>
                {meta.referenced_by.map((ref) => (
                  <div key={ref} className={styles.fileRow}>
                    <span className={styles.linkDot} />
                    {ref}
                  </div>
                ))}
              </div>
            </div>
          )}

          {diagnostics.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>CẢNH BÁO</div>
              {diagnostics.map((d) => (
                <div key={d.id} className={styles.diagnostic}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {d.message}
                </div>
              ))}
            </div>
          )}

          {meta?.notes && (
            <div>
              <div className={styles.sectionLabel}>NOTES</div>
              <div className={styles.notes}>{meta.notes}</div>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} disabled title="Chưa nối trình soạn thảo — TODO khi có backend">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              Mở tệp
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => onAskAI(`Giải thích cách "${meta?.name ?? node.label}" hoạt động trong dự án.`)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              Hỏi Nexus về node này
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
