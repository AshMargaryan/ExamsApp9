/*
  THE CONTENT RENDERING CONTRACT — parser
  ======================================================================

  The dialect the model emits and this module parses:

    :::concept[Քառակուսային բանաձև]  … :::
    :::example / :::mistake / :::tip / :::important  … :::
    :::checkpoint[Քո հերթն է]  … ::hint …  :::     (hints collapsed)
    :::diagnosis  ::answer … ::drift … ::correct … ::practice  :::
    :::next   2–4 items, each ≤ 40 chars, always last, at most one

  Five hard rules, in the order they matter:

  1. FENCES BEFORE DIRECTIVES. `:::` is not a reserved sequence in this
     product. A student can paste it, and today's model can emit it
     inside a ```python block. If directive scanning ran first, a `:::`
     inside a code fence would open a phantom callout that swallows the
     rest of the answer. So the scanner tracks fence state on every line
     and a `:::` inside a fence is just text.

  2. STREAMING TOLERANCE. parse() runs on every flush, against a string
     that is usually mid-token. A half-written opener (`:::conc`, `::hi`,
     `:::concept[Քառ`) must NEVER be visible to the student as literal
     text — it is held back until the line completes. An opened but not
     yet closed directive renders as that block, with whatever body has
     arrived, flagged `open: true` so the UI can show it as in-progress.

  3. HISTORY DEGRADES SILENTLY. Every message stored before this dialect
     existed is plain markdown, and so is every message produced after a
     prompt rollback. A string with no directives in it must come back
     as exactly one markdown block containing exactly the input. The
     dialect is optional, not expected.

  4. UNKNOWN AND MALFORMED NEVER CRASH AND NEVER LEAK. An unrecognised
     directive name renders its body as plain markdown and drops the
     fence lines, silently. An unterminated directive is closed at
     end-of-input. Nothing throws.

  5. `:::next` IS THE ONLY SOURCE OF THE ACTION ROW. Zero or one per
     response, always last, 2–4 items, each ≤ 40 characters. If it is
     absent there is NO action row — a hardcoded default set of
     follow-ups is worse than none, because a generic suggestion under a
     specific answer tells the student the assistant was not listening.
*/

import { normalizeMathDelimiters, trimIncompleteMath } from "./math";

export const CALLOUT_NAMES = ["concept", "example", "mistake", "tip", "important"] as const;
export type CalloutName = (typeof CALLOUT_NAMES)[number];

/** The four steps of the mistake diagnosis, in the order they render. */
export const DIAGNOSIS_STEPS = ["answer", "drift", "correct", "practice"] as const;
export type DiagnosisStep = (typeof DIAGNOSIS_STEPS)[number];

export type AssistantBlock =
  | { kind: "markdown"; text: string }
  | { kind: "callout"; name: CalloutName; title: string | null; body: string; open: boolean }
  | { kind: "checkpoint"; title: string | null; body: string; hints: string[]; open: boolean }
  | { kind: "diagnosis"; steps: { step: DiagnosisStep; body: string }[]; open: boolean };

export interface ParsedContent {
  blocks: AssistantBlock[];
  /** null means "render no action row at all", which is different from []. */
  next: string[] | null;
}

export interface ParseOptions {
  /**
   * True while the response is still arriving. Enables held-back partial
   * openers and trailing-incomplete-math suppression. Must be false for
   * stored messages, where an unmatched `$` is the student's own text.
   */
  streaming?: boolean;
}

export const NEXT_MAX_ITEMS = 4;
export const NEXT_MIN_ITEMS = 2;
export const NEXT_MAX_ITEM_CHARS = 40;

const OPEN_RE = /^ {0,3}:::([a-zA-Z][\w-]*)[ \t]*(?:\[([^\]]*)\])?[ \t]*$/;
const CLOSE_RE = /^ {0,3}:::[ \t]*$/;
const SUB_RE = /^ {0,3}::([a-zA-Z][\w-]*)[ \t]*(.*)$/;
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * A trailing line with no newline after it that could still grow into a
 * directive marker. Held back rather than rendered, because `:::conc`
 * flashing as literal text is the single most visible failure mode of a
 * streaming directive parser.
 *
 * Covers: `:`, `::`, `:::`, `:::conc`, `:::concept[Քառ`, `::hin`, and the
 * partial fence runs `` ` `` / ``` `` ``` which would otherwise render as
 * a stray backtick.
 */
const PARTIAL_MARKER_RE = /^ {0,3}(?::{1,3}[a-zA-Z-]*(?:\[[^\]]*)?|`{1,2}|~{1,2})$/;

