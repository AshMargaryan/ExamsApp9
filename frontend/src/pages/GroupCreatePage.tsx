import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import { createGroup, type GroupType, type Weekday } from "../api/groups";
import { SegmentedControl } from "../components/SegmentedControl";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Field";
import { NumberInput } from "../components/ui/NumberInput";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { TimePicker } from "../components/ui/TimePicker";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { cn } from "../lib/cn";
import { SUBJECTS, type SubjectKey } from "../lib/subjects";

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
  // Two separate messages, because they belong to two different fields: a
  // form-level alert would put "the end time must be later" at the bottom of
  // the page, away from the pair of pickers that produced it.
  const [titleError, setTitleError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function handleTypeChange(next: GroupType) {
    setType(next);
    if (!maxMembersTouched) setMaxMembers(DEFAULT_MAX_MEMBERS[next]);
  }

  async function handleSubmit() {
    setTitleError(!title.trim() ? "Վերնագիրը պարտադիր է։" : null);
    setTimeError(endTime <= startTime ? "Ավարտը պետք է լինի սկզբից ուշ։" : null);
    if (!title.trim() || endTime <= startTime) return;
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
      <PageHeader
        title="Ստեղծել նոր խումբ"
        back={{ to: "/groups", label: "Խմբեր" }}
        description="Ընտրիր օրը և ժամը, որ մյուսներն իմանան, թե երբ եք հանդիպում։"
      />

      <label className="mb-[var(--space-1)] block text-[length:var(--text-sm)] font-medium text-text">
        Տեսակ
      </label>
      <SegmentedControl options={TYPE_OPTIONS} value={type} onChange={handleTypeChange} className="mb-6 w-fit" />

      <Field
        label="Վերնագիր"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Օր.՝ Հանրահաշվի կրկնուսույց"
        error={titleError}
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
            <s.Icon size={15} strokeWidth={1.75} aria-hidden />
            {s.label}
          </button>
        ))}
      </div>

      <Field label="Նկարագրություն (կամընտիր)">
        {(control) => (
          <textarea
            {...control}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Ինչի՞ մասին է խումբը, ինչ մակարդակի համար է…"
            className={cn(control.className, "resize-none")}
          />
        )}
      </Field>

      <Field label="Օր">
        {(control) => (
          <Select<string>
            id={control.id}
            value={String(scheduleDay)}
            onChange={(next) => setScheduleDay(Number(next) as Weekday)}
            options={WEEKDAY_OPTIONS.map((d) => ({ value: String(d.value), label: d.label }))}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-[var(--space-4)]">
        <Field label="Սկիզբ">
          {(control) => <TimePicker id={control.id} value={startTime} onChange={setStartTime} clearable={false} />}
        </Field>
        <Field label="Ավարտ" error={timeError}>
          {(control) => <TimePicker id={control.id} value={endTime} onChange={setEndTime} clearable={false} />}
        </Field>
      </div>

      <Field label="Առավելագույն անդամների քանակ" containerClassName="mb-6">
        {(control) => (
          <NumberInput
            id={control.id}
            value={maxMembers}
            min={2}
            max={100}
            onChange={(next) => {
              setMaxMembersTouched(true);
              setMaxMembers(next ?? 2);
            }}
          />
        )}
      </Field>

      <Button onClick={handleSubmit} loading={busy} className="w-full">
        Ստեղծել խումբ
      </Button>
    </div>
  );
}
