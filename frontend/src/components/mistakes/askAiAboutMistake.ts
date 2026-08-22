import type { MistakeEntry } from "../../api/mistakes";

/*
  Builds the "why did I get this wrong" prompt for the AI Tutor.

  Extracted so the notebook and the focused review session ask in exactly the
  same way — two call sites drifting apart would mean the same mistake gets a
  different quality of explanation depending on which screen you opened it
  from.

  Past-mistake review is already graded, so unlike a live mock exam it is safe
  (and useful) to hand the model the full answer-options list.
*/

function formatChoices(renderData: MistakeEntry["render_data"]): string {
  if (renderData.choices?.length) {
    return "Պատասխանի տարբերակներ.\n" + renderData.choices.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
  }
  if (renderData.statements?.length) {
    return "Պնդումներ.\n" + renderData.statements.map((s) => `${s.label}. ${s.text}`).join("\n");
  }
  if (renderData.left?.length || renderData.right?.length) {
    const left = (renderData.left ?? []).map((s) => `${s.label}. ${s.text}`).join("; ");
    const right = (renderData.right ?? []).map((c) => c.text).join("; ");
    return `Ձախ սյունակ. ${left}\nԱջ սյունակ. ${right}`;
  }
  return "";
}

export function askAiAboutMistake(entry: MistakeEntry) {
  const hint = entry.classified_at ? ` (հավանական պատճառ. ${entry.error_category_display})` : "";
  const choices = formatChoices(entry.render_data);

  return {
    message:
      `Ինչու՞ եմ սխալվել այս հարցում. «${entry.question_text}»: ` +
      `Իմ պատասխանը՝ «${entry.your_answer_text}», ճիշտ պատասխանը՝ «${entry.correct_answer_text}»։${hint}` +
      `${choices ? `\n\n${choices}` : ""}`,
    educationalContext: {
      subject: entry.subject_name,
      topic: entry.topic_label || undefined,
      conversation_mode: "why_am_i_wrong" as const,
    },
  };
}
