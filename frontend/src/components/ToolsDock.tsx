import { useEffect, useRef, useState } from "react";
import { Calculator } from "./Calculator";
import { Notepad } from "./Notepad";
import { NotepadBrowser } from "./NotepadBrowser";
import { useNotepad } from "../context/NotepadContext";

type Panel = "calculator" | "notepad" | null;

const PANEL_TOP = 96;
const PANEL_RIGHT = 16;

export function ToolsDock() {
  const { openSignal, pendingEquation, clearPendingEquation } = useNotepad();
  const [panel, setPanel] = useState<Panel>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (openSignal === 0) return;
    setPanel("notepad");
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    if (pendingEquation) setBrowserOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  function toggle(next: Exclude<Panel, null>) {
    setPanel((p) => (p === next ? null : next));
    setOffset({ x: 0, y: 0 });
    setFullscreen(false);
    setBrowserOpen(false);
    clearPendingEquation();
  }

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (fullscreen) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset };
  }

  function handleHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const { startX, startY, origin } = dragState.current;
    setOffset({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
  }

  function handleHeaderPointerUp() {
    dragState.current = null;
  }

  return (
    <>
      {panel && (
        <div
          className={
            fullscreen
              ? "fixed inset-4 z-30 flex flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-xl"
              : `fixed z-30 flex w-[min(92vw,26rem)] flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-xl ${
                  panel === "notepad" ? "h-[65vh]" : "max-h-[70vh]"
                }`
          }
          style={
            fullscreen
              ? undefined
              : {
                  top: PANEL_TOP,
                  right: PANEL_RIGHT,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }
          }
        >
          <div
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
            className={`mb-2 flex items-center justify-between ${fullscreen ? "" : "cursor-move"}`}
          >
            <span className="text-sm font-medium text-text-muted">
              {panel === "calculator" ? "Calculator" : "Notepad"}
            </span>
            <div className="flex items-center gap-1">
              {panel === "notepad" && (
                <button
                  type="button"
                  onClick={() => setBrowserOpen((v) => !v)}
                  className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
                  aria-label="Իմ նշումները"
                  title="Իմ նշումները"
                >
                  📁
                </button>
              )}
              {panel === "notepad" && (
                <button
                  type="button"
                  onClick={() => setFullscreen((f) => !f)}
                  className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
                  aria-label="Toggle fullscreen"
                  title="Toggle fullscreen"
                >
                  {fullscreen ? "⤡" : "⛶"}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPanel(null);
                  setFullscreen(false);
                  setBrowserOpen(false);
                  clearPendingEquation();
                }}
                className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {panel === "calculator" ? (
            <Calculator />
          ) : (
            <div className="relative min-h-0 flex-1">
              <Notepad />
              {browserOpen && (
                <NotepadBrowser onClose={() => setBrowserOpen(false)} fullscreen={fullscreen} />
              )}
            </div>
          )}
        </div>
      )}

      {!fullscreen && (
      <div className="fixed top-4 right-4 z-30 flex flex-col gap-3 sm:right-6">
        <button
          type="button"
          onClick={() => toggle("notepad")}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg transition-colors ${
            panel === "notepad"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-text border border-border hover:border-primary"
          }`}
          aria-label="Notepad"
          title="Notepad"
        >
          📝
        </button>
        <button
          type="button"
          onClick={() => toggle("calculator")}
          className={`flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg transition-colors ${
            panel === "calculator"
              ? "bg-primary text-primary-contrast"
              : "bg-surface text-text border border-border hover:border-primary"
          }`}
          aria-label="Calculator"
          title="Calculator"
        >
          🖩
        </button>
      </div>
      )}
    </>
  );
}