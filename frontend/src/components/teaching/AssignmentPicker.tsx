import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { listMockExams } from "../../api/mockExams";
import type { MockExamSummary } from "../../api/mockExams";
import { getHierarchy } from "../../api/practice";
import type { SubjectNode } from "../../api/practice";
import * as teachingApi from "../../api/teaching";
import type { AssignmentType, StudentRosterEntry } from "../../api/teaching";
import { useToast, extractErrorMessage } from "../../context/ToastContext";
import { SegmentedControl } from "../SegmentedControl";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";

/*
  Replaces the old flat form of native <select> dropdowns with a focused
  two-step flow: pick the content (skipped entirely when opened with
  `presetContent` — the "I'm looking at this subtopic, assign it" case), then
  pick one or more students from a searchable avatar grid instead of a single
  <select>. Assigning to several students in one action is a real capability
  the old form didn't have, implemented as a client-side loop over the
  existing single-student createAssignment() call — the backend already
  accepts exactly the fields this sends, no API change needed.
*/

export interface PresetContent {
  assignment_type: AssignmentType;
  id: number;
  label: string;
}

interface ContentOption {
  id: number;
  label: string;
}

function flattenContent(subjects: SubjectNode[], type: AssignmentType): ContentOption[] {
  if (type === "topic") {
    return subjects.flatMap((s) =>
      s.domains.flatMap((d) => d.topics.map((t) => ({ id: t.id, label: `${s.name} / ${d.name} / ${t.name}` }))),
    );
  }
  return subjects.flatMap((s) =>
    s.domains.flatMap((d) =>
      d.topics.flatMap((t) =>
        t.subtopics.map((sub) => ({ id: sub.id, label: `${s.name} / ${d.name} / ${t.name} / ${sub.name}` })),
      ),
    ),
  );
}

const CONTENT_TABS: { value: AssignmentType; label: string }[] = [
  { value: "subtopic", label: "Ենթաթեմա" },
  { value: "topic", label: "Թեմա" },
  { value: "mock_exam", label: "Ամբողջական թեստ" },
];

