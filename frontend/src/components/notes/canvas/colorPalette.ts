/** 24-color grid (4 rows × 6) — grayscale, then warm/cool/green/purple-pink
 * hue families, matching the shape of Apple Notes' pen color grid without
 * needing to match its exact hex values. Shared by the color popover and
 * anything (shapes, text) that also picks from this palette. */
export const CANVAS_COLOR_ROWS: string[][] = [
  ["#1c1d2b", "#3a3a3a", "#6b7280", "#9ca3af", "#d1d5db", "#ffffff"],
  ["#d64545", "#f97316", "#f59e0b", "#eab308", "#38bdf8", "#2563eb"],
  ["#22c55e", "#15803d", "#10b981", "#86efac", "#67e8f9", "#1e3a8a"],
  ["#7c3aed", "#a78bfa", "#d946ef", "#e11d48", "#f472b6", "#fbcfe8"],
];

export const CANVAS_COLORS: string[] = CANVAS_COLOR_ROWS.flat();

export const CANVAS_SIZE_STEPS = [2, 4, 8, 14, 22];
export const CANVAS_ERASER_SIZE_STEPS = [10, 20, 32, 48, 64];
export const CANVAS_HIGHLIGHTER_SIZE_STEPS = [10, 16, 24, 34, 46];
