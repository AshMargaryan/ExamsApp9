import { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  erase: boolean;
}

const COLORS = ["#1c1d2b", "#d64545", "#5b5bd6", "#1a9e6d"];
const WIDTHS = [2, 4, 8];
const ERASER_WIDTHS = [10, 20, 32];

export function Notepad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const activeStrokes = useRef<Map<number, Stroke>>(new Map());

  const [color, setColor] = useState(COLORS[0]);
  const [penWidth, setPenWidth] = useState(WIDTHS[1]);
  const [eraserWidth, setEraserWidth] = useState(ERASER_WIDTHS[1]);
  const [erase, setErase] = useState(false);
  const [, forceRedrawTick] = useState(0);

  const width = erase ? eraserWidth : penWidth;

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    const all = [...strokesRef.current, ...activeStrokes.current.values()];
    for (const stroke of all) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ratio = window.devicePixelRatio || 1;
    const { width: w, height: h } = wrap.getBoundingClientRect();
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    redraw();
  }

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: Stroke = { points: [getPoint(e)], color, width, erase };
    activeStrokes.current.set(e.pointerId, stroke);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokes.current.get(e.pointerId);
    if (!stroke) return;
    stroke.points.push(getPoint(e));
    redraw();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activeStrokes.current.get(e.pointerId);
    if (stroke) {
      strokesRef.current.push(stroke);
      activeStrokes.current.delete(e.pointerId);
    }
  }

  function undo() {
    strokesRef.current.pop();
    redraw();
    forceRedrawTick((t) => t + 1);
  }

  function clearAll() {
    strokesRef.current = [];
    activeStrokes.current.clear();
    redraw();
    forceRedrawTick((t) => t + 1);
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Գույն ${c}`}
            onClick={() => {
              setColor(c);
              setErase(false);
            }}
            className="h-6 w-6 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor: !erase && color === c ? "var(--color-primary)" : "transparent",
              transform: !erase && color === c ? "scale(1.15)" : undefined,
            }}
          />
        ))}

        <div className="mx-1 h-5 w-px bg-border" />

        {(erase ? ERASER_WIDTHS : WIDTHS).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => (erase ? setEraserWidth(w) : setPenWidth(w))}
            className={`flex h-6 w-6 items-center justify-center rounded-md border ${
              width === w ? "border-primary" : "border-border"
            }`}
          >
            <span
              className="rounded-full bg-text"
              style={{ width: Math.min(w, 20), height: Math.min(w, 20) }}
            />
          </button>
        ))}

        <div className="mx-1 h-5 w-px bg-border" />

        <button
          type="button"
          onClick={() => setErase((v) => !v)}
          aria-label="Eraser"
          title="Eraser"
          className={`flex h-7 w-7 items-center justify-center rounded-md border text-base ${
            erase ? "border-primary bg-primary/10" : "border-border"
          }`}
        >
          🧹
        </button>

        <button
          type="button"
          onClick={clearAll}
          aria-label="Clear"
          title="Clear"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md border border-border text-base hover:border-primary"
        >
          🗑️
        </button>
      </div>

      <div
        ref={wrapRef}
        className="min-h-0 flex-1 touch-none overflow-hidden rounded-md border border-border bg-surface-muted"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>
    </div>
  );
}