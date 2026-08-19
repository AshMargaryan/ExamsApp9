import { useEffect, useRef, useState, type ReactNode } from "react";
import { Calculator as CalculatorIcon, StickyNote, Wrench, X } from "lucide-react";
import { Calculator } from "./Calculator";
import { Notepad } from "./Notepad";
import { NotepadBrowser } from "./NotepadBrowser";
import { useNotepad } from "../context/NotepadContext";

type Panel = "calculator" | "notepad" | null;

const PANEL_BOTTOM = 96;
const PANEL_LEFT = 16;

const DIAL_ITEMS: { panel: Exclude<Panel, null>; icon: ReactNode; label: string }[] = [
  { panel: "notepad", icon: <StickyNote size={20} strokeWidth={1.75} />, label: "Նշումներ" },
  { panel: "calculator", icon: <CalculatorIcon size={20} strokeWidth={1.75} />, label: "Հաշվիչ" },
];

/** Global floating tools (notepad + calculator), mounted once in AppChrome so they're
 * available on every authenticated page. Anchored bottom-left (mirroring
 * FloatingAssistantWidget's bottom-right) to stay clear of HeaderStrip's top-right icon
 * cluster — see the collision that pattern already caused for NotificationBell. */
export function ToolsDock() {
  const { openSignal, pendingEquation, clearPendingEquation } = useNotepad();
  const [panel, setPanel] = useState<Panel>(null);
  const [expanded, setExpanded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null);

  useEffect(() => {
    if (openSignal === 0) return;
    setPanel("notepad");
    setExpanded(false);
    setFullscreen(true);
    setOffset({ x: 0, y: 0 });
    if (pendingEquation) setBrowserOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (panel) closePanel();
      else if (expanded) setExpanded(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, expanded]);

  function openPanel(next: Exclude<Panel, null>) {
    setPanel(next);
    setExpanded(false);
    setOffset({ x: 0, y: 0 });
    setFullscreen(false);
    setBrowserOpen(false);
    clearPendingEquation();
  }

  function closePanel() {
    setPanel(null);
    setFullscreen(false);
    setBrowserOpen(false);
    clearPendingEquation();
  }

  function handleHubClick() {
    if (panel) {
      closePanel();
    } else {
      setExpanded((v) => !v);
    }
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
              ? "fixed top-20 right-4 bottom-4 left-4 z-30 flex flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-xl lg:left-[calc(var(--rail-w)+1rem)]"
              : `fixed z-30 flex w-[min(92vw,26rem)] flex-col rounded-[var(--radius)] border border-border bg-surface p-4 shadow-xl ${
                  panel === "notepad" ? "h-[65vh]" : "max-h-[70vh]"
                }`
          }
          style={
            fullscreen
              ? undefined
              : {
                  bottom: PANEL_BOTTOM,
                  // Clears the desktop nav rail; --rail-w is 0 below lg.
                  left: `calc(var(--rail-w) + ${PANEL_LEFT}px)`,
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
                onClick={closePanel}
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

      {/* tools-dock-launcher: theme.css lifts this above the bottom tab bar in
          the native shell, where bottom-4 would land on top of it. */}
      {!fullscreen && (
        <div className="tools-dock-launcher fixed bottom-4 left-4 z-30 flex flex-col-reverse items-center gap-3 sm:left-6 lg:left-[calc(var(--rail-w)+1.5rem)]">
          <button
            type="button"
            onClick={handleHubClick}
            aria-label={panel ? "Փակել գործիքները" : "Գործիքներ"}
            aria-expanded={expanded}
            title={panel ? "Փակել" : "Գործիքներ"}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-colors ${
              panel || expanded
                ? "bg-primary text-primary-contrast"
                : "bg-surface text-text border border-border hover:border-primary"
            }`}
          >
            {panel || expanded ? <X size={26} strokeWidth={1.75} /> : <Wrench size={24} strokeWidth={1.75} />}
          </button>

          {DIAL_ITEMS.map((item, i) => (
            <button
              key={item.panel}
              type="button"
              onClick={() => openPanel(item.panel)}
              aria-label={item.label}
              title={item.label}
              tabIndex={expanded && !panel ? 0 : -1}
              className={`flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-md transition-all ease-out ${
                expanded && !panel
                  ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 scale-75 translate-y-2 pointer-events-none"
              }`}
              style={{ transitionDuration: "180ms", transitionDelay: expanded && !panel ? `${i * 40}ms` : "0ms" }}
            >
              {item.icon}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
