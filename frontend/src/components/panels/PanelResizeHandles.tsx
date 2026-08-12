import type { ResizeCorner } from "../../hooks/useFloatingPanel";

const CORNER_STYLE: Record<ResizeCorner, { className: string; cursor: string }> = {
  nw: { className: "top-0 left-0", cursor: "nwse-resize" },
  ne: { className: "top-0 right-0", cursor: "nesw-resize" },
  sw: { className: "bottom-0 left-0", cursor: "nesw-resize" },
  se: { className: "bottom-0 right-0", cursor: "nwse-resize" },
};

/**
 * The four corner resize grips shared by every floating panel. Purely
 * presentational — pointer handling comes from useFloatingPanel's
 * getResizeHandleProps, passed in per corner.
 */
export function PanelResizeHandles({
  getHandleProps,
}: {
  getHandleProps: (corner: ResizeCorner) => React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <>
      {(Object.keys(CORNER_STYLE) as ResizeCorner[]).map((corner) => (
        <div
          key={corner}
          {...getHandleProps(corner)}
          className={`absolute z-10 h-4 w-4 touch-none ${CORNER_STYLE[corner].className}`}
          style={{ cursor: CORNER_STYLE[corner].cursor }}
        />
      ))}
    </>
  );
}
