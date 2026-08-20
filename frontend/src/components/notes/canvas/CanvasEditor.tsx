import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Circle, Eraser, Highlighter, Lasso, Pen, Pencil, Redo2, Ruler, Slash, Square,
  Trash2, Type, Undo2, type LucideIcon,
} from "lucide-react";
import { useOnClickOutside } from "../../../hooks/useOnClickOutside";
import { CanvasTextBox } from "./CanvasTextBox";
import { CANVAS_COLOR_ROWS, CANVAS_ERASER_SIZE_STEPS, CANVAS_HIGHLIGHTER_SIZE_STEPS, CANVAS_SIZE_STEPS } from "./colorPalette";
import {
  migrateLegacyContent,
  type CanvasObject,
  type CanvasShapeObject,
  type CanvasStrokeObject,
  type CanvasTextObject,
  type Point,
  type ShapeKind,
  type StrokeTool,
} from "./types";

type Tool = StrokeTool | "lasso" | "shape" | "text";

const DRAW_TOOLS: StrokeTool[] = ["pen", "pencil", "highlighter", "eraser"];

const TOOL_LABELS: Record<Tool, string> = {
  pen: "Գրիչ",
  pencil: "Մատիտ",
  highlighter: "Մարկեր",
  eraser: "Ջնջիչ",
  lasso: "Ընտրություն",
  shape: "Ձևեր",
  text: "Տեքստ",
};

/*
  These were eleven glyphs from four different systems: ✏️ 🖍️ 🧹 emoji (colour
  artwork, per-platform weight), ✎ ▭ ◯ ╱ geometric characters (drawn in the
  text font at the text weight), 🅣 an enclosed Latin capital, and ⭕ 📏 more
  emoji — all in one 40px-tall row. It was the densest mixed-icon-language
  surface left in the product.
*/
const TOOL_ICONS: Record<Tool, LucideIcon> = {
  pen: Pen,
  pencil: Pencil,
  highlighter: Highlighter,
  eraser: Eraser,
  lasso: Lasso,
  shape: Square,
  text: Type,
};

const SHAPE_ICONS: Record<ShapeKind, LucideIcon> = { rect: Square, ellipse: Circle, line: Slash };
const SHAPE_LABELS: Record<ShapeKind, string> = { rect: "Ուղղանկյուն", ellipse: "Էլիպս", line: "Գիծ" };

/*
  Was a hardcoded `#2563eb` — neither the product's primary nor theme-aware.

  It is resolved rather than referenced because a canvas 2D context cannot
  read CSS custom properties: assigning `strokeStyle = "var(--color-primary)"`
  is invalid, and an invalid assignment is *silently ignored*, leaving
  whatever colour was set last. So the token is read at draw time, which also
  means the selection outline follows a theme or accent change without a
  reload.
*/
const SELECTION_COLOR_CSS = "var(--color-primary)";

