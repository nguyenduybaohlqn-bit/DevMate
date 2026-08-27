import { useCallback, useEffect, useRef } from "react";

/** Vị trí "nhà" của 1 node — tính sẵn bởi layout (vd nhóm theo `group`)
 *  trước khi đưa vào engine vật lý. Hook này KHÔNG cần biết node là gì
 *  (kind/group/metadata...), chỉ cần toạ độ, đúng tinh thần "vật lý tách
 *  khỏi dữ liệu nghiệp vụ". */
export interface LayoutNode {
  id: string;
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

// ---- Hằng số vật lý — có thể tinh chỉnh cảm giác trôi nổi tại đây ----
const SPRING_HOME = 1.1; // lực kéo về vị trí "nhà" — càng lớn càng "bám" chỗ cũ
const SPRING_HOME_BOUNDARY_MULT = 6; // lệch quá HOME_MAX_DIST thì lò xo mạnh hơn hẳn (biên mềm)
const HOME_MAX_DIST = 110; // px — ngoài khoảng này, coi như "đi quá xa nhà"
const REPEL_STRENGTH = 26000; // lực đẩy giữa 2 node để không chồng lên nhau
const REPEL_MIN_DIST = 150; // px — chỉ đẩy nhau khi gần hơn khoảng này
const DAMPING = 0.94; // giảm chấn vận tốc mỗi khung hình — KHÔNG có số này graph sẽ trôi mãi
const JITTER_STRENGTH = 14; // nhiễu hữu cơ chậm, tạo cảm giác "không trọng lực"
const MAX_SPEED = 260; // px/s — chặn vận tốc tối đa, tránh giật khi mới thả tay

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.2;

interface RuntimeNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  phase: number;
}

interface DragState {
  id: string | null;
  offsetX: number;
  offsetY: number;
}

interface PanState {
  active: boolean;
  lastX: number;
  lastY: number;
}

