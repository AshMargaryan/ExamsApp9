import { describe, expect, it } from "vitest";
import { parseAssistantContent, parseNextItems } from "../parse";
import type { AssistantBlock } from "../parse";

/*
  The renderer is the highest-risk item in the assistant redesign, and
  these are the tests that were written before the parser was trusted.

  The failure mode they exist to prevent is not "a callout renders
  wrong". It is `:::conc` appearing as literal text in a student's answer
  for two frames, or a `:::` inside a ```python block swallowing the rest
  of a physics explanation into a phantom callout, or the entire stored
  history of the product turning into LaTeX noise.
*/

function markdownText(blocks: AssistantBlock[]): string {
  return blocks
    .filter((b): b is Extract<AssistantBlock, { kind: "markdown" }> => b.kind === "markdown")
    .map((b) => b.text)
    .join("\n");
}

/** Every visible character the student would see, across all blocks. */
function allText(blocks: AssistantBlock[]): string {
  return blocks
    .map((b) => {
      switch (b.kind) {
        case "markdown":
          return b.text;
        case "callout":
          return `${b.title ?? ""}\n${b.body}`;
        case "checkpoint":
          return `${b.title ?? ""}\n${b.body}\n${b.hints.join("\n")}`;
        case "diagnosis":
          return b.steps.map((s) => s.body).join("\n");
      }
    })
    .join("\n");
}

describe("history degradation — the case that must never regress", () => {
  it("returns a message with no directives as a single markdown block, unchanged", () => {
    const stored = [
      "Քառակուսային հավասարման լուծումը:",
      "",
      "1. Հաշվում ենք դիսկրիմինանտը՝ $D = b^2 - 4ac$",
      "2. Եթե $D > 0$, ապա երկու արմատ կա։",
      "",
      "$$x_{1,2} = \\frac{-b \\pm \\sqrt{D}}{2a}$$",
    ].join("\n");

    const result = parseAssistantContent(stored);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toEqual({ kind: "markdown", text: stored });
    expect(result.next).toBeNull();
  });

  it("does not strip an unmatched $ from a finished message", () => {
    // In final content an odd `$` is the student's own text, not a
    // half-arrived formula. Trimming it would delete their words.
    const stored = "Գինը 500 $ է, իսկ մնացածը՝ անվճար։";
    const result = parseAssistantContent(stored, { streaming: false });
    expect(markdownText(result.blocks)).toContain("500 $");
  });

  it("never produces a next row for a plain-markdown message", () => {
    expect(parseAssistantContent("Պատասխանը 4 է։").next).toBeNull();
  });
});

describe("fence awareness runs before directive scanning", () => {
  it("does not open a callout for a ::: inside a code fence", () => {
    const source = [
      "Ահա օրինակը՝",
      "",
      "```python",
      "# ::: this is not a callout",
      ':::concept[Չպետք է բացվի]',
      "print('ok')",
      "```",
      "",
      "Վերջ։",
    ].join("\n");

    const result = parseAssistantContent(source);

    expect(result.blocks.every((b) => b.kind === "markdown")).toBe(true);
    expect(markdownText(result.blocks)).toContain(":::concept[Չպետք է բացվի]");
  });

  it("keeps a directive closer inside a fence as code, not as a close", () => {
    const source = [
      ":::tip[Խորհուրդ]",
      "```",
      ":::",
      "```",
      "Դեռ խորհրդի ներսում ենք։",
      ":::",
      "Դրսում։",
    ].join("\n");

    const result = parseAssistantContent(source);
    const callout = result.blocks.find((b) => b.kind === "callout");

    expect(callout).toBeDefined();
    expect(callout && callout.kind === "callout" && callout.body).toContain("Դեռ խորհրդի ներսում ենք։");
    expect(markdownText(result.blocks)).toContain("Դրսում։");
  });

  it("treats a nested fence (~~~ inside ```) as one code block", () => {
    const source = ["```markdown", "~~~", ":::mistake", "~~~", "```", "Հետո։"].join("\n");
    const result = parseAssistantContent(source);
    expect(result.blocks.every((b) => b.kind === "markdown")).toBe(true);
    expect(markdownText(result.blocks)).toContain(":::mistake");
  });

  it("survives a fence that never closes", () => {
    const source = ["Նայիր՝", "```python", "x = 1", "y = 2"].join("\n");
    expect(() => parseAssistantContent(source, { streaming: true })).not.toThrow();
    const result = parseAssistantContent(source, { streaming: true });
    expect(markdownText(result.blocks)).toContain("x = 1");
  });

  it("does not treat $ inside a code fence as math", () => {
    const source = ["```bash", "echo $PATH && echo $HOME", "```"].join("\n");
    const result = parseAssistantContent(source);
    // Untouched: no delimiter rewriting, no trimming.
    expect(markdownText(result.blocks)).toBe(source);
  });

  it("does not rewrite a backslash-paren dialect inside a code fence", () => {
    const source = ["```latex", "\\(x^2\\)", "```"].join("\n");
    const result = parseAssistantContent(source);
    expect(markdownText(result.blocks)).toBe(source);
  });
});

