import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { MockExamChoice, MockExamStatement } from "../../api/mockExams";
import { MathText } from "../MathText";

interface Props {
  /** Left column — statements carry label (A, B, …) and, on reveal, match_target. */
  leftItems: MockExamStatement[];
  /** Right column — choices; displayed number is order + 1. */
  rightItems: MockExamChoice[];
  /** statementId -> choiceId */
  value: Record<number, number>;
  onChange: (pairs: Record<number, number>) => void;
  revealed: boolean;
}

interface Line {
  key: number;
  x1: number; y1: number; x2: number; y2: number;
  color: string;
}

const CHOSEN = "#6366f1";
const CORRECT = "#22c55e";
const WRONG = "#ef4444";

export function MatchingQuestion({ leftItems, rightItems, value, onChange, revealed }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftDots = useRef<Map<number, HTMLElement>>(new Map());
  const rightDots = useRef<Map<number, HTMLElement>>(new Map());
  const [activeLeft, setActiveLeft] = useState<number | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const numberOf = useCallback(
    (choiceId: number) => {
      const c = rightItems.find((r) => r.id === choiceId);
      return c ? c.order + 1 : null;
    },
    [rightItems],
  );

  const recompute = useCallback(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const cr = cont.getBoundingClientRect();
    setSize({ w: cr.width, h: cr.height });
    const next: Line[] = [];
    for (const [sidStr, cid] of Object.entries(value)) {
      const sid = Number(sidStr);
      const ld = leftDots.current.get(sid);
      const rd = rightDots.current.get(cid);
      if (!ld || !rd) continue;
      const l = ld.getBoundingClientRect();
      const r = rd.getBoundingClientRect();
      let color = CHOSEN;
      if (revealed) {
        const st = leftItems.find((s) => s.id === sid);
        color = st && numberOf(cid) === st.match_target ? CORRECT : WRONG;
      }
      next.push({
        key: sid,
        x1: l.left - cr.left + l.width / 2,
        y1: l.top - cr.top + l.height / 2,
        x2: r.left - cr.left + r.width / 2,
        y2: r.top - cr.top + r.height / 2,
        color,
      });
    }
    setLines(next);
  }, [value, revealed, leftItems, numberOf]);

  useLayoutEffect(() => {
    recompute();
    const raf = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(raf);
  }, [recompute]);

  useEffect(() => {
    const cont = containerRef.current;
    if (!cont) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(cont);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  function clickLeft(id: number) {
    if (revealed) return;
    setActiveLeft((prev) => (prev === id ? null : id));
  }

  function clickRight(choiceId: number) {
    if (revealed || activeLeft === null) return;
    const next = { ...value };
    if (next[activeLeft] === choiceId) delete next[activeLeft];
    else next[activeLeft] = choiceId;
    onChange(next);
    setActiveLeft(null);
  }

  const connectedChoiceIds = new Set(Object.values(value));

  function dotClass(connected: boolean, active: boolean, color?: string) {
    let cls = "inline-block h-4 w-4 shrink-0 rounded-full border-2 transition-colors ";
    if (active) return cls + "border-primary bg-primary ring-2 ring-primary/40";
    if (connected) {
      if (color) return cls + (color === CORRECT ? "border-correct bg-correct" : "border-incorrect bg-incorrect");
      return cls + "border-primary bg-primary";
    }
    return cls + "border-border bg-surface";
  }

  // Per-statement chosen color on reveal (for the left dot).
  const revealColor = (sid: number): string | undefined => {
    if (!revealed) return undefined;
    const cid = value[sid];
    if (cid === undefined) return undefined;
    const st = leftItems.find((s) => s.id === sid);
    return st && numberOf(cid) === st.match_target ? CORRECT : WRONG;
  };

  return (
    <div>
      {!revealed && (
        <p className="mb-3 text-sm text-text-muted">
          Սեղմե՛ք ձախ սյան կետը, ապա՝ աջ սյան կետը՝ գիծ գծելու համար։ Կրկին սեղմելը հեռացնում է կապը։
        </p>
      )}
      <div ref={containerRef} className="relative">
        <svg
          className="pointer-events-none absolute inset-0 z-10"
          width={size.w}
          height={size.h}
        >
          {lines.map((l) => (
            <line
              key={l.key}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={l.color} strokeWidth={2.5} strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="flex items-start gap-8 sm:gap-16">
          {/* Left column */}
          <ul className="flex flex-1 flex-col gap-2">
            {leftItems.map((s) => {
              const active = activeLeft === s.id;
              const connected = value[s.id] !== undefined;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => clickLeft(s.id)}
                    disabled={revealed}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-lg transition-colors ${
                      active ? "border-primary bg-primary text-primary-contrast" : "border-border"
                    } ${revealed ? "" : "hover:border-primary"}`}
                  >
                    <span>
                      <span className="font-medium">{s.label})</span>{" "}
                      <MathText text={s.text} />
                    </span>
                    <span
                      ref={(el) => { if (el) leftDots.current.set(s.id, el); else leftDots.current.delete(s.id); }}
                      className={dotClass(connected, active, revealColor(s.id))}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Right column */}
          <ul className="flex flex-1 flex-col gap-2">
            {rightItems.map((c) => {
              const connected = connectedChoiceIds.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => clickRight(c.id)}
                    disabled={revealed || activeLeft === null}
                    className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-lg transition-colors ${
                      activeLeft !== null && !revealed ? "border-border hover:border-primary" : "border-border"
                    }`}
                  >
                    <span
                      ref={(el) => { if (el) rightDots.current.set(c.id, el); else rightDots.current.delete(c.id); }}
                      className={dotClass(connected, false)}
                    />
                    <span>
                      <span className="font-medium">{c.order + 1})</span>{" "}
                      <MathText text={c.text} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {revealed && (
        <p className="mt-3 text-base text-text-muted">
          Ճիշտ պատասխան՝{" "}
          <span className="text-text">
            {leftItems.map((s) => `${s.label}-${s.match_target}`).join(", ")}
          </span>
        </p>
      )}
    </div>
  );
}
