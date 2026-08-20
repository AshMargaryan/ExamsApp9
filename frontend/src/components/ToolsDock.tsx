import { useEffect, useRef, useState, type ReactNode } from "react";
import { Calculator as CalculatorIcon, StickyNote, Wrench, X, FolderOpen, Maximize2, Minimize2 } from "lucide-react";
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
                  <FolderOpen size={16} strokeWidth={1.75} aria-hidden />
                </button>
              )}
              {panel === "notepad" && (
                <button
                  type="button"
                  onClick={() => setFullscreen((f) => !f)}
                  className="flex h-6 w-6 items-center justify-center text-text-muted hover:text-primary"
                  aria-label={fullscreen ? "Փոքրացնել" : "Ամբողջ էկրանով"}
                  title={fullscreen ? "Փոքրացնել" : "Ամբողջ էկրանով"}
                >
                  {fullscreen ? (
                    <Minimize2 size={16} strokeWidth={1.75} aria-hidden />
                  ) : (
                    <Maximize2 size={16} strokeWidth={1.75} aria-hidden />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={closePanel}
                className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-text-muted hover:text-primary"
                aria-label="Փակել"
              >
                <X size={16} strokeWidth={2} aria-hidden />
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
        <div className="tools-dock-launcher fixed bottom-4 left-4 z-30 flex flex-col-reverse items-start gap-3 sm:left-6 lg:left-[calc(var(--rail-w)+1.5rem)]">
          <button
            type="button"
            onClick={handleHubClick}
            aria-label={panel ? "Փակել գործիքները" : "Գործիքներ"}
            aria-expanded={expanded}
            title={panel ? "Փակել" : "Գործիքներ"}
            /* 52px, not 64. Paired with the assistant launcher in the
               opposite corner this was 128px of permanently obstructed
               content on every page at every scroll position. 52 keeps a
               comfortable margin over the 44px touch-target floor. */
            className={`flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-[var(--shadow-md)] transition-colors ${
              panel || expanded
                ? "bg-primary text-primary-contrast"
                : "bg-surface text-text border border-border hover:border-primary"
            }`}
          >
            {panel || expanded ? (
              <X size={22} strokeWidth={1.75} aria-hidden />
            ) : (
              <Wrench size={22} strokeWidth={1.75} aria-hidden />
            )}
          </button>

          {/*
            `opacity-0 pointer-events-none` hides an element from sight but not
            from the accessibility tree, so a screen reader announced two
            buttons ("Նշումներ", "Հաշվիչ") that could not be activated while
            the dial was closed. `aria-hidden` matches what is actually true.

            The labels are also *shown* when the dial is open. They were
            `title`-only, and a touch device never shows a title — so on a
            phone the dial was two unlabelled circles.
          */}
          {DIAL_ITEMS.map((item, i) => {
            const visible = expanded && !panel;
            return (
              <button
                key={item.panel}
                type="button"
                onClick={() => openPanel(item.panel)}
                aria-hidden={!visible}
                tabIndex={visible ? 0 : -1}
                className={`flex h-12 items-center gap-[var(--space-2)] rounded-full border border-border bg-surface pr-[var(--space-4)] pl-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-text shadow-[var(--shadow-md)] transition-all ease-out ${
                  visible
                    ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-2 scale-75 opacity-0"
                }`}
                style={{ transitionDuration: "180ms", transitionDelay: visible ? `${i * 40}ms` : "0ms" }}
              >
                <span className="text-text-muted">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