describe("streaming tolerance — no partial marker is ever visible", () => {
  const full = [
    ":::concept[Դիսկրիմինանտ]",
    "Դիսկրիմինանտը որոշում է արմատների քանակը։",
    ":::",
    "Հասկացա՞ր։",
  ].join("\n");

  it("never renders a partial directive opener as text, at any prefix", () => {
    for (let i = 1; i <= full.length; i += 1) {
      const partial = full.slice(0, i);
      const result = parseAssistantContent(partial, { streaming: true });
      const visible = allText(result.blocks);
      expect(visible, `leaked at prefix length ${i}: ${JSON.stringify(partial)}`).not.toMatch(/:{2,}/);
    }
  });

  it("renders an opened-but-unterminated directive as that block, flagged open", () => {
    const partial = ":::concept[Դիսկրիմինանտ]\nԴիսկրիմինանտը որոշում է";
    const result = parseAssistantContent(partial, { streaming: true });

    expect(result.blocks).toHaveLength(1);
    const block = result.blocks[0];
    expect(block.kind).toBe("callout");
    if (block.kind !== "callout") return;
    expect(block.name).toBe("concept");
    expect(block.title).toBe("Դիսկրիմինանտ");
    expect(block.body).toBe("Դիսկրիմինանտը որոշում է");
    expect(block.open).toBe(true);
  });

  it("holds back a half-written title bracket", () => {
    const result = parseAssistantContent(":::concept[Քառ", { streaming: true });
    expect(allText(result.blocks)).not.toContain(":::");
    expect(allText(result.blocks)).not.toContain("Քառ");
  });

  it("holds back a lone colon run", () => {
    for (const partial of ["Տեքստ\n:", "Տեքստ\n::", "Տեքստ\n:::"]) {
      const result = parseAssistantContent(partial, { streaming: true });
      expect(allText(result.blocks)).not.toMatch(/:\s*$/);
    }
  });

  it("does NOT hold back partial markers when not streaming", () => {
    // A stored message really ending in ":::" is malformed output that
    // has already been persisted. Dropping the marker is right; silently
    // waiting for more text that will never arrive is not.
    const result = parseAssistantContent("Տեքստ\n:::", { streaming: false });
    expect(markdownText(result.blocks)).toBe("Տեքստ");
  });

  it("buffers display math until its closing delimiter arrives", () => {
    const streamingPartial = "Բանաձևը՝\n\n$$x = \\frac{-b \\pm \\sqrt{D}}";
    const result = parseAssistantContent(streamingPartial, { streaming: true });
    const text = markdownText(result.blocks);
    expect(text).toContain("Բանաձևը՝");
    expect(text).not.toContain("\\frac");
  });

  it("reveals the formula once the closing delimiter arrives", () => {
    const complete = "Բանաձևը՝\n\n$$x = \\frac{-b}{2a}$$";
    const result = parseAssistantContent(complete, { streaming: true });
    expect(markdownText(result.blocks)).toContain("\\frac{-b}{2a}");
  });
});

