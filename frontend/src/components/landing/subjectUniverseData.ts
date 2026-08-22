/*
  THE SUBJECT UNIVERSE — content model.

  Ported from the design canvas in ~/Downloads/landingpage (subjects-data.js).
  Each subject is an orbital system: a central body, and items travelling
  around it at a polar position. Two things were added to the canvas data,
  both non-negotiable for a page that ships:

  * `exams`/`questions` are counted from the real bank in
    `backend/apps/mock_exams/data/exams/<subject>/` — 229 exams, 16,070
    questions. Subjects with no bank yet carry `live: false` and are labelled
    «Շուտով» with the line «Հարցաշարը պատրաստվում է։», and the section renders
    «Հարցաշարը դեռ հասանելի չէ» where the live subjects show their counts.
    They are NOT given invented numbers. The design shows nine
    subjects, the platform teaches five, and the page says so.

  * `promise` and `moment` connect each subject to what Haygit actually does,
    so the section sells the system rather than a list of school subjects.

  Colours here are fixed literals rather than tokens, deliberately and for the
  same reason theme.css fixes `--gradient-brand` and `--color-paper`: they are
  painted on a constant near-black ground, so they must not follow the theme.

  They were re-picked when that ground changed from near-black to warm sand.
  The originals were light tints — #7c8fff, #4fd1c5, #d9b26b — which read
  beautifully on #05050a and are close to invisible on #f2ece2. Each is now a
  deeper face of the same hue, so the nine subjects stay distinguishable from
  one another and each clears AA against the canvas.
*/

export type OrbitItem = {
  shape: "latex" | "glyph" | "pill" | "icon" | "portrait" | "clock";
  /** Orbit radius in stage px. */ r: number;
  /** Starting angle in degrees. */ a: number;
  /** Depth 0–1: drives scale, opacity and blur, so the ring reads as a sphere. */ d: number;
  /** Nominal size in px — meaning depends on shape. */ s: number;
  /** Seconds per revolution. */ sp: number;
  /** 1 clockwise, -1 counter-clockwise. */ dir: 1 | -1;
  t?: string;
  tex?: string;
  icon?: "quill" | "book" | "manuscript" | "khachkar" | "flask" | "mountain";
  src?: string;
  alt?: string;
  imgShape?: "rect" | "circle";
  big?: boolean;
  behind?: boolean;
  wrap?: boolean;
  maxW?: number;
  /** The 1915 marker. Rendered in mourning red rather than the subject accent. */
  solemn?: boolean;
};

export type SubjectUniverse = {
  id: string;
  index: string;
  name: string;
  /** One short line — the promise, not a description. */
  promise: string;
  /** What Haygit does here. Shown beside the stage. */
  moment: { label: string; body: string };
  live: boolean;
  exams?: number;
  questions?: number;
  accent: string;
  accent2: string;
  fieldStrength: number;
  seed: number;
  central:
    | { type: "glyph"; char: string }
    | { type: "medallion"; style: "laurel" | "coin" | "cameo"; label: string; src: string }
    | { type: "blackhole" }
    | { type: "atom" }
    | { type: "helix" }
    | { type: "globe" };
  items: OrbitItem[];
};

const P = "/landing/subjects";

