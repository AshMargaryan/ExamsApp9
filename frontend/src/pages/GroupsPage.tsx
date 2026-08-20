import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Search, Users } from "lucide-react";
import { searchGroups, type GroupListItem, type GroupType } from "../api/groups";
import { SegmentedControl } from "../components/SegmentedControl";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { SUBJECTS, subjectMeta, type SubjectKey } from "../lib/subjects";
import { LinkButton } from "../components/ui/LinkButton";

const tabIconProps = { size: 14, strokeWidth: 1.75 };

const TAB_OPTIONS: { value: GroupType; label: ReactNode }[] = [
  { value: "study_group", label: <><Users {...tabIconProps} /> Ուսումնական խմբեր</> },
  { value: "tutoring", label: <><GraduationCap {...tabIconProps} /> Փնտրել կրկնուսույց</> },
];

const WEEKDAY_LABELS = ["Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ", "Կիրակի"];

function formatTime(t: string) {
  return t.slice(0, 5);
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function GroupCard({ group }: { group: GroupListItem }) {
  const subject = subjectMeta(group.subject);
  const full = group.member_count >= group.max_members;

  return (
    <Link
      to={`/groups/${group.id}`}
      className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[var(--shadow-md)]"
    >
      {subject && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium tracking-wide text-text-muted">
          <span aria-hidden>{subject.icon}</span>
          {subject.label}
        </span>
      )}
      <h3 className="text-lg leading-snug font-semibold text-text">{group.title}</h3>
      <p className="text-sm text-text-muted">
        {WEEKDAY_LABELS[group.schedule_day]} · {formatTime(group.schedule_start_time)}–
        {formatTime(group.schedule_end_time)}
      </p>
      <div className="mt-auto flex items-center justify-between text-sm">
        <span className="text-text-muted">
          {[group.leader.first_name, group.leader.last_name].filter(Boolean).join(" ") || group.leader.username}
        </span>
        <span className={full ? "font-medium text-incorrect" : "font-medium text-text"}>
          {group.member_count}/{group.max_members}
        </span>
      </div>
    </Link>
  );
}

export function GroupsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<GroupType>("study_group");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [subject, setSubject] = useState<SubjectKey | null>(null);
  const [groups, setGroups] = useState<GroupListItem[] | null>(null);

  useEffect(() => {
    setGroups(null);
    let cancelled = false;
    searchGroups({ type: tab, q: debouncedQuery || undefined, subject: subject ?? undefined }).then((data) => {
      if (!cancelled) setGroups(data);
    });
    return () => {
      cancelled = true;
    };
  }, [tab, debouncedQuery, subject]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <LinkButton to="/" className="mb-4">← Գլխավոր</LinkButton>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-semibold text-text">Ուսումնական խմբեր և կրկնուսույցներ</h1>
          <p className="text-sm text-text-muted">Միացիր ուսումնական խմբի, կամ գտիր կրկնուսույց քո առարկայից։</p>
        </div>
        <Button onClick={() => navigate("/groups/create")}>+ Ստեղծել</Button>
      </div>

      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} className="mb-6 w-fit" />

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Փնտրել վերնագրով կամ նկարագրությամբ…"
        className="mb-4 w-full rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubject(null)}
          aria-pressed={subject === null}
          className={`btn-fx rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            subject === null
              ? "border-primary bg-primary text-primary-contrast shadow-[var(--shadow-sm)]"
              : "border-border text-text hover:border-primary"
          }`}
        >
          Բոլորը
        </button>
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSubject(s.key)}
            aria-pressed={subject === s.key}
            className={`btn-fx flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              subject === s.key
                ? "border-primary bg-primary text-primary-contrast shadow-[var(--shadow-sm)]"
                : "border-border text-text hover:border-primary"
            }`}
          >
            <span aria-hidden>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {!groups ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[var(--radius)] border border-border bg-surface" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<Search size={26} strokeWidth={1.75} />}
          title="Ոչինչ չի գտնվել"
          hint="Փորձեք այլ ֆիլտր, կամ ստեղծեք առաջին խումբը այս առարկայից։"
          cta={{ label: "Ստեղծել խումբ", onClick: () => navigate("/groups/create") }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