describe("unknown and malformed directives", () => {
  it("renders an unknown directive's body as plain markdown, silently", () => {
    const source = [":::warning[Ուշադրություն]", "Սա անհայտ բլոկ է։", ":::"].join("\n");
    const result = parseAssistantContent(source);

    expect(result.blocks).toEqual([{ kind: "markdown", text: "Սա անհայտ բլոկ է։" }]);
    expect(allText(result.blocks)).not.toContain(":::");
    expect(allText(result.blocks)).not.toContain("warning");
  });

  it("drops a stray closer with nothing open", () => {
    const result = parseAssistantContent("Առաջին։\n:::\nԵրկրորդ։");
    expect(allText(result.blocks)).not.toContain(":::");
    expect(allText(result.blocks)).toContain("Առաջին։");
    expect(allText(result.blocks)).toContain("Երկրորդ։");
  });

  it("closes an unterminated directive when a new one opens", () => {
    const source = [":::concept[Ա]", "Առաջին։", ":::example[Բ]", "Երկրորդ։", ":::"].join("\n");
    const result = parseAssistantContent(source);

    expect(result.blocks.map((b) => b.kind)).toEqual(["callout", "callout"]);
    expect(allText(result.blocks)).toContain("Առաջին։");
    expect(allText(result.blocks)).toContain("Երկրորդ։");
  });

  it("never throws on adversarial input", () => {
    const nasty = [
      "::::::",
      ":::[]",
      ":::a[",
      "::",
      "```",
      ":::concept",
      "$$$$",
      "\\[\\(",
      "~~~~~~",
      ":::next",
    ].join("\n");
    expect(() => parseAssistantContent(nasty, { streaming: true })).not.toThrow();
    expect(() => parseAssistantContent(nasty, { streaming: false })).not.toThrow();
  });
});

describe("directives and markdown structure", () => {
  it("renders a directive that follows a list without leaking the marker", () => {
    const source = [
      "Քայլերը՝",
      "",
      "1. Գտիր $a$, $b$, $c$",
      "2. Հաշվիր $D$",
      "",
      ":::tip[Ստուգիր]",
      "Միշտ ստուգիր նշանները։",
      ":::",
    ].join("\n");

    const result = parseAssistantContent(source);

    expect(result.blocks.map((b) => b.kind)).toEqual(["markdown", "callout"]);
    expect(markdownText(result.blocks)).toContain("1. Գտիր");
    expect(allText(result.blocks)).not.toContain(":::");
  });

  it("accepts a directive indented up to three spaces, as markdown does", () => {
    const source = ["   :::tip", "   Ներսում։", "   :::"].join("\n");
    const result = parseAssistantContent(source);
    expect(result.blocks[0]?.kind).toBe("callout");
  });

  it("keeps a fenced code block inside a callout intact", () => {
    const source = [
      ":::example[Կոդ]",
      "```python",
      "def f(x):",
      "    return x ** 2",
      "```",
      ":::",
    ].join("\n");

    const result = parseAssistantContent(source);
    const block = result.blocks[0];
    expect(block.kind).toBe("callout");
    if (block.kind !== "callout") return;
    expect(block.body).toContain("def f(x):");
    expect(block.body).toContain("```python");
  });
});

