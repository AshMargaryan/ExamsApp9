import { Atom, BookMarked, Dna, FlaskConical, Languages, Sigma, type LucideIcon } from "lucide-react";

export type SubjectKey = "math" | "physics" | "biology" | "chemistry" | "english";

export interface SubjectMeta {
  key: SubjectKey;
  label: string;
  /*
    A lucide component, not a glyph.

    These were `"∑" | "⚛" | "🧬" | "⚗" | "🇬🇧"` — five characters from three
    different worlds. The first two are mathematical symbols that render in
    the text font at the text colour; the next two are colour emoji that pick
    up per-platform artwork and weight; the last is a *flag*, which stands for
    a country rather than a subject and is the one glyph on the list that some
    platforms refuse to draw at all. Rendered side by side in a subject
    filter, as they were on mock exams, flashcards, groups and the learning
    profile, the row read as five unrelated things.

    One field feeds thirteen call sites across seven surfaces, so this is the
    single highest-leverage place in the codebase to fix the icon language.
  */
  Icon: LucideIcon;
}

export const SUBJECTS: SubjectMeta[] = [
  { key: "math", label: "Մաթեմատիկա", Icon: Sigma },
  { key: "physics", label: "Ֆիզիկա", Icon: Atom },
  { key: "biology", label: "Կենսաբանություն", Icon: Dna },
  { key: "chemistry", label: "Քիմիա", Icon: FlaskConical },
  { key: "english", label: "Անգլերեն", Icon: Languages },
];

/** The icon for a subject named in either language, with a neutral fallback
 *  for anything unmapped — a mistake logged against a subject the frontend
 *  does not know still needs something to draw. */
export function subjectIconForName(name: string | undefined): LucideIcon {
  return subjectMetaForName(name)?.Icon ?? BookMarked;
}

export function subjectMeta(key: string | undefined): SubjectMeta | undefined {
  return SUBJECTS.find((s) => s.key === key);
}

/*
  Some rows snapshot a subject's *English* display label rather than its key:
  MistakeEntry.subject_name stores `exam.get_subject_display()` /
  `deck.get_subject_display()` for mock-exam and flashcard mistakes, which is
  "Mathematics", while practice mistakes store "Մաթեմատիկա". The result is an
  Armenian interface reading "Mathematics · Հանրահաշվական նույնություններ".

  These map a stored name — in either language — back to the canonical
  subject, purely for display. Never use the localized string for filtering or
  links: the API matches on the raw stored value, so a request for
  "Մաթեմատիկա" would return nothing for a mock-exam mistake.
*/
const ENGLISH_SUBJECT_LABELS: Record<string, SubjectKey> = {
  Mathematics: "math",
  Physics: "physics",
  Biology: "biology",
  Chemistry: "chemistry",
  English: "english",
};

export function subjectMetaForName(name: string | undefined): SubjectMeta | undefined {
  if (!name) return undefined;
  const byArmenian = SUBJECTS.find((s) => s.label === name);
  if (byArmenian) return byArmenian;
  const key = ENGLISH_SUBJECT_LABELS[name];
  return key ? SUBJECTS.find((s) => s.key === key) : undefined;
}

/** Display-only: the Armenian label for a stored subject name, falling back to
 *  the raw name for anything unmapped. */
export function localizeSubjectName(name: string | undefined): string {
  return subjectMetaForName(name)?.label ?? name ?? "";
}

// Maps a subject key to the practice.Subject.name it corresponds to, for the
// subjects that already have topic-tree practice content. Keys with no entry
// here don't have practice content yet — the hub shows "coming soon" instead.
export const PRACTICE_SUBJECT_NAMES: Partial<Record<SubjectKey, string>> = {
  math: "Մաթեմատիկա",
  english: "Անգլերեն",
  physics: "Ֆիզիկա",
};
