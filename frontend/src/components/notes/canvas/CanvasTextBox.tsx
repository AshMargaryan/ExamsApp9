import { useEffect, useRef, useState } from "react";
import type { CanvasTextObject } from "./types";

interface Point {
  x: number;
  y: number;
}

const RESIZE_HANDLE_PX = 18;

/** Draggable, double-click-to-edit text box for canvas notes — adapted from
 * components/Notepad.tsx's TextNoteBox (the floating scratchpad's proven
 * drag/resize/edit interaction), rewritten to commit into the note's
 * persisted object list instead of NotepadContext's ephemeral state. */
export function CanvasTextBox({
  object,
  selected,
  startEditing,
  onSelect,
  onMove,
  onResize,
  onCommitText,
  onDelete,
}: {
  object: CanvasTextObject;
  selected: boolean;
  startEditing?: boolean;
  onSelect: (id: string) => void;
  onMove: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
  onCommitText: (text: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(startEditing ?? object.text === "");
  const [draftText, setDraftText] = useState(object.text);
  const [pos, setPos] = useState({ x: object.x, y: object.y });
  const dragState = useRef<{ startX: number; startY: number; origin: Point } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPos({ x: object.x, y: object.y }), [object.x, object.y]);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => {
      const { width, height } = box.getBoundingClientRect();
      onResize(width, height);
    });
    observer.observe(box);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isInResizeCorner(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX > rect.right - RESIZE_HANDLE_PX && e.clientY > rect.bottom - RESIZE_HANDLE_PX;
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    onSelect(object.id);
    const target = e.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.closest("button")) return;
    if (isInResizeCorner(e)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: { x: pos.x, y: pos.y } };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const { startX, startY, origin } = dragState.current;
    setPos({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
  }

  function handlePointerUp() {
    if (!dragState.current) return;
    dragState.current = null;
    onMove(pos.x, pos.y);
  }

  function commitAndClose() {
    setEditing(false);
    const trimmed = draftText.trim();
    if (!trimmed) {
      onDelete();
      return;
    }
    if (draftText !== object.text) onCommitText(draftText);
  }

  const fontSize = Math.max(11, Math.min(36, (object.width ?? 140) / 10));

  return (
    <div
      ref={boxRef}
      className={`absolute z-10 min-w-[90px] min-h-[40px] max-w-[420px] touch-none resize overflow-auto rounded-md border bg-surface/95 px-2 py-1 shadow-sm ${
        selected ? "border-primary" : "border-primary/50"
      }`}
      style={{
        left: pos.x,
        top: pos.y,
        width: object.width,
        height: object.height,
        cursor: editing ? "default" : "move",
        fontSize,
        color: object.color,
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
          onClick={onDelete}
          aria-label="Ջնջել տեքստը"
          title="Ջնջել"
          className="flex h-6 w-6 items-center justify-center rounded text-sm text-text-muted hover:bg-surface-muted hover:text-primary"
        >
          ✕
        </button>
      </div>
      {editing ? (
        <textarea
          ref={textareaRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={commitAndClose}
          onPointerDown={(e) => e.stopPropagation()}
          rows={2}
          placeholder="Գրեք այստեղ..."
          className="w-full resize-none border-0 bg-transparent p-0 text-[1em] outline-none"
          style={{ color: object.color }}
        />
      ) : (
        <div className="w-full whitespace-pre-wrap break-words px-0.5 text-[1em]">
          {object.text || <span className="text-text-muted">Գրեք այստեղ...</span>}
        </div>
      )}
    </div>
  );
}
