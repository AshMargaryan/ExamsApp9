import { useMemo } from "react";
import katex from "katex";
import { useNotepadOptional } from "../context/NotepadContext";

// Splits on $$...$$ (block) and $...$ (inline) LaTeX segments, rendering
// each with KaTeX and leaving the rest as plain text.
const MATH_SPLIT = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;

function renderSegment(
  segment: string,
  key: number,
  onInsert: ((latex: string) => void) | null,
) {
  const isBlock = segment.startsWith("$$") && segment.endsWith("$$");
  const isInline = !isBlock && segment.startsWith("$") && segment.endsWith("$");

  if (!isBlock && !isInline) {
    return <span key={key}>{segment}</span>;
  }

  const latex = segment.slice(isBlock ? 2 : 1, segment.length - (isBlock ? 2 : 1));
  let mathEl: React.ReactNode;
  try {
    const html = katex.renderToString(latex, { throwOnError: false, displayMode: isBlock });
    mathEl = <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    mathEl = <span>{segment}</span>;
  }

  if (!onInsert) {
    return <span key={key}>{mathEl}</span>;
  }

  return (
    <span key={key} className="inline-flex items-center gap-1 align-middle">
      {mathEl}
      <button
        type="button"
        onClick={() => onInsert(segment)}
        title="Ավելացնել այս հավասարումը իմ նշումներում"
        aria-label="Ավելացնել այս հավասարումը իմ նշումներում"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border align-middle text-[11px] leading-none hover:border-primary"
      >
        📝
      </button>
    </span>
  );
}

export function MathText({
  text,
  className,
  allowInsert = false,
}: {
  text: string;
  className?: string;
  allowInsert?: boolean;
}) {
  const notepad = useNotepadOptional();
  const parts = useMemo(() => text.split(MATH_SPLIT).filter((p) => p !== ""), [text]);

  const onInsert =
    allowInsert && notepad ? (latex: string) => notepad.requestInsertEquation(latex) : null;

  return <span className={className}>{parts.map((part, i) => renderSegment(part, i, onInsert))}</span>;
}