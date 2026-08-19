/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/*
  THE TOKEN GUARD
  ======================================================================

  "No component may hardcode a colour, radius, duration, or spacing value"
  is a rule that survives exactly as long as someone remembers it. This
  test is the thing that remembers.

  It is a test rather than a lint rule for one reason: the repo lints with
  oxlint, which has no custom-rule API and does not read CSS at all. A
  vitest file needs no new dependency, runs in the existing `npm run test`,
  and can check .tsx and .css with the same code. If oxlint ever grows
  custom rules this should move there.

  SCOPE, AND WHY IT IS NOT THE WHOLE ASSISTANT
  --------------------------------------------
  GUARDED lists the files that have been migrated onto the token layer.
  The legacy assistant files (MessageBubble, MessageInput,
  ConversationSidebar, the mobile set …) are full of `text-[15px]`,
  `rounded-md` and one-off pixel values and would fail on line one. They
  are Slice 2's job. Every slice that migrates a file adds it here, and
  the guard's coverage is therefore a visible, honest measure of how much
  of the assistant actually runs on the design system.

  Slice 2 must add: MessageBubble, MessageInput, TypingIndicator,
  AssistantSuggestions, ConversationSidebar, WelcomeMessage,
  AttachmentChip, FloatingAssistantWidget, and components/mobile/assistant/*.
*/

const SRC = resolve(__dirname, "..");

const GUARDED = [
  "styles/assistant.css",
  "components/assistant/content",
  "lib/assistantContent",
];

/** The token layer itself is where the raw values are allowed to live —
 * that is the entire point of having one file. */
const TOKEN_SOURCE = "styles/assistant.css";

interface Violation {
  file: string;
  line: number;
  text: string;
  rule: string;
}

const RULES: { rule: string; test: RegExp; allow?: RegExp }[] = [
  {
    rule: "hardcoded colour (use a --color-* or --asst-* token)",
    // #abc / #aabbcc / #aabbccdd, and literal rgb()/hsl() functions.
    test: /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\s*\(\s*\d/,
  },
  {
    rule: "hardcoded length (use --space-*, --asst-gap-* or --asst-radius-*)",
    // A Tailwind arbitrary value carrying a raw length: text-[15px],
    // rounded-[12px], w-[3rem], p-[0.5em].
    test: /\[[^\]]*?-?\d*\.?\d+(?:px|rem|em)[^\]]*\]/,
    // …unless the arbitrary value is a token reference, which is the
    // sanctioned way to use a token from a utility class.
    allow: /var\(--/,
  },
  {
    rule: "hardcoded length in a style value or declaration (use a spacing/radius token)",
    // Catches what the bracket rule cannot: inline style objects
    // (`padding: "13px"`) and plain CSS declarations outside the token
    // layer. Unitless numbers (icon `size={14}`) are deliberately not
    // matched — they are props, not design values.
    test: /\b\d*\.?\d+(?:px|rem)\b/,
    allow: /var\(--/,
  },
  {
    rule: "hardcoded duration (use --asst-motion-*)",
    test: /\b\d+(?:\.\d+)?m?s\b/,
    allow: /var\(--/,
  },
  {
    rule: "hardcoded transition/animation timing in CSS (use --asst-motion-* and --asst-ease)",
    test: /\b(?:transition|animation)(?:-duration|-delay)?\s*:\s*[^;]*\b\d+(?:\.\d+)?m?s/,
    allow: /var\(--/,
  },
];

function walk(path: string, out: string[] = []): string[] {
  const stats = statSync(path);
  if (stats.isFile()) {
    if (/\.(tsx?|css)$/.test(path) && !/__tests__/.test(path)) out.push(path);
    return out;
  }
  for (const entry of readdirSync(path)) walk(join(path, entry), out);
  return out;
}

function guardedFiles(): string[] {
  return GUARDED.flatMap((entry) => walk(join(SRC, entry)));
}

function violationsIn(file: string): Violation[] {
  const relativePath = relative(SRC, file);
  if (relativePath === TOKEN_SOURCE) return [];

  const found: Violation[] = [];
  const lines = readFileSync(file, "utf8").split("\n");
  let inBlockComment = false;

  lines.forEach((raw, index) => {
    // Comments explain the tokens; they are allowed to name real values.
    let line = raw;
    if (inBlockComment) {
      const close = line.indexOf("*/");
      if (close === -1) return;
      line = line.slice(close + 2);
      inBlockComment = false;
    }
    const open = line.indexOf("/*");
    if (open !== -1) {
      const close = line.indexOf("*/", open + 2);
      if (close === -1) {
        inBlockComment = true;
        line = line.slice(0, open);
      } else {
        line = line.slice(0, open) + line.slice(close + 2);
      }
    }
    const lineComment = line.indexOf("//");
    if (lineComment !== -1) line = line.slice(0, lineComment);
    if (line.trim() === "") return;

    for (const { rule, test, allow } of RULES) {
      if (!test.test(line)) continue;
      if (allow && allow.test(line)) continue;
      found.push({ file: relativePath, line: index + 1, text: raw.trim(), rule });
    }
  });

  return found;
}

describe("assistant design tokens", () => {
  it("guards at least the token layer, the parser and the renderer", () => {
    const files = guardedFiles().map((f) => relative(SRC, f));
    expect(files).toContain("styles/assistant.css");
    expect(files.some((f) => f.startsWith("components/assistant/content/"))).toBe(true);
    expect(files.length).toBeGreaterThan(3);
  });

  it("has no hardcoded colour, length or duration outside the token layer", () => {
    const violations = guardedFiles().flatMap(violationsIn);
    const report = violations
      .map((v) => `  ${v.file}:${v.line}  ${v.rule}\n      ${v.text}`)
      .join("\n");
    expect(violations, `\n${report}\n`).toEqual([]);
  });

  it("keeps the educational palette to exactly two hues", () => {
    // The rule that a rainbow of pastel callouts is what makes an
    // education product look like a generic AI wrapper is only worth
    // stating if something enforces it.
    const css = readFileSync(join(SRC, TOKEN_SOURCE), "utf8");

    // One modifier class per hue, and no more.
    const modifiers = [...css.matchAll(/\.asst-block--([a-z-]+)\s*\{/g)].map((m) => m[1]);
    expect(modifiers.sort()).toEqual(["quiet", "warn"]);

    // Each hue is a bg/line/ink triple; `--asst-block-*` are the local
    // aliases those modifiers set, not a third palette.
    const hueTriples = [...css.matchAll(/--asst-([a-z]+)-(?:bg|line|ink)\s*:/g)].map((m) => m[1]);
    expect([...new Set(hueTriples)].sort()).toEqual(["block", "quiet", "warn"]);
  });

  it("collapses every motion token under prefers-reduced-motion", () => {
    const css = readFileSync(join(SRC, TOKEN_SOURCE), "utf8");
    const declared = [...css.matchAll(/--asst-motion-([a-z]+)\s*:/g)].map((m) => m[1]);
    const reducedBlock = /@media \(prefers-reduced-motion: reduce\)([\s\S]*?)\n}\n/.exec(css)?.[1] ?? "";
    for (const name of new Set(declared)) {
      expect(reducedBlock, `--asst-motion-${name} is not collapsed`).toContain(`--asst-motion-${name}:`);
    }
  });
});