interface OpenDirective {
  name: string;
  title: string | null;
  lines: string[];
  /** Sub-marker sections, e.g. ::hint / ::drift, in source order. */
  sections: { name: string; lines: string[] }[];
}

/**
 * Parses a possibly-partial assistant message into renderable blocks.
 *
 * Pure and synchronous — it is called on every stream flush, so it must
 * stay O(n) in the message length with no allocation surprises. It does
 * exactly one pass over the lines plus one math pass per emitted
 * markdown chunk.
 */
export function parseAssistantContent(source: string, options: ParseOptions = {}): ParsedContent {
  const streaming = options.streaming ?? false;
  const blocks: AssistantBlock[] = [];
  let next: string[] | null = null;

  const lines = splitLines(source, streaming);

  let textBuffer: string[] = [];
  let current: OpenDirective | null = null;
  let fenceMarker: string | null = null;

  const flushText = () => {
    if (!textBuffer.length) return;
    const text = textBuffer.join("\n");
    textBuffer = [];
    if (text.trim() === "") return;
    pushMarkdown(blocks, text, streaming);
  };

  const closeDirective = (open: boolean) => {
    if (!current) return;
    const directive = current;
    current = null;
    const built = buildBlock(directive, open, streaming);
    if (built.kind === "next") {
      // At most one, and the last one wins — a model that emits two has
      // changed its mind, and the later list is the one that reflects
      // the finished answer.
      next = built.items;
      return;
    }
    if (built.block) blocks.push(built.block);
    return;
  };

  for (const line of lines) {
    // --- 1. fence state, before anything else ------------------------------
    if (fenceMarker) {
      sink(current, textBuffer).push(line);
      const closeRe = new RegExp(`^ {0,3}\\${fenceMarker[0]}{${fenceMarker.length},}\\s*$`);
      if (closeRe.test(line)) fenceMarker = null;
      continue;
    }
    const fenceOpen = FENCE_OPEN_RE.exec(line);
    if (fenceOpen) {
      fenceMarker = fenceOpen[1];
      sink(current, textBuffer).push(line);
      continue;
    }

    // --- 2. directive close ------------------------------------------------
    if (CLOSE_RE.test(line)) {
      if (current) {
        closeDirective(false);
      }
      // A stray `:::` with nothing open is a malformed marker, not
      // content. Dropping it silently beats showing it.
      continue;
    }

    // --- 3. directive open -------------------------------------------------
    const openMatch = OPEN_RE.exec(line);
    if (openMatch) {
      // Directives do not nest. A new opener while one is open means the
      // model forgot a closer; close the old one as complete rather than
      // letting it swallow the rest of the answer.
      if (current) closeDirective(false);
      else flushText();
      current = { name: openMatch[1].toLowerCase(), title: openMatch[2]?.trim() || null, lines: [], sections: [] };
      continue;
    }

    // --- 4. sub-marker inside a directive ----------------------------------
    if (current) {
      const subMatch = SUB_RE.exec(line);
      if (subMatch) {
        current.sections.push({ name: subMatch[1].toLowerCase(), lines: subMatch[2] ? [subMatch[2]] : [] });
        continue;
      }
      sink(current, textBuffer).push(line);
      continue;
    }

    textBuffer.push(line);
  }

  if (current) closeDirective(true);
  flushText();

  return { blocks, next };
}

/** Where a body line goes: into the innermost open sub-section, else the
 * directive body, else the top-level text buffer. */
function sink(current: OpenDirective | null, textBuffer: string[]): string[] {
  if (!current) return textBuffer;
  const lastSection = current.sections[current.sections.length - 1];
  return lastSection ? lastSection.lines : current.lines;
}

/**
 * Lines to parse. A trailing line with no newline after it is still
 * being written, so while streaming, one that could still grow into a
 * directive marker is dropped (held back) instead of parsed or shown.
 * It reappears on the next flush, complete.
 */
function splitLines(source: string, streaming: boolean): string[] {
  const raw = source.split("\n");
  if (source.endsWith("\n")) {
    raw.pop(); // the empty string after the final newline
    return raw;
  }
  if (streaming && PARTIAL_MARKER_RE.test(raw[raw.length - 1] ?? "")) raw.pop();
  return raw;
}

