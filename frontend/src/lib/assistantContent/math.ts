/*
  MATH DIALECT HANDLING
  ======================================================================

  DECISION: `$…$` / `$$…$$` STAYS. BOTH DIALECTS ARE ACCEPTED.

  The redesign brief's Appendix B mandates `\(…\)` inline and `\[…\]`
  display. The shipped system says the opposite, three times and
  emphatically (backend/apps/ai_assistant/prompts.py:82-90: "The app's
  renderer only recognizes LaTeX wrapped in dollar signs … Never use
  `\(...\)`"), and the renderer is configured for it (remark-math's
  defaults).

  The deciding fact is not preference, it is stored data. Assistant
  messages are persisted as raw text (backend/apps/ai_assistant/models.py:91)
  and re-rendered from that text on every conversation load. A renderer
  that stopped understanding `$` would not degrade gracefully — it would
  turn every answer the student has ever received into literal LaTeX
  noise, retroactively, with no migration path short of rewriting
  message bodies in the database.

  So: `$` remains the dialect the prompt asks for, and this module
  additionally normalises `\(…\)` → `$…$` and `\[…\]` → `$$…$$` before
  the text reaches remark-math. That costs one pass and makes the
  renderer correct no matter which dialect a model, a paste, or a future
  prompt revision produces. Appendix B's delimiters are therefore
  supported but non-normative.

  Everything here is fence- and code-span-aware, because the one thing
  worse than not rendering math is rendering a student's code sample as
  math. `$` inside a code fence is NEVER math.
*/

export type RegionKind =
  | "text"
  | "fence" // ``` or ~~~ block
  | "inlineCode" // `x` span
  | "mathInline" // $x$ or \(x\)
  | "mathDisplay"; // $$x$$ or \[x\]

export interface Region {
  kind: RegionKind;
  /** Index of the first character of the region, delimiters included. */
  start: number;
  /** Index one past the last character of the region. */
  end: number;
  /** False when the region ran to end-of-input without its closing delimiter. */
  closed: boolean;
  /** Which delimiter opened it — only meaningful for the math kinds. */
  dialect?: "dollar" | "backslash";
  /** Content between the delimiters (math regions only). */
  inner?: string;
}

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

function lineStartAt(text: string, i: number): boolean {
  return i === 0 || text[i - 1] === "\n";
}

function endOfLine(text: string, i: number): number {
  const nl = text.indexOf("\n", i);
  return nl === -1 ? text.length : nl;
}

/**
 * Splits `text` into non-overlapping regions in source order, covering
 * every character. This is the single place that knows what is code,
 * what is math, and what is prose — every other function in this module
 * and in the directive parser reads its answer rather than re-deriving
 * it with its own regex.
 *
 * It is deliberately a scanner and not a set of regexes: the rules are
 * positional (a fence only opens at a line start, `$` only opens math
 * when not followed by whitespace) and regexes cannot express "and not
 * while inside one of the other four states".
 */