export interface GraphPhysicsHandles {
  containerRef: React.RefObject<HTMLDivElement>;
  worldRef: React.RefObject<HTMLDivElement>;
  registerNodeEl: (id: string, el: HTMLDivElement | null) => void;
  registerEdgeEl: (index: number, el: SVGLineElement | null) => void;
  onNodePointerDown: (id: string, e: React.PointerEvent) => void;
  onCanvasPointerDown: (e: React.PointerEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

/** Đưa toạ độ màn hình (client) về toạ độ "thế giới" bên trong world layer,
 *  dựa trên camera hiện tại (pan + zoom). */
function screenToWorld(clientX: number, clientY: number, rect: DOMRect, cam: { x: number; y: number; scale: number }) {
  return {
    x: (clientX - rect.left - cam.x) / cam.scale,
    y: (clientY - rect.top - cam.y) / cam.scale,
  };
}

export function useGraphPhysics(nodes: LayoutNode[], edges: LayoutEdge[]): GraphPhysicsHandles {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef<Record<string, HTMLDivElement | null>>({});
  const edgeEls = useRef<(SVGLineElement | null)[]>([]);
  const runtime = useRef<Record<string, RuntimeNode>>({});
  const camera = useRef({ x: 260, y: 40, scale: 0.86 });
  const drag = useRef<DragState>({ id: null, offsetX: 0, offsetY: 0 });
  const pan = useRef<PanState>({ active: false, lastX: 0, lastY: 0 });
  const lastFrame = useRef(performance.now());
  const rafId = useRef<number | null>(null);

  // Khởi tạo runtime state cho từng node — chỉ 1 lần theo danh sách node.
  useEffect(() => {
    const map: Record<string, RuntimeNode> = {};
    nodes.forEach((n, i) => {
      map[n.id] = {
        id: n.id,
        x: n.x,
        y: n.y,
        vx: 0,
        vy: 0,
        homeX: n.x,
        homeY: n.y,
        phase: i * 1.3,
      };
    });
    runtime.current = map;
  }, [nodes]);

  const applyCameraTransform = useCallback(() => {
    const w = worldRef.current;
    if (!w) return;
    const cam = camera.current;
    w.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.scale})`;
  }, []);

  const updateEdgeEl = useCallback(
    (index: number) => {
      const edge = edges[index];
      const el = edgeEls.current[index];
      if (!edge || !el) return;
      const a = runtime.current[edge.from];
      const b = runtime.current[edge.to];
      if (!a || !b) return;
      el.setAttribute("x1", String(a.x));
      el.setAttribute("y1", String(a.y));
      el.setAttribute("x2", String(b.x));
      el.setAttribute("y2", String(b.y));
    },
    [edges]
  );

  // ---- Vòng lặp vật lý chính (rAF) ----
  useEffect(() => {
    function tick(now: number) {
      const dt = Math.min((now - lastFrame.current) / 1000, 0.05);
      lastFrame.current = now;

      const list = Object.values(runtime.current);
      const forces: Record<string, { fx: number; fy: number }> = {};
      for (const n of list) forces[n.id] = { fx: 0, fy: 0 };

      // Lực đẩy lẫn nhau — không cho 2 node chồng lên nhau.
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 0.01;
          if (dist < REPEL_MIN_DIST) {
            const force = REPEL_STRENGTH / (distSq || 1);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            forces[a.id].fx += fx;
            forces[a.id].fy += fy;
            forces[b.id].fx -= fx;
            forces[b.id].fy -= fy;
          }
        }
      }

      // Lò xo về "nhà" (biên mềm) + nhiễu hữu cơ chậm (cảm giác không trọng lực).
      for (const n of list) {
        if (n.id === drag.current.id) continue; // đang bị kéo tay -> vật lý nhường quyền
        const dx = n.homeX - n.x;
        const dy = n.homeY - n.y;
        const homeDist = Math.hypot(dx, dy);
        const k = homeDist > HOME_MAX_DIST ? SPRING_HOME * SPRING_HOME_BOUNDARY_MULT : SPRING_HOME;
        forces[n.id].fx += dx * k;
        forces[n.id].fy += dy * k;

        n.phase += dt * 0.35;
        forces[n.id].fx += Math.sin(n.phase) * JITTER_STRENGTH;
        forces[n.id].fy += Math.cos(n.phase * 0.8) * JITTER_STRENGTH;
      }

      // Tích hợp vận tốc (có giảm chấn) + vị trí.
      for (const n of list) {
        if (n.id === drag.current.id) continue;
        n.vx = (n.vx + forces[n.id].fx * dt) * DAMPING;
        n.vy = (n.vy + forces[n.id].fy * dt) * DAMPING;
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > MAX_SPEED) {
          n.vx = (n.vx / speed) * MAX_SPEED;
          n.vy = (n.vy / speed) * MAX_SPEED;
        }
        n.x += n.vx * dt;
        n.y += n.vy * dt;
      }

      for (const n of list) {
        const el = nodeEls.current[n.id];
        if (el) el.style.transform = `translate(${n.x}px, ${n.y}px)`;
      }
      edges.forEach((_, i) => updateEdgeEl(i));

      rafId.current = requestAnimationFrame(tick);
    }

    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [edges, updateEdgeEl]);

  const registerNodeEl = useCallback((id: string, el: HTMLDivElement | null) => {
    nodeEls.current[id] = el;
  }, []);

  const registerEdgeEl = useCallback((index: number, el: SVGLineElement | null) => {
    edgeEls.current[index] = el;
  }, []);

  // ---- Kéo node ----
  const onNodePointerDown = useCallback((id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    const n = runtime.current[id];
    if (!rect || !n) return;
    const world = screenToWorld(e.clientX, e.clientY, rect, camera.current);
    drag.current = { id, offsetX: world.x - n.x, offsetY: world.y - n.y };
    n.vx = 0;
    n.vy = 0;

    function handleMove(ev: PointerEvent) {
      const r = containerRef.current?.getBoundingClientRect();
      const node = runtime.current[id];
      if (!r || !node) return;
      const w = screenToWorld(ev.clientX, ev.clientY, r, camera.current);
      const nx = w.x - drag.current.offsetX;
      const ny = w.y - drag.current.offsetY;
      node.vx = (nx - node.x) * 30; // vận tốc "thả tay" để buông ra vẫn trôi mượt, không khựng
      node.vy = (ny - node.y) * 30;
      node.x = nx;
      node.y = ny;
    }
    function handleUp() {
      drag.current = { id: null, offsetX: 0, offsetY: 0 };
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, []);

  // ---- Kéo nền để pan ----
  const onCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target !== containerRef.current && e.target !== worldRef.current) return;
    pan.current = { active: true, lastX: e.clientX, lastY: e.clientY };

    function handleMove(ev: PointerEvent) {
      if (!pan.current.active) return;
      const dx = ev.clientX - pan.current.lastX;
      const dy = ev.clientY - pan.current.lastY;
      pan.current.lastX = ev.clientX;
      pan.current.lastY = ev.clientY;
      camera.current.x += dx;
      camera.current.y += dy;
      applyCameraTransform();
    }
    function handleUp() {
      pan.current.active = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, [applyCameraTransform]);

  // ---- Zoom quanh vị trí con trỏ ----
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cam = camera.current;
      const worldBefore = screenToWorld(e.clientX, e.clientY, rect, cam);
      const delta = -e.deltaY * 0.0015;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * (1 + delta)));
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      cam.scale = nextScale;
      cam.x = screenX - worldBefore.x * nextScale;
      cam.y = screenY - worldBefore.y * nextScale;
      applyCameraTransform();
    },
    [applyCameraTransform]
  );

  const resetView = useCallback(() => {
    camera.current = { x: 260, y: 40, scale: 0.86 };
    applyCameraTransform();
  }, [applyCameraTransform]);

  const zoomBy = useCallback(
    (factor: number) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const cam = camera.current;
      const worldBefore = { x: (cx - cam.x) / cam.scale, y: (cy - cam.y) / cam.scale };
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, cam.scale * factor));
      cam.scale = nextScale;
      cam.x = cx - worldBefore.x * nextScale;
      cam.y = cy - worldBefore.y * nextScale;
      applyCameraTransform();
    },
    [applyCameraTransform]
  );
  const zoomIn = useCallback(() => zoomBy(1.2), [zoomBy]);
  const zoomOut = useCallback(() => zoomBy(0.8), [zoomBy]);

  useEffect(() => {
    applyCameraTransform();
  }, [applyCameraTransform]);

  return {
    containerRef,
    worldRef,
    registerNodeEl,
    registerEdgeEl,
    onNodePointerDown,
    onCanvasPointerDown,
    onWheel,
    resetView,
    zoomIn,
    zoomOut,
  };
}