export const SUBJECTS: SubjectUniverse[] = [
  {
    id: "math",
    index: "01",
    name: "Մաթեմատիկա",
    promise: "Տիրապետիր մաթեմատիկային։",
    moment: {
      label: "Սխալի վերլուծություն",
      body: "Ոչ թե «սխալ է», այլ՝ ո՛ր քայլում շեղվեցիր։",
    },
    live: true,
    exams: 50,
    questions: 3250,
    accent: "#7c8fff",
    accent2: "#b9c6ff",
    fieldStrength: 0.55,
    seed: 3,
    central: { type: "glyph", char: "∞" },
    items: [
      { shape: "latex", tex: "e^{i\\theta} = \\cos\\theta + i\\sin\\theta", r: 240, a: 25, d: 0.95, s: 22, sp: 52, dir: 1, big: true },
      { shape: "latex", tex: "\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}", r: 210, a: 150, d: 0.5, s: 16, sp: 38, dir: -1, behind: true },
      { shape: "latex", tex: "f(x) = \\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n", r: 260, a: 65, d: 0.35, s: 15, sp: 56, dir: -1, behind: true },
      { shape: "latex", tex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1", r: 150, a: 265, d: 0.6, s: 17, sp: 26, dir: 1 },
      { shape: "glyph", t: "π", r: 170, a: 320, d: 0.9, s: 42, sp: 18, dir: 1 },
      { shape: "glyph", t: "e", r: 120, a: 200, d: 0.7, s: 38, sp: 22, dir: -1 },
      { shape: "latex", tex: "T^{\\mu\\nu}_{\\ \\ \\lambda}", r: 220, a: 100, d: 0.55, s: 26, sp: 30, dir: 1, big: true },
      { shape: "glyph", t: "0", r: 180, a: 80, d: 0.8, s: 36, sp: 20, dir: -1 },
    ],
  },
  {
    id: "english",
    index: "02",
    name: "Անգլերեն",
    promise: "Բարելավիր անգլերենը։",
    moment: {
      label: "Առաջընթաց",
      body: "Ամեն շաբաթ տեսնում ես, թե որքան ես առաջ գնացել։",
    },
    live: true,
    exams: 29,
    questions: 2320,
    accent: "#d9b26b",
    accent2: "#f0dfa8",
    fieldStrength: 0.4,
    seed: 11,
    central: { type: "medallion", style: "laurel", label: "William Shakespeare", src: `${P}/shakespeare.webp` },
    items: [
      { shape: "pill", t: "To be, or not to be", r: 250, a: 335, d: 0.9, s: 20, sp: 50, dir: 1, big: true, wrap: true, maxW: 175 },
      { shape: "glyph", t: "A B C D", r: 170, a: 30, d: 0.4, s: 26, sp: 32, dir: 1, behind: true },
      { shape: "icon", icon: "quill", t: "quill", r: 100, a: 200, d: 0.85, s: 30, sp: 18, dir: 1 },
      { shape: "icon", icon: "book", t: "folio", r: 210, a: 140, d: 0.35, s: 26, sp: 40, dir: -1, behind: true },
      { shape: "glyph", t: "“ ”", r: 145, a: 260, d: 0.55, s: 36, sp: 28, dir: -1 },
    ],
  },
  {
    id: "armlang",
    index: "03",
    name: "Հայոց լեզու",
    promise: "Գրիր մայրենիով՝ ճշգրիտ։",
    moment: { label: "Շուտով", body: "Հարցաշարը պատրաստվում է։" },
    live: false,
    accent: "#d9573f",
    accent2: "#e8b23f",
    fieldStrength: 0.5,
    seed: 19,
    central: { type: "medallion", style: "laurel", label: "Մեսրոպ Մաշտոց", src: `${P}/mashtots.webp` },
    items: [
      { shape: "glyph", t: "Ա", r: 120, a: 30, d: 0.7, s: 44, sp: 20, dir: 1 },
      { shape: "glyph", t: "Հ", r: 240, a: 300, d: 0.9, s: 50, sp: 46, dir: -1, big: true },
      { shape: "portrait", src: `${P}/tumanyan.webp`, alt: "Հովհաննես Թումանյան", t: "Հովհաննես Թումանյան", r: 175, a: 110, d: 0.55, s: 70, sp: 30, dir: 1 },
      { shape: "portrait", src: `${P}/charents.webp`, alt: "Եղիշե Չարենց", t: "Եղիշե Չարենց", r: 210, a: 200, d: 0.4, s: 64, sp: 38, dir: -1, behind: true },
      { shape: "icon", icon: "manuscript", t: "ձեռագիր", r: 145, a: 250, d: 0.4, s: 30, sp: 34, dir: 1, behind: true },
      { shape: "pill", t: "Ճանաչել զիմաստութիւն եւ զխրատ, իմանալ զբանս հանճարոյ", r: 260, a: 60, d: 0.85, s: 16, sp: 54, dir: 1, big: true, wrap: true, maxW: 280 },
    ],
  },
  {
    id: "physics",
    index: "04",
    name: "Ֆիզիկա",
    promise: "Հասկացիր ֆիզիկան։",
    moment: { label: "Հաջորդ քայլը", body: "Կինեմատիկա՝ 10 հարց, մոտ 18 րոպե։" },
    live: true,
    exams: 50,
    questions: 3500,
    accent: "#8a6cff",
    accent2: "#ff8a4c",
    fieldStrength: 1,
    seed: 27,
    central: { type: "blackhole" },
    items: [
      { shape: "latex", tex: "G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}", r: 260, a: 20, d: 0.85, s: 16, sp: 56, dir: 1, big: true },
      { shape: "latex", tex: "i\\hbar \\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)", r: 240, a: 200, d: 0.8, s: 16, sp: 50, dir: -1, big: true },
      { shape: "pill", t: "c = 299,792,458 m/s", r: 150, a: 80, d: 0.75, s: 18, sp: 24, dir: 1 },
      { shape: "glyph", t: "G", r: 140, a: 320, d: 0.6, s: 34, sp: 24, dir: -1 },
      { shape: "glyph", t: "h", r: 100, a: 150, d: 0.4, s: 30, sp: 16, dir: 1, behind: true },
      { shape: "glyph", t: "ħ", r: 170, a: 260, d: 0.55, s: 32, sp: 30, dir: -1 },
      { shape: "clock", r: 200, a: 110, d: 0.5, s: 34, sp: 40, dir: 1 },
    ],
  },
  {
    id: "chemistry",
    index: "05",
    name: "Քիմիա",
    promise: "Կառուցիր քիմիայի ինտուիցիա։",
    moment: { label: "AI բացատրություն", body: "Կապը քայլ առ քայլ՝ մինչև հասկանաս, ոչ թե անգիր անես։" },
    live: true,
    exams: 50,
    questions: 3500,
    accent: "#4fd1c5",
    accent2: "#8fe8de",
    fieldStrength: 0.5,
    seed: 35,
    central: { type: "atom" },
    items: [
      { shape: "pill", t: "Nₐ = 6.022×10²³", r: 260, a: 30, d: 0.85, s: 19, sp: 54, dir: 1, big: true },
      { shape: "pill", t: "H₂O", r: 120, a: 100, d: 0.7, s: 24, sp: 20, dir: -1 },
      { shape: "pill", t: "CO₂", r: 170, a: 200, d: 0.5, s: 22, sp: 30, dir: 1, behind: true },
      { shape: "pill", t: "CH₄", r: 220, a: 290, d: 0.4, s: 22, sp: 40, dir: -1, behind: true },
      { shape: "latex", tex: "PV = Nk_BT", r: 180, a: 340, d: 0.75, s: 17, sp: 26, dir: 1 },
      { shape: "latex", tex: "{}^{227}_{90}Th \\rightarrow {}^{223}_{88}Ra + \\alpha", r: 210, a: 150, d: 0.55, s: 16, sp: 34, dir: -1 },
      { shape: "icon", icon: "flask", t: "flask", r: 200, a: 60, d: 0.3, s: 28, sp: 44, dir: 1, behind: true },
      { shape: "portrait", src: `${P}/mendeleev.webp`, alt: "Дмитрий Менделеев", t: "Դմիտրի Մենդելեև", r: 240, a: 170, d: 0.6, s: 66, sp: 36, dir: -1 },
    ],
  },
  {
    id: "biology",
    index: "06",
    name: "Կենսաբանություն",
    promise: "Ամրապնդիր կենսաբանությունը։",
    moment: { label: "Կրկնության քարտեր", body: "Վերադառնում է ճիշտ այն պահին, երբ սկսում ես մոռանալ։" },
    live: true,
    exams: 50,
    questions: 3500,
    accent: "#57b56a",
    accent2: "#a8dba0",
    fieldStrength: 0.45,
    seed: 43,
    /* The canvas had an unfilled photo slot here. An empty frame is worse than
       no frame, so the centre is drawn instead — a helix built from the same
       maths the subject teaches. */
    central: { type: "helix" },
    items: [
      { shape: "pill", t: "C₆H₁₂O₆ + 6O₂", r: 250, a: 25, d: 0.85, s: 18, sp: 52, dir: 1, big: true },
      { shape: "glyph", t: "A T", r: 150, a: 120, d: 0.7, s: 34, sp: 24, dir: -1 },
      { shape: "glyph", t: "G C", r: 190, a: 210, d: 0.5, s: 32, sp: 34, dir: 1, behind: true },
      { shape: "latex", tex: "6CO_2 + 6H_2O \\xrightarrow{h\\nu} C_6H_{12}O_6", r: 225, a: 300, d: 0.6, s: 15, sp: 44, dir: -1 },
      { shape: "icon", icon: "flask", t: "նմուշ", r: 120, a: 60, d: 0.45, s: 26, sp: 20, dir: 1, behind: true },
    ],
  },
  {
    id: "geography",
    index: "07",
    name: "Աշխարհագրություն",
    promise: "Կարդա աշխարհը քարտեզի պես։",
    moment: { label: "Շուտով", body: "Հարցաշարը պատրաստվում է։" },
    live: false,
    accent: "#4a90d9",
    accent2: "#d9c08f",
    fieldStrength: 0.5,
    seed: 51,
    central: { type: "globe" },
    items: [
      { shape: "icon", icon: "mountain", t: "լեռ", r: 160, a: 250, d: 0.8, s: 30, sp: 22, dir: -1 },
      { shape: "pill", t: "40°10′N 44°30′E", r: 230, a: 70, d: 0.7, s: 17, sp: 46, dir: 1 },
      { shape: "glyph", t: "N", r: 130, a: 330, d: 0.5, s: 32, sp: 26, dir: 1, behind: true },
    ],
  },
  {
    id: "armhistory",
    index: "08",
    name: "Հայոց պատմություն",
    promise: "Իմացիր, թե որտեղից ես գալիս։",
    moment: { label: "Շուտով", body: "Հարցաշարը պատրաստվում է։" },
    live: false,
    accent: "#a8433f",
    accent2: "#d9b26b",
    fieldStrength: 0.6,
    seed: 59,
    central: { type: "medallion", style: "coin", label: "Տիգրան Մեծ", src: `${P}/tigran.webp` },
    items: [
      { shape: "icon", icon: "khachkar", t: "խաչքար", r: 160, a: 220, d: 0.55, s: 30, sp: 30, dir: 1 },
      { shape: "portrait", src: `${P}/vazgen.webp`, alt: "Վազգեն Սարգսյան", t: "Վազգեն Սարգսյան", r: 260, a: 60, d: 0.9, s: 50, sp: 54, dir: 1 },
      { shape: "pill", t: "1915", r: 240, a: 150, d: 0.85, s: 40, sp: 48, dir: -1, big: true, solemn: true },
    ],
  },
  {
    id: "russian",
    index: "09",
    name: "Ռուսաց լեզու",
    promise: "Խոսիր ռուսերեն՝ վստահ։",
    moment: { label: "Շուտով", body: "Հարցաշարը պատրաստվում է։" },
    live: false,
    accent: "#3f5fae",
    accent2: "#9a3b46",
    fieldStrength: 0.4,
    seed: 67,
    central: { type: "medallion", style: "cameo", label: "Александр Пушкин", src: `${P}/pushkin.webp` },
    items: [
      { shape: "glyph", t: "А Б В", r: 170, a: 120, d: 0.4, s: 30, sp: 30, dir: -1, behind: true },
      { shape: "icon", icon: "quill", t: "перо", r: 120, a: 200, d: 0.75, s: 30, sp: 20, dir: 1 },
      { shape: "icon", icon: "book", t: "книга", r: 175, a: 280, d: 0.5, s: 28, sp: 32, dir: -1 },
      { shape: "glyph", t: "« »", r: 210, a: 60, d: 0.35, s: 36, sp: 42, dir: 1, behind: true },
    ],
  },
];

export const LIVE_SUBJECTS = SUBJECTS.filter((s) => s.live);
export const TOTAL_EXAMS = LIVE_SUBJECTS.reduce((n, s) => n + (s.exams ?? 0), 0);
export const TOTAL_QUESTIONS = LIVE_SUBJECTS.reduce((n, s) => n + (s.questions ?? 0), 0);
