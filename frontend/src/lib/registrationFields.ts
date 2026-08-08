import { searchSchools, searchUniversities } from "../api/schools";
import type { AccountRole } from "../api/auth";

export const GRADES = Array.from({ length: 12 }, (_, i) => 12 - i);

export interface Option {
  id: number;
  label: string;
  sublabel?: string;
}

export const ROLE_CARDS: { role: AccountRole; icon: string; title: string; description: string }[] = [
  {
    role: "student",
    icon: "🎓",
    title: "Աշակերտ",
    description: "Ես ուզում եմ սովորել և պատրաստվել քննություններին",
  },
  {
    role: "teacher",
    icon: "🧑‍🏫",
    title: "Ուսուցիչ",
    description: "Ես ուզում եմ դասավանդել և հետևել աշակերտների առաջընթացին",
  },
  {
    role: "parent",
    icon: "👨‍👩‍👧",
    title: "Ծնող",
    description: "Ես ուզում եմ հետևել իմ երեխայի առաջընթացին",
  },
];

export const ROLE_LABELS: Record<AccountRole, string> = {
  student: "Աշակերտ",
  teacher: "Ուսուցիչ",
  parent: "Ծնող",
};

export async function schoolSearch(q: string): Promise<Option[]> {
  const results = await searchSchools(q);
  return results.map((s) => ({ id: s.id, label: s.name, sublabel: s.marz }));
}

export async function universitySearch(q: string): Promise<Option[]> {
  const results = await searchUniversities(q);
  return results.map((u) => ({ id: u.id, label: u.name }));
}
