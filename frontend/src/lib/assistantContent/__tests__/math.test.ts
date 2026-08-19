import { describe, expect, it } from "vitest";
import { normalizeMathDelimiters, scanRegions, trimIncompleteMath } from "../math";

/*
  The `$` dialect is load-bearing for every message ever stored. These
  tests exist to make "we also accept \(…\)" impossible to implement by
  accidentally breaking it.
*/

describe("both dialects are accepted", () => {
  it("rewrites \\(…\\) to $…$", () => {
    expect(normalizeMathDelimiters("Արժեքը \\(x^2\\) է։")).toBe("Արժեքը $x^2$ է։");
  });

  it("rewrites \\[…\\] to $$…$$", () => {
    expect(normalizeMathDelimiters("\\[a^2 + b^2 = c^2\\]")).toBe("$$a^2 + b^2 = c^2$$");
  });

  it("leaves existing $ math completely alone", () => {
    const source = "Ունենք $x = 2$ և $$y = x^2$$։";
    expect(normalizeMathDelimiters(source)).toBe(source);
  });

  it("is a no-op on text with no backslash delimiters (the common case)", () => {
    const source = "Ոչ մի մաթեմատիկա այստեղ։";
    expect(normalizeMathDelimiters(source)).toBe(source);
  });

  it("does not rewrite \\[ that appears inside existing $ math", () => {
    // LaTeX matrices and cases use bracket-heavy syntax inside $$…$$.
    const source = "$$\\begin{cases} x = 1 \\\\ y = 2 \\end{cases}$$";
    expect(normalizeMathDelimiters(source)).toBe(source);
  });

  it("does not rewrite inside a fenced code block", () => {
    const source = ["```latex", "\\(x\\) and \\[y\\]", "```"].join("\n");
    expect(normalizeMathDelimiters(source)).toBe(source);
  });

  it("does not rewrite inside an inline code span", () => {
    const source = "Գրիր `\\(x\\)` կոդում։";
    expect(normalizeMathDelimiters(source)).toBe(source);
  });
});

describe("$ is never math inside code", () => {
  it("classifies $ in a fence as fence, not math", () => {
    const regions = scanRegions(["```bash", "echo $PATH", "```"].join("\n"));
    expect(regions).toHaveLength(1);
    expect(regions[0].kind).toBe("fence");
  });

  it("classifies $ in an inline code span as code", () => {
    const regions = scanRegions("Օգտագործիր `$HOME` փոփոխականը։");
    expect(regions.some((r) => r.kind === "inlineCode")).toBe(true);
    expect(regions.some((r) => r.kind === "mathInline")).toBe(false);
  });

  it("does not open math on a $ followed by whitespace", () => {
    // Currency and prices in Armenian prose: "500 $ և 300 $".
    const regions = scanRegions("Գինը 500 $ և 300 $ է։");
    expect(regions.every((r) => r.kind === "text")).toBe(true);
  });

  it("does not open math on an escaped \\$", () => {
    const regions = scanRegions("Արժե \\$5 ընդամենը։");
    expect(regions.every((r) => r.kind === "text")).toBe(true);
  });
});

describe("streaming math suppression", () => {
  it("removes a display run whose closer has not arrived", () => {
    expect(trimIncompleteMath("Բանաձևը՝ $$x = \\frac{a}{b")).toBe("Բանաձևը՝ ");
  });

  it("removes an inline run whose closer has not arrived", () => {
    expect(trimIncompleteMath("Ունենք $x = \\sqrt{")).toBe("Ունենք ");
  });

  it("keeps everything once the run closes", () => {
    const closed = "Ունենք $x = 2$ և վերջ։";
    expect(trimIncompleteMath(closed)).toBe(closed);
  });

  it("keeps earlier closed runs while trimming only the trailing open one", () => {
    expect(trimIncompleteMath("$a=1$ ապա $$b=")).toBe("$a=1$ ապա ");
  });

  it("does not trim an unclosed fence — react-markdown renders it fine", () => {
    const source = ["Կոդը՝", "```python", "x = 1"].join("\n");
    expect(trimIncompleteMath(source)).toBe(source);
  });

  it("leaves prose ending in a bare $ alone", () => {
    // Whitespace after `$` means it never opened math in the first place.
    const source = "Արժեքը 100 $ ";
    expect(trimIncompleteMath(source)).toBe(source);
  });
});

describe("region scanning covers the whole input", () => {
  const samples = [
    "",
    "պարզ տեքստ",
    "$x$",
    "$$y$$",
    "`code`",
    "```\nfence\n```",
    "\\(a\\) \\[b\\]",
    "անավարտ $$մաթ",
    "անավարտ ```ֆենս",
    "խառը `կոդ` և $մաթ$ և \\(երրորդ\\)",
  ];

  it.each(samples)("reconstructs %j exactly from its regions", (source) => {
    const rebuilt = scanRegions(source)
      .map((r) => source.slice(r.start, r.end))
      .join("");
    expect(rebuilt).toBe(source);
  });

  it.each(samples)("produces contiguous, ordered regions for %j", (source) => {
    let cursor = 0;
    for (const region of scanRegions(source)) {
      expect(region.start).toBe(cursor);
      expect(region.end).toBeGreaterThan(region.start);
      cursor = region.end;
    }
    expect(cursor).toBe(source.length);
  });
});
