import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import { createGroup, type GroupType, type Weekday } from "../api/groups";
import { SegmentedControl } from "../components/SegmentedControl";
import { Button } from "../components/ui/Button";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { SUBJECTS, type SubjectKey } from "../lib/subjects";
import { LinkButton } from "../components/ui/LinkButton";

const typeIconProps = { size: 14, strokeWidth: 1.75 };

const TYPE_OPTIONS: { value: GroupType; label: ReactNode }[] = [
  { value: "study_group", label: <><Users {...typeIconProps} /> Ուսումնական խումբ</> },
  { value: "tutoring", label: <><GraduationCap {...typeIconProps} /> Կրկնուսուցում</> },
];

const WEEKDAY_OPTIONS: { value: Weekday; label: string }[] = [
  { value: 0, label: "Երկուշաբթի" },
  { value: 1, label: "Երեքշաբթի" },
  { value: 2, label: "Չորեքշաբթի" },
  { value: 3, label: "Հինգշաբթի" },
  { value: 4, label: "Ուրբաթ" },
  { value: 5, label: "Շաբաթ" },
  { value: 6, label: "Կիրակի" },
];

const DEFAULT_MAX_MEMBERS: Record<GroupType, number> = { study_group: 10, tutoring: 2 };

export function GroupCreatePage() {
  const navigate = useNavigate();
  const { showError } = useToast();

  const [type, setType] = useState<GroupType>("study_group");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState<SubjectKey>("math");
  const [description, setDescription] = useState("");
  const [scheduleDay, setScheduleDay] = useState<Weekday>(0);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:00");
  const [maxMembers, setMaxMembers] = useState(DEFAULT_MAX_MEMBERS.study_group);
  const [maxMembersTouched, setMaxMembersTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleTypeChange(next: GroupType) {
    setType(next);
    if (!maxMembersTouched) setMaxMembers(DEFAULT_MAX_MEMBERS[next]);
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setError("Վերնագիրը պարտադիր է։");
      return;
    }
    if (endTime <= startTime) {
      setError("Ավարտի ժամանակը պետք է լինի սկզբի ժամանակից ուշ։");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const group = await createGroup({
        title: title.trim(),
        subject,
        type,
        description: description.trim(),
        schedule_day: scheduleDay,
        schedule_start_time: startTime,
        schedule_end_time: endTime,
        max_members: maxMembers,
      });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <LinkButton to="/groups" className="mb-4">← Խմբեր</LinkButton>
      <h1 className="mb-6 text-3xl font-semibold text-text">Ստեղծել նոր խումբ</h1>

      <label className="mb-1.5 block text-sm font-medium text-text">Տեսակ</label>
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={handleTypeChange} className="mb-6 w-fit" />

      <label className="mb-1.5 block text-sm font-medium text-text">Վերնագիր</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Օր.՝ Հանրահաշվի կրկնուսույց"
        className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
      />

      <label className="mb-1.5 block text-sm font-medium text-text">Առարկա</label>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSubject(s.key)}
            className={`btn-fx flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium ${
              subject === s.key
                ? "border-primary bg-primary text-primary-contrast"
                : "border-border text-text hover:border-primary"
            }`}
          >
            <span aria-hidden>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      <label className="mb-1.5 block text-sm font-medium text-text">Նկարագրություն (կամընտիր)</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Ինչի՞ մասին է խումբը, ինչ մակարդակի համար է…"
        className="mb-4 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
      />

      <label className="mb-1.5 block text-sm font-medium text-text">Օր</label>
      <select
        value={scheduleDay}
        onChange={(e) => setScheduleDay(Number(e.target.value) as Weekday)}
        className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
      >
        {WEEKDAY_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <div className="mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Սկիզբ</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Ավարտ</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <label className="mb-1.5 block text-sm font-medium text-text">Առավելագույն անդամների քանակ</label>
      <input
        type="number"
        min={2}
        max={100}
        value={maxMembers}
        onChange={(e) => {
          setMaxMembersTouched(true);
          setMaxMembers(Number(e.target.value));
        }}
        className="mb-6 w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
      />

      {error && <p className="mb-4 text-sm text-incorrect">{error}</p>}

      <Button onClick={handleSubmit} loading={busy} className="w-full">
        Ստեղծել խումբ
      </Button>
    </div>
  );
}
