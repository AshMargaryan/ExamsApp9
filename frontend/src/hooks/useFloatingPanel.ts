import { useCallback, useEffect, useRef, useState } from "react";

// Shared drag/resize/stacking behavior for every floating panel in the app
// (AI assistant widget, floating chat widget, ...). Extracted so dragging
// and resizing math lives in exactly one place instead of being re-derived
// per widget — see FloatingAssistantWidget and FloatingChatWidget for the
// two current consumers.

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ResizeCorner = "nw" | "ne" | "sw" | "se";

// One shared stacking order across every panel on the page — whichever
// panel was interacted with most recently renders on top of the others.
let topZIndex = 40;

export interface UseFloatingPanelOptions {
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  /** Corner of the viewport the panel starts anchored to. */
  defaultAnchor?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  /** Distance (px) kept from viewport edges, both for the initial anchor and drag/resize clamping. */
  margin?: number;
  /** Below this viewport width, the panel should render near-fullscreen instead of floating. */
  compactBreakpoint?: number;
}

function computeDefaultRect(
  size: { width: number; height: number }, anchor: NonNullable<UseFloatingPanelOptions["defaultAnchor"]>,
  margin: number,
): Rect {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const width = Math.min(size.width, Math.max(0, vw - margin * 2));
  const height = Math.min(size.height, Math.max(0, vh - margin * 2));
  const left = anchor.includes("right") ? vw - margin - width : margin;
  const top = anchor.includes("bottom") ? vh - margin - height : margin;
  return { left, top, width, height };
}

function clampRect(rect: Rect, minSize: { width: number; height: number }, margin: number): Rect {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const maxWidth = Math.max(minSize.width, vw - margin * 2);
  const maxHeight = Math.max(minSize.height, vh - margin * 2);
  const width = Math.min(Math.max(rect.width, minSize.width), maxWidth);
  const height = Math.min(Math.max(rect.height, minSize.height), maxHeight);
  const left = Math.min(Math.max(rect.left, margin), Math.max(margin, vw - margin - width));
  const top = Math.min(Math.max(rect.top, margin), Math.max(margin, vh - margin - height));
  return { left, top, width, height };
}

export function useFloatingPanel(options: UseFloatingPanelOptions) {
  const {
    defaultSize,
    minSize = { width: 280, height: 360 },
    defaultAnchor = "bottom-right",
    margin = 16,
    compactBreakpoint = 640,
  } = options;

  const [rect, setRect] = useState<Rect>(() => computeDefaultRect(defaultSize, defaultAnchor, margin));
  const [zIndex, setZIndex] = useState(topZIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCompact, setIsCompact] = useState(
    () => typeof window !== "undefined" && window.innerWidth < compactBreakpoint,
  );

  const dragState = useRef<{ pointerId: number; startX: number; startY: number; origin: Rect } | null>(null);
  const resizeState = useRef<{ pointerId: number; corner: ResizeCorner; startX: number; startY: number; origin: Rect } | null>(null);

  const bringToFront = useCallback(() => {
    topZIndex += 1;
    setZIndex(topZIndex);
  }, []);

  const resetPosition = useCallback(() => {
    setRect(computeDefaultRect(defaultSize, defaultAnchor, margin));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-clamp on viewport resize so a panel dragged/resized near an edge
  // never ends up off-screen (or overflowing horizontally) after the
  // window shrinks — e.g. rotating a tablet.
  useEffect(() => {
    function handleResize() {
      setIsCompact(window.innerWidth < compactBreakpoint);
      setRect((prev) => clampRect(prev, minSize, margin));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compactBreakpoint]);

  function handleDragPointerDown(e: React.PointerEvent<HTMLElement>) {
    if ((e.target as HTMLElement).closest("a, button, input, textarea")) return;
    bringToFront();
    dragState.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origin: rect };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleDragPointerMove(e: React.PointerEvent<HTMLElement>) {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const left = Math.min(Math.max(drag.origin.left + dx, margin), Math.max(margin, vw - margin - drag.origin.width));
    const top = Math.min(Math.max(drag.origin.top + dy, margin), Math.max(margin, vh - margin - drag.origin.height));
    setRect((prev) => ({ ...prev, left, top }));
  }

  function handleDragPointerUp(e: React.PointerEvent<HTMLElement>) {
    if (dragState.current?.pointerId !== e.pointerId) return;
    dragState.current = null;
    setIsDragging(false);
  }

  const dragHandleProps = {
    onPointerDown: handleDragPointerDown,
    onPointerMove: handleDragPointerMove,
    onPointerUp: handleDragPointerUp,
    onPointerCancel: handleDragPointerUp,
  };

  function getResizeHandleProps(corner: ResizeCorner) {
    function handlePointerDown(e: React.PointerEvent<HTMLElement>) {
      e.stopPropagation();
      bringToFront();
      resizeState.current = { pointerId: e.pointerId, corner, startX: e.clientX, startY: e.clientY, origin: rect };
      setIsResizing(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
      const state = resizeState.current;
      if (!state || state.pointerId !== e.pointerId) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const { origin } = state;

      let { left, top, width, height } = origin;

      if (state.corner === "se" || state.corner === "ne") {
        width = Math.min(Math.max(origin.width + dx, minSize.width), vw - margin - origin.left);
      }
      if (state.corner === "sw" || state.corner === "nw") {
        const maxWidth = origin.left + origin.width - margin;
        width = Math.min(Math.max(origin.width - dx, minSize.width), maxWidth);
        left = origin.left + origin.width - width;
      }
      if (state.corner === "se" || state.corner === "sw") {
        height = Math.min(Math.max(origin.height + dy, minSize.height), vh - margin - origin.top);
      }
      if (state.corner === "ne" || state.corner === "nw") {
        const maxHeight = origin.top + origin.height - margin;
        height = Math.min(Math.max(origin.height - dy, minSize.height), maxHeight);
        top = origin.top + origin.height - height;
      }

      setRect({ left, top, width, height });
    }

    function handlePointerUp(e: React.PointerEvent<HTMLElement>) {
      if (resizeState.current?.pointerId !== e.pointerId) return;
      resizeState.current = null;
      setIsResizing(false);
    }

    return {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    };
  }

  return {
    rect,
    zIndex,
    isDragging,
    isResizing,
    isCompact,
    bringToFront,
    resetPosition,
    dragHandleProps,
    getResizeHandleProps,
  };
}
