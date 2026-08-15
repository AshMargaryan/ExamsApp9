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

// Maps a subject key to the practice.Subject.name it corresponds to, for the
// subjects that already have topic-tree practice content. Keys with no entry
// here don't have practice content yet — the hub shows "coming soon" instead.
export const PRACTICE_SUBJECT_NAMES: Partial<Record<SubjectKey, string>> = {
  math: "Մաթեմատիկա",
  english: "Անգլերեն",
};
