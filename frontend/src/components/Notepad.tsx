import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { useNotepad, type Stroke, type TextNote } from "../context/NotepadContext";
import { MathText } from "./MathText";

interface Point {
  x: number;
  y: number;
}

const COLORS = ["#1c1d2b", "#d64545", "#5b5bd6", "#1a9e6d"];
const WIDTHS = [2, 4, 8];
const ERASER_WIDTHS = [10, 20, 32];

const RESIZE_HANDLE_PX = 18;

function TextNoteBox({
  note,
  selected,
  onSelect,
}: {
  note: TextNote;
  selected: boolean;
  onSelect: (id: string | null) => void;
}) {
  const { updateTextNote, removeTextNote } = useNotepad();
  const [editing, setEditing] = useState(note.text === "");
  const dragState = useRef<{ startX: number; startY: number; origin: Point } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = box.getBoundingClientRect();
      updateTextNote(note.id, { width, height });
    });
    observer.observe(box);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  function isInResizeCorner(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return (
      e.clientX > rect.right - RESIZE_HANDLE_PX && e.clientY > rect.bottom - RESIZE_HANDLE_PX
    );
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    onSelect(note.id);
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.closest("button")) return;
    if (isInResizeCorner(e)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: { x: note.x, y: note.y } };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const { startX, startY, origin } = dragState.current;
    updateTextNote(note.id, { x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  const fontSize = Math.max(11, Math.min(36, (note.width ?? 140) / 10));

  return (
    <div
      ref={boxRef}
      className={`absolute z-10 min-w-[90px] min-h-[40px] max-w-[420px] touch-none resize overflow-auto rounded-md border bg-surface/95 px-2 py-1 shadow-sm ${
        selected ? "border-primary" : "border-primary/50"
      }`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        cursor: editing ? "default" : "move",
        fontSize,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={() => setEditing(true)}
    >
      <div className="mb-0.5 flex justify-end">
        <button
          type="button"
          onClick={() => removeTextNote(note.id)}
          aria-label="Ջնջել նշումը"
          title="Ջնջել"
          className="flex h-6 w-6 items-center justify-center rounded text-sm text-text-muted hover:bg-surface-muted hover:text-primary"
        >
          ✕
        </button>
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={(e) => updateTextNote(note.id, { text: e.target.value })}
          onBlur={() => setEditing(false)}
          onPointerDown={(e) => e.stopPropagation()}
          rows={2}
          placeholder="Գրեք այստեղ..."
          className="w-full resize-none border-0 bg-transparent p-0 text-[1em] text-text outline-none"
        />
      ) : (
        <div className="w-full whitespace-pre-wrap break-words px-0.5 text-[1em] text-text">
          {note.text ? <MathText text={note.text} /> : <span className="text-text-muted">Գրեք այստեղ...</span>}
        </div>
      )}
    </div>
  );
}

export function Notepad() {
  const { activeNoteId, activeStrokes, textNotes, saveStrokes, addTextNote, removeTextNote, clearTextNotes } =
    useNotepad();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const strokesRef = useRef<Stroke[]>(activeStrokes);
  const activePointerStrokes = useRef<Map<number, Stroke>>(new Map());
  const loadedNoteId = useRef(activeNoteId);

  const [color, setColor] = useState(COLORS[0]);
  const [penWidth, setPenWidth] = useState(WIDTHS[1]);
  const [eraserWidth, setEraserWidth] = useState(ERASER_WIDTHS[1]);
  const [erase, setErase] = useState(false);
  const [, forceRedrawTick] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const width = erase ? eraserWidth : penWidth;

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    const all = [...strokesRef.current, ...activePointerStrokes.current.values()];
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

  // Switching to a different saved note: replace the canvas contents.
  useEffect(() => {
    if (loadedNoteId.current === activeNoteId) return;
    loadedNoteId.current = activeNoteId;
    strokesRef.current = activeStrokes;
    activePointerStrokes.current.clear();
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedNoteId &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        document.activeElement?.tagName !== "INPUT"
      ) {
        e.preventDefault();
        removeTextNote(selectedNoteId);
        setSelectedNoteId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId]);

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    setSelectedNoteId(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    const stroke: Stroke = { points: [getPoint(e)], color, width, erase };
    activePointerStrokes.current.set(e.pointerId, stroke);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activePointerStrokes.current.get(e.pointerId);
    if (!stroke) return;
    stroke.points.push(getPoint(e));
    redraw();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    const stroke = activePointerStrokes.current.get(e.pointerId);
    if (stroke) {
      strokesRef.current = [...strokesRef.current, stroke];
      activePointerStrokes.current.delete(e.pointerId);
      saveStrokes(strokesRef.current);
    }
  }

  function undo() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    redraw();
    forceRedrawTick((t) => t + 1);
    saveStrokes(strokesRef.current);
  }

  function clearAll() {
    strokesRef.current = [];
    activePointerStrokes.current.clear();
    redraw();
    forceRedrawTick((t) => t + 1);
    saveStrokes(strokesRef.current);
    clearTextNotes();
    setSelectedNoteId(null);
  }

  function handleAddText() {
    setSelectedNoteId(null);
    addTextNote("");
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-surface-muted p-1.5">
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
        </div>

        <div className="flex items-center gap-1.5 rounded-md bg-surface-muted p-1.5">
          {(erase ? ERASER_WIDTHS : WIDTHS).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => (erase ? setEraserWidth(w) : setPenWidth(w))}
              className={`flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${
                width === w ? "border-primary bg-surface" : "border-transparent hover:border-border"
              }`}
            >
              <span
                className="rounded-full bg-text"
                style={{ width: Math.min(w, 20), height: Math.min(w, 20) }}
              />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setErase((v) => !v)}
            aria-label="Eraser"
            title="Eraser"
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
              erase ? "border-primary bg-surface" : "border-transparent hover:border-border"
            }`}
          >
            <Eraser size={16} strokeWidth={1.75} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddText}
          aria-label="Ավելացնել տեքստ"
          title="Ավելացնել տեքստ"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          T
        </button>

        <button
          type="button"
          onClick={clearAll}
          aria-label="Clear"
          title="Մաքրել ամեն ինչ"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-border text-base transition-colors hover:border-primary"
        >
          🗑️
        </button>
      </div>

      <div
        ref={wrapRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden rounded-md border border-border bg-surface-muted"
      >
        <canvas
          ref={canvasRef}
          className="h-full w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {textNotes.map((note) => (
          <TextNoteBox
            key={note.id}
            note={note}
            selected={selectedNoteId === note.id}
            onSelect={setSelectedNoteId}
          />
        ))}
      </div>
    </div>
  );
}