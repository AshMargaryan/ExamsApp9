export interface Point {
  x: number;
  y: number;
}

export type StrokeTool = "pen" | "pencil" | "highlighter" | "eraser";
export type ShapeKind = "rect" | "ellipse" | "line";

export interface CanvasStrokeObject {
  id: string;
  type: "stroke";
  tool: StrokeTool;
  points: Point[];
  color: string;
  width: number;
}

export interface CanvasShapeObject {
  id: string;
  type: "shape";
  shape: ShapeKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
}

export interface CanvasTextObject {
  id: string;
  type: "text";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string;
}

export type CanvasObject = CanvasStrokeObject | CanvasShapeObject | CanvasTextObject;

/** Old Phase 2 shape ({strokes: [{points,color,width,erase}]}) — converted
 * in-memory on load so canvas notes created before this rewrite keep working
 * without a migration. */
export interface LegacyStroke {
  points: Point[];
  color: string;
  width: number;
  erase: boolean;
}

export function migrateLegacyContent(content: Record<string, unknown> | undefined): CanvasObject[] {
  if (!content) return [];
  if (Array.isArray(content.objects)) return content.objects as CanvasObject[];
  if (Array.isArray(content.strokes)) {
    return (content.strokes as LegacyStroke[]).map((s, i) => ({
      id: `legacy-${i}-${Date.now()}`,
      type: "stroke" as const,
      tool: s.erase ? ("eraser" as const) : ("pen" as const),
      points: s.points,
      color: s.color,
      width: s.width,
    }));
  }
  return [];
}
