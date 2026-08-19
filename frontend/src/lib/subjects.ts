export type SubjectKey = "math" | "physics" | "biology" | "chemistry" | "english";

export interface SubjectMeta {
  key: SubjectKey;
  label: string;
  icon: string;
}

export const SUBJECTS: SubjectMeta[] = [
  { key: "math", label: "Մաթեմատիկա", icon: "∑" },
  { key: "physics", label: "Ֆիզիկա", icon: "⚛" },
  { key: "biology", label: "Կենսաբանություն", icon: "🧬" },
  { key: "chemistry", label: "Քիմիա", icon: "⚗" },
  { key: "english", label: "Անգլերեն", icon: "🇬🇧" },
];

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