describe("Armenian content inside every block type", () => {
  const source = [
    ":::concept[Ֆունկցիայի ածանցյալ]",
    "Ածանցյալը ցույց է տալիս փոփոխման արագությունը՝ $f'(x)$։",
    ":::",
    ":::example[Օրինակ]",
    "Եթե $f(x) = x^2$, ապա $f'(x) = 2x$։",
    ":::",
    ":::mistake[Հաճախակի սխալ]",
    "Աշակերտները շփոթում են ածանցյալը և ինտեգրալը։",
    ":::",
    ":::tip",
    "Միշտ ստուգիր չափողականությունը։",
    ":::",
    ":::important",
    "Քննության ժամանակ ածանցյալի աղյուսակը չի տրվում։",
    ":::",
    ":::checkpoint[Քո հերթն է]",
    "Գտիր $f(x) = 3x^2 + 2x$ ֆունկցիայի ածանցյալը։",
    "::hint Օգտագործիր աստիճանային կանոնը։",
    "::hint $\\frac{d}{dx}(x^n) = nx^{n-1}$",
    ":::",
    ":::diagnosis",
    "::answer Գրեցիր $f'(x) = 3x + 2$։",
    "::drift Աստիճանը իջեցրիր, բայց գործակցով չբազմապատկեցիր։",
    "::correct $f'(x) = 6x + 2$։",
    "::practice Գտիր $g(x) = 5x^3$ ֆունկցիայի ածանցյալը։",
    ":::",
    ":::next",
    "- Բացատրիր ավելի պարզ",
    "- Տուր նման խնդիր",
    ":::",
  ].join("\n");

  const result = parseAssistantContent(source);

  it("parses all five callouts, the checkpoint and the diagnosis", () => {
    expect(result.blocks.map((b) => b.kind)).toEqual([
      "callout",
      "callout",
      "callout",
      "callout",
      "callout",
      "checkpoint",
      "diagnosis",
    ]);
  });

  it("preserves Armenian and inline math in every body", () => {
    const text = allText(result.blocks);
    expect(text).toContain("Ածանցյալը ցույց է տալիս");
    expect(text).toContain("$f'(x) = 2x$");
    expect(text).toContain("շփոթում են ածանցյալը");
    expect(text).toContain("չափողականությունը");
    expect(text).toContain("ածանցյալի աղյուսակը");
    expect(text).not.toContain(":::");
    expect(text).not.toContain("::hint");
  });

  it("collects checkpoint hints separately from the body", () => {
    const checkpoint = result.blocks.find((b) => b.kind === "checkpoint");
    expect(checkpoint?.kind).toBe("checkpoint");
    if (checkpoint?.kind !== "checkpoint") return;
    expect(checkpoint.title).toBe("Քո հերթն է");
    expect(checkpoint.body).toContain("Գտիր");
    expect(checkpoint.hints).toHaveLength(2);
    expect(checkpoint.hints[0]).toBe("Օգտագործիր աստիճանային կանոնը։");
  });

  it("orders the diagnosis steps as answer → drift → correct → practice", () => {
    const diagnosis = result.blocks.find((b) => b.kind === "diagnosis");
    expect(diagnosis?.kind).toBe("diagnosis");
    if (diagnosis?.kind !== "diagnosis") return;
    expect(diagnosis.steps.map((s) => s.step)).toEqual(["answer", "drift", "correct", "practice"]);
    expect(diagnosis.steps[1].body).toContain("չբազմապատկեցիր");
  });

  it("extracts the action row and keeps it out of the block list", () => {
    expect(result.next).toEqual(["Բացատրիր ավելի պարզ", "Տուր նման խնդիր"]);
  });
});

describe(":::next rules", () => {
  it("accepts bare lines as well as list items", () => {
    expect(parseNextItems("Առաջին\nԵրկրորդ\nԵրրորդ")).toEqual(["Առաջին", "Երկրորդ", "Երրորդ"]);
  });

  it("caps at four items", () => {
    expect(parseNextItems("- Ա\n- Բ\n- Գ\n- Դ\n- Ե")).toEqual(["Ա", "Բ", "Գ", "Դ"]);
  });

  it("drops any item longer than forty characters", () => {
    const long = "Ա".repeat(41);
    expect(parseNextItems(`- Կարճ\n- ${long}\n- Նաև կարճ`)).toEqual(["Կարճ", "Նաև կարճ"]);
  });

  it("returns null rather than a one-item row", () => {
    expect(parseNextItems("- Միայն մեկը")).toBeNull();
  });

  it("returns null for an empty body, so no row renders", () => {
    expect(parseNextItems("")).toBeNull();
  });

  it("strips inline emphasis from labels", () => {
    expect(parseNextItems("- **Բացատրիր**\n- `Օրինակ`")).toEqual(["Բացատրիր", "Օրինակ"]);
  });

  it("keeps only the last :::next when a model emits two", () => {
    const source = [
      ":::next",
      "- Հին Ա",
      "- Հին Բ",
      ":::",
      "Տեքստ։",
      ":::next",
      "- Նոր Ա",
      "- Նոր Բ",
      ":::",
    ].join("\n");
    expect(parseAssistantContent(source).next).toEqual(["Նոր Ա", "Նոր Բ"]);
  });

  it("never renders :::next as a visible block", () => {
    const result = parseAssistantContent(":::next\n- Ա\n- Բ\n:::");
    expect(result.blocks).toHaveLength(0);
  });
});
