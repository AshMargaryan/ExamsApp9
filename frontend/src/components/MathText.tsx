import { useMemo } from "react";
import katex from "katex";

// Splits on $$...$$ (block) and $...$ (inline) LaTeX segments, rendering
// each with KaTeX and leaving the rest as plain text.
const MATH_SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function renderSegment(segment: string, key: number) {
  const isBlock = segment.startsWith("$$") && segment.endsWith("$$");
  const isInline = !isBlock && segment.startsWith("$") && segment.endsWith("$");

  if (!isBlock && !isInline) {
    return <span key={key}>{segment}</span>;
  }

  const latex = segment.slice(isBlock ? 2 : 1, segment.length - (isBlock ? 2 : 1));
  try {
    const html = katex.renderToString(latex, { throwOnError: false, displayMode: isBlock });
    return <span key={key} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span key={key}>{segment}</span>;
  }
}

export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => text.split(MATH_SPLIT).filter((p) => p !== ""), [text]);
  return <span className={className}>{parts.map((part, i) => renderSegment(part, i))}</span>;
}
