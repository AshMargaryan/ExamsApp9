/*
  The one thing a student can change about the product's colour.

  Replaces `lib/buttonGradient.ts` and `lib/backgroundGradient.ts`, which
  between them let any three arbitrary colours at any angle be written into
  `--gradient-primary` and `--gradient-bg` and painted over every primary
  button and over the page ground carrying all of the body text. The colour
  reasoning for retiring those lives beside the ACCENT PRESETS block in
  theme.css; the mechanical difference is this:

    before   root.style.setProperty("--gradient-bg", "linear-gradient(...)")
    after    root.setAttribute("data-accent", "forest")

  i.e. the choice is now an *index into a curated table in CSS*, not a colour
  value the frontend invents at runtime. That is what makes the contrast
  guarantee hold: light and dark each get their own hand-checked set, and a
  preset can never be half-applied to one theme.

  `lapis` is the identity's own primary and is expressed as the *absence* of
  the attribute, so the default path sets nothing and a student who never
  visits Settings is unaffected by any of this.
*/

export const ACCENTS = [
  {
    id: "lapis",
    /** Armenian labels stay concrete — a teenager should not have to know
     *  what "lapis lazuli" is to recognise the blue one. */
    label: "Կապույտ",
    /** Swatch colours for the picker itself. Two literals per preset, because
     *  the swatch has to show the light and dark faces of a choice that the
     *  student may not be currently looking at. */
    swatch: { light: "#2d3f8f", dark: "#8098f0" },
  },
  { id: "apricot", label: "Ծիրան", swatch: { light: "#8a430f", dark: "#f0a85c" } },
  { id: "pomegranate", label: "Նուռ", swatch: { light: "#9d1f3c", dark: "#f28ba6" } },
  { id: "forest", label: "Անտառ", swatch: { light: "#1a6248", dark: "#5fc79b" } },
  { id: "plum", label: "Սալոր", swatch: { light: "#6a3391", dark: "#c091ea" } },
  { id: "graphite", label: "Գրաֆիտ", swatch: { light: "#3a4150", dark: "#a9b3c6" } },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];

export const DEFAULT_ACCENT: AccentId = "lapis";

const STORAGE_KEY = "accent";

/** Keys written by the retired gradient mixers. A stored value there is not
 *  merely stale — it is a saturated gradient that would still be painted over
 *  the page if anything read it, so boot clears them once and for good. */
const LEGACY_KEYS = ["buttonGradient", "backgroundGradient"];

function isAccent(value: string | null): value is AccentId {
  return ACCENTS.some((a) => a.id === value);
}

export function getStoredAccent(): AccentId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isAccent(stored) ? stored : DEFAULT_ACCENT;
  } catch {
    // Private-mode / disabled storage: fall back to the identity's own colour
    // rather than throwing on the app's very first line.
    return DEFAULT_ACCENT;
  }
}

export function applyAccent(accent: AccentId) {
  const root = document.documentElement;
  if (accent === DEFAULT_ACCENT) root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", accent);
}

export function saveAccent(accent: AccentId) {
  try {
    localStorage.setItem(STORAGE_KEY, accent);
  } catch {
    // Not fatal — the choice still applies for this session.
  }
  applyAccent(accent);
}

/** Called once at boot, before first paint of anything themed. */
export function applyStoredAccent() {
  try {
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  } catch {
    /* nothing to clean up */
  }
  applyAccent(getStoredAccent());
}