function selectionColor(): string {
  if (typeof window === "undefined") return "#2d3f8f";
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim() ||
    "#2d3f8f"
  );
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function bbox(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function pointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function representativePoints(obj: CanvasObject): Point[] {
  if (obj.type === "stroke") return obj.points;
  if (obj.type === "shape") {
    return [
      { x: obj.x1, y: obj.y1 },
      { x: obj.x2, y: obj.y2 },
      { x: (obj.x1 + obj.x2) / 2, y: (obj.y1 + obj.y2) / 2 },
    ];
  }
  return [{ x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 }];
}

function pointInBoundingBox(pt: Point, obj: CanvasObject): boolean {
  const pad = 6;
  if (obj.type === "stroke") {
    const { minX, minY, maxX, maxY } = bbox(obj.points);
    return pt.x >= minX - pad && pt.x <= maxX + pad && pt.y >= minY - pad && pt.y <= maxY + pad;
  }
  if (obj.type === "shape") {
    const minX = Math.min(obj.x1, obj.x2) - pad, maxX = Math.max(obj.x1, obj.x2) + pad;
    const minY = Math.min(obj.y1, obj.y2) - pad, maxY = Math.max(obj.y1, obj.y2) + pad;
    return pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY;
  }
  return false;
}

function translateObject(obj: CanvasObject, dx: number, dy: number): CanvasObject {
  if (obj.type === "stroke") return { ...obj, points: obj.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  if (obj.type === "shape") return { ...obj, x1: obj.x1 + dx, y1: obj.y1 + dy, x2: obj.x2 + dx, y2: obj.y2 + dy };
  return obj;
}

function drawStroke(ctx: CanvasRenderingContext2D, obj: CanvasStrokeObject) {
  if (obj.points.length < 2) return;
  const isEraser = obj.tool === "eraser";
  const isHighlighter = obj.tool === "highlighter";
  const isPencil = obj.tool === "pencil";
  const passes = isPencil ? 2 : 1;

  for (let p = 0; p < passes; p++) {
    ctx.save();
    ctx.globalCompositeOperation = isEraser ? "destination-out" : isHighlighter ? "multiply" : "source-over";
    ctx.globalAlpha = isHighlighter ? 0.35 : isPencil ? 0.6 : 1;
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = obj.width;
    ctx.lineCap = isHighlighter ? "butt" : "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const jitter = isPencil && p === 1 ? 0.6 : 0;
    ctx.moveTo(obj.points[0].x + jitter, obj.points[0].y - jitter);
    for (const pt of obj.points.slice(1)) ctx.lineTo(pt.x + jitter, pt.y - jitter);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, obj: CanvasShapeObject) {
  ctx.save();
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = obj.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (obj.shape === "rect") {
    ctx.strokeRect(Math.min(obj.x1, obj.x2), Math.min(obj.y1, obj.y2), Math.abs(obj.x2 - obj.x1), Math.abs(obj.y2 - obj.y1));
  } else if (obj.shape === "ellipse") {
    const cx = (obj.x1 + obj.x2) / 2, cy = (obj.y1 + obj.y2) / 2;
    const rx = Math.abs(obj.x2 - obj.x1) / 2, ry = Math.abs(obj.y2 - obj.y1) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(obj.x1, obj.y1);
    ctx.lineTo(obj.x2, obj.y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSelectionOutline(ctx: CanvasRenderingContext2D, obj: CanvasStrokeObject | CanvasShapeObject) {
  let minX: number, minY: number, maxX: number, maxY: number;
  if (obj.type === "stroke") {
    ({ minX, minY, maxX, maxY } = bbox(obj.points));
  } else {
    minX = Math.min(obj.x1, obj.x2);
    maxX = Math.max(obj.x1, obj.x2);
    minY = Math.min(obj.y1, obj.y2);
    maxY = Math.max(obj.y1, obj.y2);
  }
  ctx.save();
  ctx.strokeStyle = selectionColor();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(minX - 6, minY - 6, maxX - minX + 12, maxY - minY + 12);
  ctx.restore();
}

function ShapeOption({
  kind, selected, onSelect,
}: { kind: ShapeKind; selected: boolean; onSelect: () => void }) {
  const Icon = SHAPE_ICONS[kind];
  return (
    <button
      type="button"
      aria-label={SHAPE_LABELS[kind]}
      aria-pressed={selected}
      title={SHAPE_LABELS[kind]}
      onClick={onSelect}
      className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${
        selected ? "bg-primary-bg text-primary ring-1 ring-primary" : "text-text-muted hover:bg-surface-muted"
      }`}
    >
      <Icon size={17} strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function ToolButton({
  active,
  label,
  Icon,
  children,
  onClick,
}: {
  active: boolean;
  label: string;
  Icon?: LucideIcon;
  /** Custom glyph, for the size button which draws its own current width. */
  children?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      /* `title` was the only name these had, so on a phone — the device you
         would actually draw on with a finger — the whole toolbar was
         unlabelled glyphs. And `aria-pressed` was missing, leaving the active
         tool signalled by tint alone. */
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-[var(--radius-lg)] px-3 py-2 text-[length:var(--text-xs)] font-medium transition-colors ${
        active
          ? "bg-primary-bg text-primary ring-1 ring-primary"
          : "text-text-muted hover:bg-surface-muted hover:text-text"
      }`}
    >
      <span className="flex h-5 items-center leading-none">
        {Icon ? <Icon size={18} strokeWidth={1.75} aria-hidden /> : children}
      </span>
      <span aria-hidden className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Full-tool canvas note editor: pen/pencil/highlighter/eraser/lasso/shapes/
 * text/ruler, a 24-color grid, a graduated size scale, and a status pill —
 * matching the reference toolbar. Strokes+shapes render on one raster
 * <canvas> (redraw loop adapted from components/Notepad.tsx, the floating
 * scratchpad's proven pointer-capture approach); text boxes are DOM
 * elements layered above it (components/notes/canvas/CanvasTextBox.tsx,
 * also adapted from Notepad.tsx's TextNoteBox). */
export function CanvasEditor({
  content,
  onChange,
}: {
  content: Record<string, unknown> | undefined;
  onChange: (content: { objects: CanvasObject[] }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const objectsRef = useRef<CanvasObject[]>(migrateLegacyContent(content));
  const previewObjectsRef = useRef<CanvasObject[] | null>(null);
  const undoStackRef = useRef<CanvasObject[][]>([]);
  const redoStackRef = useRef<CanvasObject[][]>([]);
  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);

  const [tool, setTool] = useState<Tool>("pen");
  const [shapeKind, setShapeKind] = useState<ShapeKind>("rect");
  const [color, setColor] = useState(CANVAS_COLOR_ROWS[0][0]);
  const [penWidth, setPenWidth] = useState(CANVAS_SIZE_STEPS[1]);
  const [eraserWidth, setEraserWidth] = useState(CANVAS_ERASER_SIZE_STEPS[1]);
  const [highlighterWidth, setHighlighterWidth] = useState(CANVAS_HIGHLIGHTER_SIZE_STEPS[1]);
  const [rulerActive, setRulerActive] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [sizePopoverOpen, setSizePopoverOpen] = useState(false);
  const [shapesPopoverOpen, setShapesPopoverOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingText, setPendingText] = useState<CanvasTextObject | null>(null);

  const activePointerStrokes = useRef<Map<number, CanvasStrokeObject>>(new Map());
  const activeShapeDraft = useRef<CanvasShapeObject | null>(null);
  const lassoPath = useRef<Point[] | null>(null);
  const moveDragState = useRef<{ startX: number; startY: number } | null>(null);

  function widthForTool(t: Tool): number {
    if (t === "eraser") return eraserWidth;
    if (t === "highlighter") return highlighterWidth;
    return penWidth;
  }

  function setWidthForTool(t: Tool, value: number) {
    if (t === "eraser") setEraserWidth(value);
    else if (t === "highlighter") setHighlighterWidth(value);
    else setPenWidth(value);
  }

  const sizeSteps = tool === "eraser" ? CANVAS_ERASER_SIZE_STEPS : tool === "highlighter" ? CANVAS_HIGHLIGHTER_SIZE_STEPS : CANVAS_SIZE_STEPS;

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    const base = previewObjectsRef.current ?? objectsRef.current;
    const drafts: CanvasObject[] = [...activePointerStrokes.current.values()];
    if (activeShapeDraft.current) drafts.push(activeShapeDraft.current);

    for (const obj of [...base, ...drafts]) {
      if (obj.type === "stroke") drawStroke(ctx, obj);
      else if (obj.type === "shape") drawShape(ctx, obj);
    }

    if (lassoPath.current && lassoPath.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = selectionColor();
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(lassoPath.current[0].x, lassoPath.current[0].y);
      for (const p of lassoPath.current.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const obj of base) {
      if (obj.type !== "text" && selectedIds.has(obj.id)) drawSelectionOutline(ctx, obj);
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
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  useOnClickOutside(
    toolbarRef,
    () => {
      setShapesPopoverOpen(false);
      setColorPopoverOpen(false);
      setSizePopoverOpen(false);
    },
    shapesPopoverOpen || colorPopoverOpen || sizePopoverOpen,
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const inEditable = document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT";
      if (inEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.size > 0) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds]);

  function pushHistory() {
    undoStackRef.current = [...undoStackRef.current, objectsRef.current];
    redoStackRef.current = [];
  }

  function commit(next: CanvasObject[]) {
    pushHistory();
    objectsRef.current = next;
    rerender();
    redraw();
    onChange({ objects: next });
  }

  function undo() {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    redoStackRef.current = [...redoStackRef.current, objectsRef.current];
    objectsRef.current = prev;
    setSelectedIds(new Set());
    rerender();
    redraw();
    onChange({ objects: prev });
  }

  function redo() {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[redoStackRef.current.length - 1];
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    undoStackRef.current = [...undoStackRef.current, objectsRef.current];
    objectsRef.current = next;
    setSelectedIds(new Set());
    rerender();
    redraw();
    onChange({ objects: next });
  }

  function deleteSelected() {
    if (selectedIds.size === 0) return;
    commit(objectsRef.current.filter((o) => !selectedIds.has(o.id)));
    setSelectedIds(new Set());
  }

  function clearAll() {
    commit([]);
    setSelectedIds(new Set());
  }

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    // Without this, the canvas (not natively focusable) still "wins" the
    // browser's default post-mousedown focus assignment, which blurs a
    // textarea created and focused in this same handler (the Text tool) —
    // observed as the fresh CanvasTextBox committing/deleting itself
    // immediately with empty text right after being created.
    e.preventDefault();
    const pt = getPoint(e);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some synthetic/edge-case pointer sessions (and certain automated
      // input tools) don't have a capturable pointer id — drawing still
      // works fine via the regular move/up events either way.
    }

    if (tool === "lasso") {
      if (selectedIds.size > 0 && objectsRef.current.some((o) => selectedIds.has(o.id) && o.type !== "text" && pointInBoundingBox(pt, o))) {
        moveDragState.current = { startX: pt.x, startY: pt.y };
        previewObjectsRef.current = objectsRef.current;
        return;
      }
      lassoPath.current = [pt];
      setSelectedIds(new Set());
      return;
    }

    if (tool === "shape") {
      activeShapeDraft.current = { id: uid(), type: "shape", shape: shapeKind, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y, color, width: penWidth };
      return;
    }

    if (tool === "text") {
      setPendingText({ id: uid(), type: "text", x: pt.x, y: pt.y, width: 160, height: 60, text: "", color });
      return;
    }

    const stroke: CanvasStrokeObject = { id: uid(), type: "stroke", tool, points: [pt], color, width: widthForTool(tool) };
    activePointerStrokes.current.set(e.pointerId, stroke);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pt = getPoint(e);

    if (tool === "lasso" && moveDragState.current) {
      const dx = pt.x - moveDragState.current.startX;
      const dy = pt.y - moveDragState.current.startY;
      previewObjectsRef.current = objectsRef.current.map((o) => (selectedIds.has(o.id) ? translateObject(o, dx, dy) : o));
      redraw();
      return;
    }
    if (tool === "lasso" && lassoPath.current) {
      lassoPath.current = [...lassoPath.current, pt];
      redraw();
      return;
    }
    if (tool === "shape" && activeShapeDraft.current) {
      activeShapeDraft.current = { ...activeShapeDraft.current, x2: pt.x, y2: pt.y };
      redraw();
      return;
    }

    const stroke = activePointerStrokes.current.get(e.pointerId);
    if (!stroke) return;
    if (rulerActive) stroke.points = [stroke.points[0], pt];
    else stroke.points.push(pt);
    redraw();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "lasso" && moveDragState.current) {
      moveDragState.current = null;
      if (previewObjectsRef.current) {
        const moved = previewObjectsRef.current;
        previewObjectsRef.current = null;
        commit(moved);
      }
      return;
    }
    if (tool === "lasso" && lassoPath.current) {
      const loop = lassoPath.current;
      lassoPath.current = null;
      if (loop.length > 2) {
        const hit = new Set<string>();
        for (const obj of objectsRef.current) {
          const pts = representativePoints(obj);
          if (pts.some((p) => pointInPolygon(p, loop))) hit.add(obj.id);
        }
        setSelectedIds(hit);
      } else {
        redraw();
      }
      return;
    }

    if (tool === "shape" && activeShapeDraft.current) {
      const shape = activeShapeDraft.current;
      activeShapeDraft.current = null;
      if (Math.abs(shape.x2 - shape.x1) > 2 || Math.abs(shape.y2 - shape.y1) > 2) {
        commit([...objectsRef.current, shape]);
      } else {
        redraw();
      }
      return;
    }

    const stroke = activePointerStrokes.current.get(e.pointerId);
    if (stroke) {
      activePointerStrokes.current.delete(e.pointerId);
      if (stroke.points.length >= 2) commit([...objectsRef.current, stroke]);
      else redraw();
    }
  }

  const textObjects = objectsRef.current.filter((o): o is CanvasTextObject => o.type === "text");
  const statusWidth = tool === "shape" || tool === "lasso" || tool === "text" ? penWidth : widthForTool(tool);
  const canUndo = undoStackRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[420px] w-full flex-col gap-2">
      {/* Toolbar — the row itself scrolls horizontally (mobile), but popovers are
          siblings positioned against this outer wrapper instead of nested inside
          the scrolling track, so the row's overflow-x-auto (which forces
          overflow-y to clip too, a CSS quirk) never cuts them off. */}
      <div className="relative" ref={toolbarRef}>
        <div className="flex items-stretch gap-1 rounded-[var(--radius-2xl)] border border-border bg-surface px-2 py-1.5 shadow-[var(--shadow-sm)]">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {DRAW_TOOLS.map((t) => (
            <ToolButton key={t} active={tool === t} label={TOOL_LABELS[t]} Icon={TOOL_ICONS[t]} onClick={() => setTool(t)} />
          ))}
          <ToolButton active={tool === "lasso"} label={TOOL_LABELS.lasso} Icon={TOOL_ICONS.lasso} onClick={() => setTool("lasso")} />

          <ToolButton
            active={tool === "shape"}
            label={`${TOOL_LABELS.shape}՝ ${SHAPE_LABELS[shapeKind]}`}
            Icon={SHAPE_ICONS[shapeKind]}
            onClick={() => {
              setTool("shape");
              setShapesPopoverOpen((v) => !v);
              setColorPopoverOpen(false);
              setSizePopoverOpen(false);
            }}
          />
          <ToolButton active={tool === "text"} label={TOOL_LABELS.text} Icon={TOOL_ICONS.text} onClick={() => setTool("text")} />
          <ToolButton active={rulerActive} label="Քանոն" Icon={Ruler} onClick={() => setRulerActive((v) => !v)} />

          <div className="mx-1 h-8 w-px shrink-0 bg-border" />

          <button
            type="button"
            onClick={() => {
              setColorPopoverOpen((v) => !v);
              setShapesPopoverOpen(false);
              setSizePopoverOpen(false);
            }}
            aria-label={`Գույն՝ ${color}`}
            aria-expanded={colorPopoverOpen}
            title="Գույն"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-lg)] hover:bg-surface-muted"
          >
            <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: color }} />
          </button>

          <div className="ml-auto shrink-0">
            {/* Was a "⋮". The trigger draws the current width instead, which
                is the one thing it is for and needs no icon to say it. */}
            <ToolButton
              active={sizePopoverOpen}
              label={`Չափ՝ ${statusWidth}pt`}
              onClick={() => {
                setSizePopoverOpen((v) => !v);
                setShapesPopoverOpen(false);
                setColorPopoverOpen(false);
              }}
            >
              <span
                aria-hidden
                className="rounded-full bg-current"
                style={{ width: Math.min(statusWidth, 18), height: Math.min(statusWidth, 18) }}
              />
            </ToolButton>
          </div>
        </div>

        {/*
          Undo, redo and clear used to live in a separate status pill at the
          bottom of the editor. On a phone that pill sat exactly where the
          app's two floating launchers do — the trash button and the AI
          launcher were about ten pixels apart, so a mis-tap on either hit the
          other. They belong beside the tools that produce the strokes anyway,
          which is where every drawing app puts them.

          Pinned outside the scrolling track: undo is the most-used control
          here and must not require scrolling a toolbar to reach.
        */}
        <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-1.5">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Հետարկել"
            title="Հետարկել (Ctrl+Z)"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 size={17} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Կրկնել"
            title="Կրկնել (Ctrl+Shift+Z)"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 size={17} strokeWidth={1.75} aria-hidden />
          </button>
          <button
            type="button"
            onClick={clearAll}
            aria-label="Մաքրել ամբողջ էջը"
            title="Մաքրել ամբողջը"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:bg-incorrect-bg hover:text-incorrect"
          >
            <Trash2 size={17} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        </div>

        {shapesPopoverOpen && (
          <div className="absolute left-4 top-full z-30 mt-2 flex gap-1 rounded-xl border border-border bg-surface p-1.5 shadow-xl">
            {(["rect", "ellipse", "line"] as ShapeKind[]).map((k) => (
              <ShapeOption
                key={k}
                kind={k}
                selected={shapeKind === k}
                onSelect={() => {
                  setShapeKind(k);
                  setShapesPopoverOpen(false);
                }}
              />
            ))}
          </div>
        )}

        {colorPopoverOpen && (
          <div className="absolute left-1/2 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-border bg-surface p-3 shadow-xl">
            <div className="grid grid-cols-6 gap-2">
              {CANVAS_COLOR_ROWS.flat().map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Գույն ${c}`}
                  aria-pressed={color === c}
                  onClick={() => {
                    setColor(c);
                    setColorPopoverOpen(false);
                  }}
                  className="aspect-square rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? SELECTION_COLOR_CSS : "transparent",
                    transform: color === c ? "scale(1.15)" : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {sizePopoverOpen && (
          <div className="absolute right-4 top-full z-30 mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface p-2 shadow-xl">
            {sizeSteps.map((s) => (
              <button
                key={s}
                type="button"
                aria-label={`${s}pt`}
                aria-pressed={statusWidth === s}
                onClick={() => {
                  setWidthForTool(tool, s);
                  setSizePopoverOpen(false);
                }}
                className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] border ${
                  statusWidth === s ? "border-primary bg-primary-bg" : "border-border"
                }`}
              >
                <span aria-hidden className="rounded-full bg-text" style={{ width: Math.min(s, 20), height: Math.min(s, 20) }} />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
          <span className="text-text">{selectedIds.size} ընտրված</span>
          <button type="button" onClick={deleteSelected} className="ml-auto font-medium text-incorrect hover:underline">
            Ջնջել
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="font-medium text-text-muted hover:underline">
            Չեղարկել ընտրությունը
          </button>
        </div>
      )}

      {/* Canvas surface */}
      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-[var(--radius-lg)] border border-paper-line bg-paper"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {textObjects.map((obj) => (
          <CanvasTextBox
            key={obj.id}
            object={obj}
            selected={selectedIds.has(obj.id)}
            onSelect={(id) => setSelectedIds(new Set([id]))}
            onMove={(x, y) => commit(objectsRef.current.map((o) => (o.id === obj.id ? { ...o, x, y } : o)))}
            onResize={(width, height) => {
              objectsRef.current = objectsRef.current.map((o) => (o.id === obj.id ? { ...o, width, height } : o));
              onChange({ objects: objectsRef.current });
            }}
            onCommitText={(text) => commit(objectsRef.current.map((o) => (o.id === obj.id ? { ...o, text } : o)))}
            onDelete={() => commit(objectsRef.current.filter((o) => o.id !== obj.id))}
          />
        ))}
        {pendingText && (
          <CanvasTextBox
            object={pendingText}
            selected
            startEditing
            onSelect={() => {}}
            onMove={(x, y) => setPendingText((p) => (p ? { ...p, x, y } : p))}
            onResize={(width, height) => setPendingText((p) => (p ? { ...p, width, height } : p))}
            onCommitText={(text) => {
              commit([...objectsRef.current, { ...pendingText, text }]);
              setPendingText(null);
            }}
            onDelete={() => setPendingText(null)}
          />
        )}
      </div>

    </div>
  );
}