export function AssignmentPicker({
  open,
  onOpenChange,
  roster,
  presetContent,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: StudentRosterEntry[];
  /** Skips the content step entirely — the contextual "assign this" case. */
  presetContent?: PresetContent;
  onAssigned?: () => void;
}) {
  const { showSuccess, showError } = useToast();

  const [step, setStep] = useState<"content" | "students">(presetContent ? "students" : "content");
  const [contentType, setContentType] = useState<AssignmentType>(presetContent?.assignment_type ?? "subtopic");
  const [selectedContent, setSelectedContent] = useState<ContentOption | null>(
    presetContent ? { id: presetContent.id, label: presetContent.label } : null,
  );
  const [contentQuery, setContentQuery] = useState("");
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [mockExams, setMockExams] = useState<MockExamSummary[] | null>(null);

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  const [studentQuery, setStudentQuery] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset to a clean slate each time the picker opens, rather than each time
  // it closes — closing mid-flow (e.g. an accidental Escape) shouldn't lose
  // a student already opened once more.
  useEffect(() => {
    if (!open) return;
    setStep(presetContent ? "students" : "content");
    setContentType(presetContent?.assignment_type ?? "subtopic");
    setSelectedContent(presetContent ? { id: presetContent.id, label: presetContent.label } : null);
    setContentQuery("");
    setSelectedStudentIds(new Set());
    setStudentQuery("");
    setDetailsOpen(false);
    setTitle("");
    setInstructions("");
    setDueDate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || presetContent) return;
    if (contentType === "mock_exam") {
      if (!mockExams) listMockExams().then(setMockExams);
    } else if (!subjects) {
      getHierarchy().then(setSubjects);
    }
  }, [open, presetContent, contentType, subjects, mockExams]);

  const contentOptions = useMemo(() => {
    if (contentType === "mock_exam") {
      return (mockExams ?? []).map((m) => ({ id: m.id, label: m.title }));
    }
    return subjects ? flattenContent(subjects, contentType) : [];
  }, [contentType, subjects, mockExams]);

  const filteredContent = useMemo(() => {
    const q = contentQuery.trim().toLowerCase();
    if (!q) return contentOptions;
    return contentOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [contentOptions, contentQuery]);

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((r) => {
      const name = `${r.student.first_name} ${r.student.last_name} ${r.student.username}`.toLowerCase();
      return name.includes(q);
    });
  }, [roster, studentQuery]);

  function toggleStudent(id: number) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedContent || selectedStudentIds.size === 0) return;
    setSubmitting(true);
    try {
      const dueIso = dueDate ? new Date(dueDate).toISOString() : undefined;
      const results = await Promise.allSettled(
        Array.from(selectedStudentIds).map((studentId) =>
          teachingApi.createAssignment({
            student_id: studentId,
            assignment_type: contentType,
            mock_exam_id: contentType === "mock_exam" ? selectedContent.id : undefined,
            topic_id: contentType === "topic" ? selectedContent.id : undefined,
            subtopic_id: contentType === "subtopic" ? selectedContent.id : undefined,
            title: title.trim() || undefined,
            instructions: instructions.trim() || undefined,
            due_date: dueIso,
          }),
        ),
      );
      const failed = results.filter((r) => r.status === "rejected");
      const succeeded = results.length - failed.length;
      if (succeeded > 0) {
        showSuccess(
          succeeded === 1
            ? "Առաջադրանքն ուղարկվեց։"
            : `Առաջադրանքն ուղարկվեց ${succeeded} աշակերտի։`,
        );
      }
      if (failed.length > 0) {
        const first = failed[0] as PromiseRejectedResult;
        showError(extractErrorMessage(first.reason, `${failed.length} աշակերտի համար չհաջողվեց ուղարկել։`));
      }
      if (succeeded > 0) {
        onAssigned?.();
        onOpenChange(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const footer =
    step === "content" ? (
      <Button
        className="w-full"
        disabled={!selectedContent}
        onClick={() => setStep("students")}
      >
        Շարունակել
      </Button>
    ) : (
      <div className="flex w-full gap-3">
        {!presetContent && (
          <Button variant="secondary" onClick={() => setStep("content")}>
            ← Հետ
          </Button>
        )}
        <Button
          className="flex-1"
          loading={submitting}
          disabled={selectedStudentIds.size === 0}
          onClick={handleSubmit}
        >
          {selectedStudentIds.size <= 1 ? "Հանձնարարել" : `Հանձնարարել ${selectedStudentIds.size} աշակերտի`}
        </Button>
      </div>
    );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={step === "content" ? "Ընտրեք բովանդակությունը" : "Ընտրեք աշակերտներին"}
      description={step === "students" && selectedContent ? selectedContent.label : undefined}
      footer={footer}
      className="max-w-lg"
    >
      {step === "content" ? (
        <div className="flex flex-col gap-3">
          <SegmentedControl
            options={CONTENT_TABS}
            value={contentType}
            onChange={(v) => {
              setContentType(v);
              setSelectedContent(null);
              setContentQuery("");
            }}
          />

          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.75}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              value={contentQuery}
              onChange={(e) => setContentQuery(e.target.value)}
              placeholder="Փնտրել..."
              className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-[var(--radius)] border border-border">
            {contentOptions.length === 0 ? (
              <div className="p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
              </div>
            ) : filteredContent.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-muted">Ոչինչ չի գտնվել։</p>
            ) : (
              filteredContent.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedContent(option)}
                  className={`block w-full border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 transition-colors ${
                    selectedContent?.id === option.id
                      ? "bg-primary/10 text-primary"
                      : "text-text hover:bg-surface-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {roster.length > 3 && (
            <div className="relative">
              <Search
                size={15}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Փնտրել աշակերտի..."
                className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-primary"
              />
            </div>
          )}

          {roster.length === 0 ? (
            <EmptyState
              size="sm"
              title="Դեռ կապակցված աշակերտներ չկան"
              hint="Հրավիրեք աշակերտների՝ առաջադրանք ուղարկելու համար։"
            />
          ) : (
            <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {filteredStudents.map((entry) => {
                const { student } = entry;
                const name = [student.first_name, student.last_name].filter(Boolean).join(" ") || student.username;
                const selected = selectedStudentIds.has(student.id);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    aria-pressed={selected}
                    className={`relative flex flex-col items-center gap-1.5 rounded-[var(--radius)] border p-3 text-center transition-colors ${
                      selected ? "border-primary bg-primary/10" : "border-border hover:border-primary"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-bold ${
                        selected
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border bg-surface text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <Avatar src={student.avatar} name={name} size="md" />
                    <span className="w-full truncate text-xs font-medium text-text">{name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setDetailsOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text"
            >
              <ChevronDown
                size={14}
                strokeWidth={2}
                className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`}
              />
              Մանրամասներ (ընտրովի)
            </button>
            {detailsOpen && (
              <div className="mt-3 flex flex-col gap-2.5">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Վերնագիր"
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary"
                />
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Հաղորդագրություն"
                  className="min-h-16 w-full resize-y rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary"
                />
                <div>
                  <label className="mb-1 block text-xs text-text-muted" htmlFor="assign-picker-due">
                    Վերջնաժամկետ
                  </label>
                  <input
                    id="assign-picker-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full max-w-48 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
