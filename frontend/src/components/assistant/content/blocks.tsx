import { memo } from "react";
import { AlertTriangle, BookOpen, Compass, Lightbulb, PenLine, Sparkles } from "lucide-react";
import type { AssistantBlock, CalloutName, DiagnosisStep } from "../../../lib/assistantContent";
import { AssistantMarkdown } from "./AssistantMarkdown";

/*
  The educational blocks.

  TWO HUES, NOT FIVE. concept / example / tip share the quiet hue;
  mistake and important share warn. Each block is additionally named in
  words and given a distinct icon, so the type survives greyscale,
  colour-blindness, and a screenshot — colour is never the only carrier.

  Everything here is intentionally plain. The one place this renderer is
  allowed to be memorable is the diagnosis rail at the bottom of the
  file; if the callouts also competed for attention, none of it would
  register.
*/

const CALLOUT_META: Record<
  CalloutName,
  { hue: "quiet" | "warn"; label: string; Icon: typeof BookOpen }
> = {
  concept: { hue: "quiet", label: "Հասկացություն", Icon: BookOpen },
  example: { hue: "quiet", label: "Օրինակ", Icon: Sparkles },
  tip: { hue: "quiet", label: "Խորհուրդ", Icon: Lightbulb },
  mistake: { hue: "warn", label: "Հաճախակի սխալ", Icon: AlertTriangle },
  important: { hue: "warn", label: "Կարևոր", Icon: AlertTriangle },
};

export const CalloutBlock = memo(function CalloutBlock({
  name,
  title,
  body,
  open,
}: {
  name: CalloutName;
  title: string | null;
  body: string;
  open: boolean;
}) {
  const meta = CALLOUT_META[name];
  const Icon = meta.Icon;
  return (
    <section
      className={`asst-block asst-block--${meta.hue}`}
      /* aria-busy, not a spinner: an in-progress block is a live region
         detail for assistive tech, not a second animation on screen. */
      aria-busy={open || undefined}
    >
      <h4 className="asst-block__label">
        <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>{title ?? meta.label}</span>
      </h4>
      {body && (
        <div className="asst-block__body">
          <AssistantMarkdown content={body} />
        </div>
      )}
    </section>
  );
});

export const CheckpointBlock = memo(function CheckpointBlock({
  title,
  body,
  hints,
  open,
}: {
  title: string | null;
  body: string;
  hints: string[];
  open: boolean;
}) {
  return (
    <section className="asst-checkpoint" aria-busy={open || undefined}>
      <h4 className="asst-block__label">
        <PenLine size={14} strokeWidth={2.25} aria-hidden="true" />
        <span>{title ?? "Քո հերթն է"}</span>
      </h4>
      {body && <AssistantMarkdown content={body} />}
      {/*
        Hints are collapsed by default and revealed one at a time. That is
        the entire pedagogical point: a checkpoint whose hints are already
        visible is not a checkpoint, it is a worked example with extra
        steps. <details> is used rather than a custom disclosure so it is
        keyboard-operable, screen-reader-announced, and findable by the
        browser's own in-page search without any code.
      */}
      {hints.map((hint, index) => (
        <details key={index} className="asst-hint">
          <summary className="asst-hint__summary">
            {hints.length > 1 ? `Ակնարկ ${index + 1}` : "Ակնարկ"}
          </summary>
          <div className="asst-hint__body">
            <AssistantMarkdown content={hint} />
          </div>
        </details>
      ))}
    </section>
  );
});

/*
  THE SIGNATURE ELEMENT.

  Քո պատասխանը → Որտեղ շեղվեց → Ճիշտ ճանապարհը → Նմանատիպ խնդիր.

  No general-purpose AI chat renders this, because none of them knows
  what the student answered. Haygit does: the mistake notebook and the
  practice/exam surfaces already hand the assistant the wrong answer and
  the right one via educational_context, and the backend already asks for
  exactly this pedagogy in the `why_am_i_wrong` mode framing — in prose,
  with no output contract. The `:::diagnosis` directive is that contract,
  and this is its shape.

  Why a rail and not four callouts: the student's question is not "what
  are four facts about my mistake", it is "where did my reasoning leave
  the road". A sequence with a marked branch point answers that
  positionally, before a single word is read. Four stacked boxes do not.
*/
const DIAGNOSIS_META: Record<DiagnosisStep, { label: string; Icon: typeof BookOpen }> = {
  answer: { label: "Քո պատասխանը", Icon: PenLine },
  drift: { label: "Որտեղ շեղվեց", Icon: AlertTriangle },
  correct: { label: "Ճիշտ ճանապարհը", Icon: Compass },
  practice: { label: "Նմանատիպ խնդիր", Icon: Sparkles },
};

export const DiagnosisBlock = memo(function DiagnosisBlock({
  steps,
  open,
}: {
  steps: { step: DiagnosisStep; body: string }[];
  open: boolean;
}) {
  return (
    <ol className="asst-diagnosis" aria-busy={open || undefined}>
      {steps.map(({ step, body }) => {
        const meta = DIAGNOSIS_META[step];
        const Icon = meta.Icon;
        return (
          <li
            key={step}
            className={`asst-diagnosis__step${step === "drift" ? " asst-diagnosis__step--drift" : ""}`}
          >
            <span className="asst-diagnosis__label">
              <Icon size={13} strokeWidth={2.25} aria-hidden="true" /> {meta.label}
            </span>
            <div className="asst-diagnosis__body">
              <AssistantMarkdown content={body} />
            </div>
          </li>
        );
      })}
    </ol>
  );
});

/** Renders one parsed block. Kept separate from AssistantContent so the
 * switch has exactly one home and a new block kind is a compile error in
 * exactly one place. */
export function AssistantBlockView({ block }: { block: AssistantBlock }) {
  switch (block.kind) {
    case "markdown":
      return <AssistantMarkdown content={block.text} />;
    case "callout":
      return (
        <CalloutBlock name={block.name} title={block.title} body={block.body} open={block.open} />
      );
    case "checkpoint":
      return (
        <CheckpointBlock
          title={block.title}
          body={block.body}
          hints={block.hints}
          open={block.open}
        />
      );
    case "diagnosis":
      return <DiagnosisBlock steps={block.steps} open={block.open} />;
  }
}
