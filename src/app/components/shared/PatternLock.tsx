import { useRef, useState, useEffect, useCallback } from "react";

interface PatternLockProps {
  title: string;
  subtitle?: string;
  error?: string;
  onComplete: (pattern: string) => void;
  onCancel?: () => void;
}

const GRID = 3;
const DOT_COUNT = GRID * GRID;

function dotCenter(idx: number, size: number) {
  const col = idx % GRID;
  const row = Math.floor(idx / GRID);
  const step = size / GRID;
  const offset = step / 2;
  return { x: col * step + offset, y: row * step + offset };
}

export function PatternLock({ title, subtitle, error, onComplete, onCancel }: PatternLockProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState(260);
  const [pattern, setPattern] = useState<number[]>([]);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [done, setDone] = useState(false);
  const activeRef = useRef(false);
  const patternRef = useRef<number[]>([]);

  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(() => setSize(el.clientWidth));
    obs.observe(el);
    setSize(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  const svgPoint = useCallback((e: PointerEvent | React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (size / rect.width),
      y: (e.clientY - rect.top) * (size / rect.height),
    };
  }, [size]);

  const hitDot = useCallback((x: number, y: number) => {
    const radius = size / GRID / 3;
    for (let i = 0; i < DOT_COUNT; i++) {
      const c = dotCenter(i, size);
      if (Math.hypot(x - c.x, y - c.y) < radius) return i;
    }
    return -1;
  }, [size]);

  function reset() {
    setPattern([]);
    patternRef.current = [];
    setCursor(null);
    setDone(false);
    activeRef.current = false;
  }

  function onPointerDown(e: React.PointerEvent) {
    if (done) { reset(); return; }
    const pt = svgPoint(e);
    if (!pt) return;
    const dot = hitDot(pt.x, pt.y);
    if (dot === -1) return;
    activeRef.current = true;
    patternRef.current = [dot];
    setPattern([dot]);
    setCursor(pt);
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!activeRef.current) return;
    const pt = svgPoint(e);
    if (!pt) return;
    setCursor(pt);
    const dot = hitDot(pt.x, pt.y);
    if (dot !== -1 && !patternRef.current.includes(dot)) {
      patternRef.current = [...patternRef.current, dot];
      setPattern([...patternRef.current]);
    }
  }

  function onPointerUp() {
    if (!activeRef.current) return;
    activeRef.current = false;
    setCursor(null);
    const p = patternRef.current;
    if (p.length >= 4) {
      setDone(true);
      onComplete(p.join(""));
      setTimeout(reset, 400);
    } else {
      setTimeout(reset, 600);
    }
  }

  const dotR = size / GRID / 5;
  const activeDotR = dotR * 1.6;

  return (
    <div className="flex flex-col items-center w-full px-6 py-4">
      <h2 className="mb-1 text-center" style={{ fontFamily: "'Roboto Slab', serif", fontWeight: 700, fontSize: "1.3rem" }}>
        {title}
      </h2>
      {subtitle && <p className="text-sm text-muted-foreground mb-1 text-center">{subtitle}</p>}

      {/* Pattern count indicator */}
      <div className="flex gap-2 mb-4 h-5">
        {pattern.length > 0 && Array.from({ length: pattern.length }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary mt-1.5" />
        ))}
      </div>

      {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}

      {/* SVG pattern grid */}
      <div className="w-full max-w-xs select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size} ${size}`}
          width="100%"
          style={{ touchAction: "none", cursor: "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Connection lines */}
          {pattern.length > 1 && pattern.slice(0, -1).map((dot, i) => {
            const a = dotCenter(dot, size);
            const b = dotCenter(pattern[i + 1], size);
            return (
              <line key={`${dot}-${pattern[i+1]}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke="var(--primary)" strokeWidth={dotR * 0.5} strokeLinecap="round" opacity={0.6} />
            );
          })}
          {/* Line to cursor */}
          {cursor && pattern.length > 0 && !done && (() => {
            const last = dotCenter(pattern[pattern.length - 1], size);
            return <line x1={last.x} y1={last.y} x2={cursor.x} y2={cursor.y}
              stroke="var(--primary)" strokeWidth={dotR * 0.4} strokeLinecap="round" opacity={0.4} strokeDasharray="4 4" />;
          })()}

          {/* Dots */}
          {Array.from({ length: DOT_COUNT }).map((_, i) => {
            const { x, y } = dotCenter(i, size);
            const active = pattern.includes(i);
            const isLast = pattern[pattern.length - 1] === i;
            return (
              <g key={i}>
                {/* Outer ring when active */}
                {active && (
                  <circle cx={x} cy={y} r={activeDotR} fill="transparent"
                    stroke="var(--primary)" strokeWidth={dotR * 0.35} opacity={0.35} />
                )}
                {/* Main dot */}
                <circle cx={x} cy={y} r={active ? dotR : dotR * 0.65}
                  fill={active ? "var(--primary)" : "var(--muted-foreground)"}
                  opacity={active ? 1 : 0.4}
                  style={{ transition: "r 0.1s, fill 0.1s" }}
                />
                {/* Center white dot when active */}
                {active && (
                  <circle cx={x} cy={y} r={dotR * 0.35} fill="white" opacity={0.9} />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs text-muted-foreground mt-2">Дор хаяж 4 цэг холбоно уу</p>

      {onCancel && (
        <button onClick={onCancel} className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
          Болих
        </button>
      )}
    </div>
  );
}
