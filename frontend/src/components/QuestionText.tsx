import { MathText } from "./MathText";

// Mock-exam questions that share a passage/cloze text embed a one-time
// bilingual note ("Հարցեր N-M-ը վերաբերում են..." / "Questions N-M refer
// to...") as the last paragraph of the first question in the group. Pull it
// out and render it as its own callout instead of plain inline text.
const NOTE_RE = /(?:^|\n\n)(Հարցեր \d+-\d+-ը վերաբերում են վերևում նշված տեքստին։\nQuestions \d+-\d+ refer to the text above\.)(?:\n\n|$)/;

export function QuestionText({
  text, index, className,
}: {
  text: string;
  index: number;
  className?: string;
}) {
  const match = text.match(NOTE_RE);
  const note = match?.[1] ?? null;
  const rest = match ? text.slice(0, match.index) + text.slice((match.index ?? 0) + match[0].length) : text;

  return (
    <>
      <p className={className ?? "mb-4 whitespace-pre-line text-xl font-medium text-text"}>
        {index + 1}. <MathText text={rest} />
      </p>
      {note && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-surface-muted px-4 py-3 text-sm leading-relaxed text-text-muted">
          <span aria-hidden="true">📖</span>
          <MathText text={note} className="whitespace-pre-line" />
        </div>
      )}
    </>
  );
}
