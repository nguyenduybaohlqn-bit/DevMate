import { useEffect, useRef, type RefObject, type MutableRefObject } from "react";
import type { VoiceState } from "../types";

interface ReactorParams {
  outer: number; // tốc độ vòng ngoài — độ/giây
  inner: number; // tốc độ vòng trong — độ/giây (ngược chiều)
  glow: number; // độ sáng lõi/vầng hào quang — 0..1
  pulse: number; // tần số nhịp đập của tâm — chu kỳ/giây
  amp: number; // biên độ dao động của các spoke — 0..1
}

const REACTOR_TARGETS: Record<VoiceState, ReactorParams> = {
  idle: { outer: 11, inner: 17, glow: 0.42, pulse: 0.45, amp: 0.3 },
  "user-speaking": { outer: 13, inner: 19, glow: 0.56, pulse: 0.6, amp: 0.32 },
  "ai-thinking": { outer: 92, inner: 158, glow: 0.82, pulse: 2.5, amp: 0.46 },
  "ai-speaking": { outer: 42, inner: 56, glow: 1, pulse: 3, amp: 1 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface ReactorEngineHandles {
  visualRef: RefObject<HTMLDivElement>;
  ringOuterRef: RefObject<SVGCircleElement>;
  ringInnerRef: RefObject<SVGCircleElement>;
  dotRef: RefObject<SVGCircleElement>;
  spokeRefs: MutableRefObject<(HTMLDivElement | null)[]>;
}

/**
 * Engine chuyển động liên tục cho reactor trung tâm.
 *
 * Nguyên lý: góc quay CỘNG DỒN mỗi khung hình, không bao giờ reset về 0.
 * Chỉ có TỐC ĐỘ / ĐỘ SÁNG / BIÊN ĐỘ được nội suy (lerp) dần về target mỗi
 * khi `voiceState` đổi — nhờ vậy lõi tăng/giảm tốc và sáng/mờ dần một
 * cách liên tục ("nước chảy mây trôi"), thay vì nhảy khựng giữa các
 * animation CSS rời rạc.
 *
 * Tôn trọng `prefers-reduced-motion`: nếu người dùng bật giảm chuyển
 * động, chỉ áp giá trị tĩnh một lần thay vì chạy vòng lặp rAF.
 */
export function useReactorEngine(voiceState: VoiceState, spokeCount: number): ReactorEngineHandles {
  const visualRef = useRef<HTMLDivElement>(null);
  const ringOuterRef = useRef<SVGCircleElement>(null);
  const ringInnerRef = useRef<SVGCircleElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const spokeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const targetRef = useRef<ReactorParams>(REACTOR_TARGETS.idle);
  const curRef = useRef<ReactorParams>({ ...REACTOR_TARGETS.idle });
  const spokePhaseRef = useRef<number[]>([]);
  const spokeFreqRef = useRef<number[]>([]);

  // Sinh pha/tần số ngẫu nhiên cố định cho từng spoke — chỉ 1 lần.
  if (spokePhaseRef.current.length !== spokeCount) {
    spokePhaseRef.current = Array.from({ length: spokeCount }, () => Math.random() * Math.PI * 2);
    spokeFreqRef.current = Array.from({ length: spokeCount }, () => 0.7 + Math.random() * 0.9);
  }

  useEffect(() => {
    targetRef.current = REACTOR_TARGETS[voiceState] ?? REACTOR_TARGETS.idle;
  }, [voiceState]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cur = curRef.current;

    const applyStatic = () => {
      const t = targetRef.current;
      Object.assign(cur, t);
      if (ringOuterRef.current) ringOuterRef.current.style.transform = "rotate(0deg)";
      if (ringInnerRef.current) ringInnerRef.current.style.transform = "rotate(0deg)";
      if (dotRef.current) {
        dotRef.current.style.opacity = String(0.5 + cur.glow * 0.3);
        dotRef.current.style.transform = "scale(1)";
      }
      visualRef.current?.style.setProperty("--reactor-glow", cur.glow.toFixed(3));
      spokeRefs.current.forEach((bar) => {
        if (!bar) return;
        bar.style.transform = `scaleY(${(0.3 + cur.amp * 0.5).toFixed(3)})`;
        bar.style.opacity = ".5";
      });
    };

    if (reduceMotion) {
      applyStatic();
      return;
    }

    let raf = 0;
    let angleOuter = 0;
    let angleInner = 0;
    let dotPhase = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = targetRef.current;
      const k = 1 - Math.pow(0.0018, dt); // hệ số làm mượt độc lập khung hình

      cur.outer = lerp(cur.outer, t.outer, k);
      cur.inner = lerp(cur.inner, t.inner, k);
      cur.glow = lerp(cur.glow, t.glow, k);
      cur.pulse = lerp(cur.pulse, t.pulse, k);
      cur.amp = lerp(cur.amp, t.amp, k);

      angleOuter = (angleOuter + cur.outer * dt) % 360;
      angleInner = (angleInner - cur.inner * dt) % 360;
      if (ringOuterRef.current) ringOuterRef.current.style.transform = `rotate(${angleOuter.toFixed(2)}deg)`;
      if (ringInnerRef.current) ringInnerRef.current.style.transform = `rotate(${angleInner.toFixed(2)}deg)`;

      dotPhase += cur.pulse * dt;
      const dotWave = 0.5 + 0.5 * Math.sin(dotPhase * Math.PI * 2);
      if (dotRef.current) {
        dotRef.current.style.opacity = (0.45 + dotWave * 0.55 * cur.glow).toFixed(3);
        dotRef.current.style.transform = `scale(${(1 + dotWave * 0.24 * (0.35 + cur.glow)).toFixed(3)})`;
      }

      visualRef.current?.style.setProperty("--reactor-glow", cur.glow.toFixed(3));

      const phases = spokePhaseRef.current;
      const freqs = spokeFreqRef.current;
      for (let i = 0; i < spokeRefs.current.length; i++) {
        const bar = spokeRefs.current[i];
        if (!bar) continue;
        phases[i] += freqs[i] * (0.5 + cur.pulse * 0.5) * dt;
        const wave = 0.5 + 0.5 * Math.sin(phases[i] * Math.PI * 2);
        bar.style.transform = `scaleY(${(0.26 + wave * cur.amp).toFixed(3)})`;
        bar.style.opacity = (0.32 + wave * 0.5 * (0.4 + cur.amp)).toFixed(3);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { visualRef, ringOuterRef, ringInnerRef, dotRef, spokeRefs };
}
