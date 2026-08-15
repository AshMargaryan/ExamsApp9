import type { SubjectKey } from "./subjects";

export type OrbitShape = "latex" | "glyph" | "pill" | "icon" | "portrait" | "clock";
export type IconKey = "mountain" | "flask" | "khachkar" | "manuscript" | "quill" | "book";

export interface OrbitItem {
  shape: OrbitShape;
  /** Display text — glyph char, pill copy, or portrait/icon label (also used as alt text). */
  t?: string;
  /** LaTeX source, rendered via KaTeX (shape: 'latex' only). */
  tex?: string;
  icon?: IconKey;
  /** Path under /subjects-universe (shape: 'portrait' only). */
  src?: string;
  imgShape?: "rect" | "circle";
  /** Orbit radius (px). */
  r: number;
  /** Starting angle (deg). */
  a: number;
  /** Depth 0-1 — drives scale/opacity/blur/z-index (closer to camera = higher). */
  d: number;
  /** Base font/icon size (px). */
  s: number;
  /** Orbit period (seconds). */
  sp: number;
  dir: 1 | -1;
  big?: boolean;
  behind?: boolean;
  wrap?: boolean;
  maxW?: number;
  bloody?: boolean;
}

export type CentralType = "glyph" | "medallion" | "photo" | "blackhole" | "atom";
export type MedallionStyle = "laurel" | "coin" | "cameo";

export interface SubjectUniverseData {
  id: string;
  index: string;
  nameNative: string;
  seed: number;
  accent: string;
  accent2: string;
  fieldStrength: number;
  centralType: CentralType;
  glyphChar?: string;
  caption?: string;
  personLabel?: string;
  medallionStyle?: MedallionStyle;
  portraitSrc?: string;
  items: OrbitItem[];
  /** Maps to a real SubjectKey when practice content exists; undefined means "coming soon". */
  linkKey?: SubjectKey;
}