function pushMarkdown(blocks: AssistantBlock[], text: string, streaming: boolean) {
  const prepared = prepareMarkdown(text, streaming);
  if (prepared.trim() === "") return;
  blocks.push({ kind: "markdown", text: prepared });
}

/** Math normalisation + streaming math suppression, applied to every
 * chunk of prose before it reaches remark-math. */
export function prepareMarkdown(text: string, streaming: boolean): string {
  const normalized = normalizeMathDelimiters(text);
  return streaming ? trimIncompleteMath(normalized) : normalized;
}

/** Either a renderable block (possibly none, if the directive was empty)
 * or the action row, which is not a block and does not render inline. */
type BuiltBlock =
  | { kind: "block"; block: AssistantBlock | null }
  | { kind: "next"; items: string[] | null };

function buildBlock(directive: OpenDirective, open: boolean, streaming: boolean): BuiltBlock {
  const { name } = directive;

  if (name === "next") {
    return { kind: "next", items: parseNextItems(bodyOf(directive)) };
  }

  if (name === "checkpoint") {
    const hints = directive.sections
      .filter((s) => s.name === "hint")
      .map((s) => prepareMarkdown(s.lines.join("\n").trim(), streaming))
      .filter(Boolean);
    const body = prepareMarkdown(directive.lines.join("\n").trim(), streaming);
    if (!body && !hints.length) return { kind: "block", block: null };
    return { kind: "block", block: { kind: "checkpoint", title: directive.title, body, hints, open } };
  }

  if (name === "diagnosis") {
    const steps = directive.sections
      .filter((s): s is { name: DiagnosisStep; lines: string[] } =>
        (DIAGNOSIS_STEPS as readonly string[]).includes(s.name),
      )
      .map((s) => ({ step: s.name, body: prepareMarkdown(s.lines.join("\n").trim(), streaming) }))
      .filter((s) => s.body !== "");
    if (!steps.length) {
      // A diagnosis with no recognised steps is just prose — show it
      // rather than dropping the model's actual explanation.
      const body = prepareMarkdown(bodyOf(directive), streaming);
      return { kind: "block", block: body ? { kind: "markdown", text: body } : null };
    }
    return { kind: "block", block: { kind: "diagnosis", steps, open } };
  }

  if ((CALLOUT_NAMES as readonly string[]).includes(name)) {
    const body = prepareMarkdown(bodyOf(directive), streaming);
    // An open callout with no body yet is still worth rendering — the
    // titled shell arriving before its text is what makes streaming read
    // as structure appearing rather than as a layout jump at the end.
    if (!body && !open && !directive.title) return { kind: "block", block: null };
    return {
      kind: "block",
      block: { kind: "callout", name: name as CalloutName, title: directive.title, body, open },
    };
  }

  // Rule 4: unknown directive name → its body, as plain markdown, with
  // the marker lines dropped. Silently: the student never learns the
  // model used a name we do not know.
  const body = prepareMarkdown(bodyOf(directive), streaming);
  return { kind: "block", block: body ? { kind: "markdown", text: body } : null };
}

/** Body of a directive including any sub-sections, flattened back into
 * markdown — used when the directive turns out not to want them. */
function bodyOf(directive: OpenDirective): string {
  const parts = [directive.lines.join("\n")];
  for (const section of directive.sections) parts.push(section.lines.join("\n"));
  return parts.join("\n").trim();
}

/**
 * `:::next` body → action labels.
 *
 * Accepts either markdown list items or bare lines, because a model told
 * "2–4 short items" produces both. Enforces the caps rather than
 * trusting them: an over-long label breaks the action row's layout on a
 * 360px screen, and five actions is a menu, not a next step.
 *
 * Returns null when the result would be unusable, which the caller
 * treats as "no action row" — never as "fall back to defaults".
 */
export function parseNextItems(body: string): string[] | null {
  const items = body
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "").trim())
    .filter((line) => line !== "")
    .map((line) => stripInlineMarkdown(line))
    .filter((line) => line.length > 0 && line.length <= NEXT_MAX_ITEM_CHARS)
    .slice(0, NEXT_MAX_ITEMS);

  return items.length >= NEXT_MIN_ITEMS ? items : null;
}

/** Action labels are rendered as button text, not markdown, so any
 * emphasis the model added has to come off rather than show as `**`. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1$2")
    .replace(/`(.+?)`/g, "$1")
    .trim();
}