export function scanRegions(text: string): Region[] {
  const regions: Region[] = [];
  let textStart = 0;
  let i = 0;

  const flushText = (upTo: number) => {
    if (upTo > textStart) {
      regions.push({ kind: "text", start: textStart, end: upTo, closed: true });
    }
  };

  while (i < text.length) {
    const ch = text[i];

    // --- fenced code block -------------------------------------------------
    if ((ch === "`" || ch === "~") && lineStartAt(text, i)) {
      const lineEnd = endOfLine(text, i);
      const match = FENCE_RE.exec(text.slice(i, lineEnd));
      if (match) {
        const marker = match[1];
        flushText(i);
        // Find a closing line made of at least as many of the same char.
        let cursor = lineEnd === text.length ? text.length : lineEnd + 1;
        let end = text.length;
        let closed = false;
        while (cursor < text.length) {
          const stop = endOfLine(text, cursor);
          const line = text.slice(cursor, stop);
          const closeRe = new RegExp(`^ {0,3}\\${marker[0]}{${marker.length},}\\s*$`);
          if (closeRe.test(line)) {
            end = stop === text.length ? text.length : stop + 1;
            closed = true;
            break;
          }
          cursor = stop === text.length ? text.length : stop + 1;
        }
        regions.push({ kind: "fence", start: i, end, closed });
        i = end;
        textStart = i;
        continue;
      }
    }

    // --- inline code span --------------------------------------------------
    if (ch === "`") {
      let runLength = 0;
      while (text[i + runLength] === "`") runLength += 1;
      const run = "`".repeat(runLength);
      const closeIndex = text.indexOf(run, i + runLength);
      // CommonMark: a backtick run with no matching run is literal text.
      if (closeIndex !== -1) {
        flushText(i);
        const end = closeIndex + runLength;
        regions.push({ kind: "inlineCode", start: i, end, closed: true });
        i = end;
        textStart = i;
        continue;
      }
      // Unclosed run: still not prose we want `\(` rewritten inside, and
      // during streaming the closer may simply not have arrived yet.
      flushText(i);
      regions.push({ kind: "inlineCode", start: i, end: text.length, closed: false });
      i = text.length;
      textStart = i;
      continue;
    }

    // --- backslash: either a math opener or an escape ----------------------
    if (ch === "\\") {
      const next = text[i + 1];
      if (next === "(" || next === "[") {
        const isDisplay = next === "[";
        const closer = isDisplay ? "\\]" : "\\)";
        const closeIndex = text.indexOf(closer, i + 2);
        flushText(i);
        const closed = closeIndex !== -1;
        const end = closed ? closeIndex + 2 : text.length;
        regions.push({
          kind: isDisplay ? "mathDisplay" : "mathInline",
          start: i,
          end,
          closed,
          dialect: "backslash",
          inner: text.slice(i + 2, closed ? closeIndex : text.length),
        });
        i = end;
        textStart = i;
        continue;
      }
      // Any other backslash escapes the next character — importantly `\$`,
      // which must not open math.
      i += next === undefined ? 1 : 2;
      continue;
    }

    // --- dollar math -------------------------------------------------------
    if (ch === "$") {
      const isDisplay = text[i + 1] === "$";
      const delim = isDisplay ? "$$" : "$";
      const contentStart = i + delim.length;

      // remark-math's rule for inline: `$` immediately followed by
      // whitespace is not an opener, which is what keeps "5 $ և 10 $"
      // out of math mode. Display `$$` has no such restriction.
      if (!isDisplay) {
        const after = text[contentStart];
        if (after === undefined || /\s/.test(after)) {
          i += 1;
          continue;
        }
      }

      const closeIndex = findDollarClose(text, contentStart, delim);
      if (closeIndex === -1) {
        // No closer anywhere. During streaming that means "not yet";
        // in final content remark-math renders it as literal text. We
        // record it as an unclosed region so trimIncompleteMath can act,
        // and normalisation leaves it untouched either way.
        flushText(i);
        regions.push({
          kind: isDisplay ? "mathDisplay" : "mathInline",
          start: i,
          end: text.length,
          closed: false,
          dialect: "dollar",
          inner: text.slice(contentStart),
        });
        i = text.length;
        textStart = i;
        continue;
      }

      flushText(i);
      const end = closeIndex + delim.length;
      regions.push({
        kind: isDisplay ? "mathDisplay" : "mathInline",
        start: i,
        end,
        closed: true,
        dialect: "dollar",
        inner: text.slice(contentStart, closeIndex),
      });
      i = end;
      textStart = i;
      continue;
    }

    i += 1;
  }

  flushText(text.length);
  return regions;
}

/** Finds the closing `$`/`$$` for a math run opened at `from`, skipping
 * LaTeX-escaped dollars. Inline math additionally may not close on a `$`
 * preceded by whitespace, mirroring remark-math. */
function findDollarClose(text: string, from: number, delim: "$" | "$$"): number {
  for (let j = from; j < text.length; j += 1) {
    if (text[j] === "\\") {
      j += 1;
      continue;
    }
    if (text[j] !== "$") continue;
    if (delim === "$$") {
      if (text[j + 1] === "$") return j;
      continue;
    }
    if (text[j + 1] === "$") continue; // part of a $$ run, not our closer
    if (j > from && /\s/.test(text[j - 1])) continue;
    return j;
  }
  return -1;
}

/**
 * Rewrites `\(…\)` → `$…$` and `\[…\]` → `$$…$$` so a single renderer
 * configuration serves both dialects. Code, existing `$` math, and
 * anything inside a fence are left exactly as written.
 */
export function normalizeMathDelimiters(text: string): string {
  if (!text.includes("\\(") && !text.includes("\\[")) return text;

  let out = "";
  for (const region of scanRegions(text)) {
    const raw = text.slice(region.start, region.end);
    if (region.dialect !== "backslash") {
      out += raw;
      continue;
    }
    const inner = region.inner ?? "";
    if (region.kind === "mathDisplay") {
      out += region.closed ? `$$${inner}$$` : `$$${inner}`;
    } else {
      out += region.closed ? `$${inner}$` : `$${inner}`;
    }
  }
  return out;
}

/**
 * Removes a math run that has been opened but not yet closed, for use
 * while a response is still streaming.
 *
 * Without this, the student watches `$$\frac{a}{b` scroll past as
 * literal LaTeX for a few hundred milliseconds before it snaps into a
 * typeset formula — which reads as a rendering bug, not as progress.
 * Only the *trailing* unclosed run is removed; anything already closed
 * renders normally, so the answer still grows continuously.
 *
 * Never call this on final content: a genuinely unmatched `$` in a
 * finished message is the student's text and must be shown.
 */
export function trimIncompleteMath(text: string): string {
  const regions = scanRegions(text);
  const last = regions[regions.length - 1];
  if (!last) return text;
  if (last.closed) return text;
  if (last.kind !== "mathInline" && last.kind !== "mathDisplay") return text;
  return text.slice(0, last.start);
}