// Ported from the "Subjects Universe" design prototype (subjects-data.js). Portrait
// images are limited to the 8 historical-figure photos actually supplied with the
// design — orbit items that referenced unsupplied images (Einstein, Darwin, da Vinci,
// Dostoevsky, maps, a tesseract gif, etc.) were dropped rather than faked. Biology and
// geography lost their only image sources entirely, so their central visuals were
// swapped from photo/medallion to a thematic glyph.
export const SUBJECTS_UNIVERSE: SubjectUniverseData[] = [
  {
    id: "math",
    index: "01",
    nameNative: "Մաթեմատիկա",
    seed: 3,
    accent: "#7c8fff",
    accent2: "#b9c6ff",
    fieldStrength: 0.55,
    centralType: "glyph",
    glyphChar: "∞",
    linkKey: "math",
    items: [
      { shape: "latex", tex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta", r: 240, a: 25, d: 0.95, s: 22, sp: 52, dir: 1, big: true },
      { shape: "latex", tex: "\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}", r: 210, a: 150, d: 0.5, s: 16, sp: 38, dir: -1, behind: true },
      { shape: "latex", tex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n", r: 260, a: 65, d: 0.35, s: 15, sp: 56, dir: -1, behind: true },
      { shape: "latex", tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1", r: 150, a: 265, d: 0.6, s: 17, sp: 26, dir: 1 },
      { t: "π", r: 170, a: 320, d: 0.9, s: 42, sp: 18, dir: 1, shape: "glyph" },
      { t: "e", r: 120, a: 200, d: 0.7, s: 38, sp: 22, dir: -1, shape: "glyph" },
      { shape: "latex", tex: "T^{\\mu\\nu}_{\\ \\ \\lambda}", r: 220, a: 100, d: 0.55, s: 26, sp: 30, dir: 1, big: true },
      { t: "0", r: 180, a: 80, d: 0.8, s: 36, sp: 20, dir: -1, shape: "glyph" },
    ],
  },
  {
    id: "english",
    index: "02",
    nameNative: "Անգլերեն",
    seed: 11,
    accent: "#d9b26b",
    accent2: "#f0dfa8",
    fieldStrength: 0.4,
    centralType: "medallion",
    medallionStyle: "laurel",
    personLabel: "William Shakespeare",
    portraitSrc: "/subjects-universe/shakespeare.png",
    linkKey: "english",
    items: [
      { t: "To be, or not to be", r: 250, a: 335, d: 0.9, s: 20, sp: 50, dir: 1, shape: "pill", big: true, wrap: true, maxW: 175 },
      { t: "A B C D", r: 170, a: 30, d: 0.4, s: 26, sp: 32, dir: 1, shape: "glyph", behind: true },
      { icon: "quill", t: "quill", r: 100, a: 200, d: 0.85, s: 30, sp: 18, dir: 1, shape: "icon" },
      { icon: "book", t: "folio", r: 210, a: 140, d: 0.35, s: 26, sp: 40, dir: -1, shape: "icon", behind: true },
      { t: '" "', r: 145, a: 260, d: 0.55, s: 36, sp: 28, dir: -1, shape: "glyph" },
    ],
  },
  {
    id: "armlang",
    index: "03",
    nameNative: "Հայոց լեզու",
    seed: 19,
    accent: "#d9573f",
    accent2: "#e8b23f",
    fieldStrength: 0.5,
    centralType: "medallion",
    medallionStyle: "laurel",
    personLabel: "Մեսրոպ Մաշտոց",
    portraitSrc: "/subjects-universe/mashtots.jpg",
    items: [
      { t: "Ա", r: 120, a: 30, d: 0.7, s: 44, sp: 20, dir: 1, shape: "glyph" },
      { t: "Հ", r: 240, a: 300, d: 0.9, s: 50, sp: 46, dir: -1, shape: "glyph", big: true },
      { shape: "portrait", t: "Հովհաննես Թումանյան", r: 175, a: 110, d: 0.55, s: 70, sp: 30, dir: 1, src: "/subjects-universe/tumanyan.jpg" },
      { shape: "portrait", t: "Եղիշե Չարենց", r: 210, a: 200, d: 0.4, s: 64, sp: 38, dir: -1, behind: true, src: "/subjects-universe/charents.jpeg" },
      { icon: "manuscript", t: "ձեռագիր", r: 145, a: 250, d: 0.4, s: 30, sp: 34, dir: 1, shape: "icon", behind: true },
      { t: "Ճանաչել զիմաստութիւն եւ զխրատ, իմանալ զբանս հանճարոյ", r: 260, a: 60, d: 0.85, s: 16, sp: 54, dir: 1, shape: "pill", big: true, wrap: true, maxW: 280 },
    ],
  },
  {
    id: "physics",
    index: "04",
    nameNative: "Ֆիզիկա",
    seed: 27,
    accent: "#8a6cff",
    accent2: "#ff8a4c",
    fieldStrength: 1,
    centralType: "blackhole",
    linkKey: "physics",
    items: [
      { shape: "latex", tex: "G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}", r: 260, a: 20, d: 0.85, s: 16, sp: 56, dir: 1, big: true },
      { shape: "latex", tex: "i\\hbar \\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)", r: 240, a: 200, d: 0.8, s: 16, sp: 50, dir: -1, big: true },
      { t: "c = 299,792,458 m/s", r: 150, a: 80, d: 0.75, s: 18, sp: 24, dir: 1, shape: "pill" },
      { t: "G", r: 140, a: 320, d: 0.6, s: 34, sp: 24, dir: -1, shape: "glyph" },
      { t: "h", r: 100, a: 150, d: 0.4, s: 30, sp: 16, dir: 1, shape: "glyph", behind: true },
      { t: "ħ", r: 170, a: 260, d: 0.55, s: 32, sp: 30, dir: -1, shape: "glyph" },
      { shape: "clock", r: 200, a: 110, d: 0.5, s: 34, sp: 40, dir: 1 },
    ],
  },
  {
    id: "chemistry",
    index: "05",
    nameNative: "Քիմիա",
    seed: 35,
    accent: "#4fd1c5",
    accent2: "#8fe8de",
    fieldStrength: 0.5,
    centralType: "atom",
    linkKey: "chemistry",
    items: [
      { t: "Nₐ = 6.022×10²³", r: 260, a: 30, d: 0.85, s: 19, sp: 54, dir: 1, shape: "pill", big: true },
      { t: "H₂O", r: 120, a: 100, d: 0.7, s: 24, sp: 20, dir: -1, shape: "pill" },
      { t: "CO₂", r: 170, a: 200, d: 0.5, s: 22, sp: 30, dir: 1, shape: "pill", behind: true },
      { t: "CH₄", r: 220, a: 290, d: 0.4, s: 22, sp: 40, dir: -1, shape: "pill", behind: true },
      { shape: "latex", tex: "PV = Nk_BT", r: 180, a: 340, d: 0.75, s: 17, sp: 26, dir: 1 },
      { shape: "latex", tex: "{}^{227}_{90}Th \\rightarrow {}^{223}_{88}Ra + \\alpha", r: 210, a: 150, d: 0.55, s: 16, sp: 34, dir: -1 },
      { icon: "flask", t: "flask", r: 200, a: 60, d: 0.3, s: 28, sp: 44, dir: 1, shape: "icon", behind: true },
      { shape: "portrait", t: "Дмитрий Менделеев", r: 240, a: 170, d: 0.6, s: 66, sp: 36, dir: -1, src: "/subjects-universe/mendeleev.png" },
    ],
  },
  {
    id: "biology",
    index: "06",
    nameNative: "Կենսաբանություն",
    seed: 43,
    accent: "#57b56a",
    accent2: "#a8dba0",
    fieldStrength: 0.45,
    centralType: "glyph",
    glyphChar: "⚕",
    linkKey: "biology",
    items: [
      { t: "DNA", r: 180, a: 60, d: 0.7, s: 26, sp: 28, dir: 1, shape: "pill" },
      { t: "ATP", r: 230, a: 220, d: 0.5, s: 22, sp: 36, dir: -1, shape: "pill", behind: true },
      { t: "RNA", r: 150, a: 340, d: 0.6, s: 22, sp: 24, dir: 1, shape: "pill" },
    ],
  },
  {
    id: "geography",
    index: "07",
    nameNative: "Աշխարհագրություն",
    seed: 51,
    accent: "#4a90d9",
    accent2: "#d9c08f",
    fieldStrength: 0.5,
    centralType: "glyph",
    glyphChar: "⊕",
    items: [
      { icon: "mountain", t: "mountain", r: 200, a: 70, d: 0.7, s: 40, sp: 30, dir: 1, shape: "icon" },
      { t: "⊕", r: 150, a: 250, d: 0.8, s: 40, sp: 20, dir: -1, shape: "glyph" },
      { t: "45°N, 40°E", r: 250, a: 180, d: 0.4, s: 18, sp: 44, dir: 1, shape: "pill", behind: true },
    ],
  },
  {
    id: "armhistory",
    index: "08",
    nameNative: "Հայոց պատմություն",
    seed: 59,
    accent: "#a8433f",
    accent2: "#c9a24b",
    fieldStrength: 0.6,
    centralType: "medallion",
    medallionStyle: "coin",
    personLabel: "Տիգրան Մեծ",
    portraitSrc: "/subjects-universe/tigran.jpeg",
    items: [
      { icon: "khachkar", t: "խաչքար", r: 160, a: 220, d: 0.55, s: 30, sp: 30, dir: 1, shape: "icon" },
      { shape: "portrait", t: "Վազգեն Սարգսյան", r: 260, a: 60, d: 0.9, s: 50, sp: 54, dir: 1, src: "/subjects-universe/vazgen.jpeg" },
      { t: "1915", r: 240, a: 150, d: 0.85, s: 40, sp: 48, dir: -1, shape: "pill", big: true, bloody: true },
    ],
  },
  {
    id: "russian",
    index: "09",
    nameNative: "Ռուսաց լեզու",
    seed: 67,
    accent: "#3f5fae",
    accent2: "#9a3b46",
    fieldStrength: 0.4,
    centralType: "medallion",
    medallionStyle: "cameo",
    personLabel: "Александр Пушкин",
    portraitSrc: "/subjects-universe/pushkin.jpeg",
    items: [
      { t: "А Б В", r: 170, a: 120, d: 0.4, s: 30, sp: 30, dir: -1, shape: "glyph", behind: true },
      { icon: "quill", t: "перо", r: 120, a: 200, d: 0.75, s: 30, sp: 20, dir: 1, shape: "icon" },
      { icon: "book", t: "книга", r: 175, a: 280, d: 0.5, s: 28, sp: 32, dir: -1, shape: "icon" },
      { t: "« »", r: 210, a: 60, d: 0.35, s: 36, sp: 42, dir: 1, shape: "glyph", behind: true },
    ],
  },
];
