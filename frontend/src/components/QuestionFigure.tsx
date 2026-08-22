// Renders an inline SVG figure that ships with a question (e.g. physics
// diagrams). The markup is trusted content from the imported dataset.
export function QuestionFigure({ svg }: { svg?: string }) {
  if (!svg) return null;
  return (
    <div
      className="my-4 flex justify-center overflow-x-auto rounded-[var(--radius)] border border-border bg-white p-3"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
