import { useEffect, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import * as profileApi from "../../api/profile";
import type { GoalPriority, StudentSubjectInterest } from "../../api/profile";
import * as knowledgeApi from "../../api/knowledge";
import type { DataSufficiency, MasteryScore, TopicMasteryScore } from "../../api/knowledge";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { SUBJECTS } from "../../lib/subjects";
import { Button } from "../ui/Button";
import { LinkButton } from "../ui/LinkButton";
import { ProgressBar } from "../ui/ProgressBar";

const SUFFICIENCY_LABELS: Record<DataSufficiency, string> = {
  low: "Քիչ տվյալ",
  medium: "Միջին տվյալ",
  high: "Բավարար տվյալ",
};

const SUFFICIENCY_CLASSES: Record<DataSufficiency, string> = {
  low: "border-border bg-surface-muted text-text-muted",
  medium: "border-primary/40 bg-primary/10 text-primary",
  high: "border-correct/40 bg-correct/10 text-correct",
};

const PRIORITY_LABELS: Record<GoalPriority, string> = {
  low: "Ցածր",
  medium: "Միջին",
  high: "Բարձր",
};

const PRIORITY_CLASSES: Record<GoalPriority, string> = {
  low: "border-border bg-surface-muted text-text-muted",
  medium: "border-primary/40 bg-primary/10 text-primary",
  high: "border-incorrect/40 bg-incorrect/10 text-incorrect",
};

function levelLabel(score: number): string {
  if (score >= 70) return "Առաջադեմ";
  if (score >= 40) return "Միջին";
  return "Սկսնակ";
}

function TopicBreakdown({ subjectKey }: { subjectKey: string }) {
  const [topics, setTopics] = useState<TopicMasteryScore[] | null>(null);
  const { showError } = useToast();

  useEffect(() => {
    knowledgeApi
      .fetchTopicMasteryScores(subjectKey)
      .then(setTopics)
      .catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey]);

  if (topics === null) return <p className="mt-2 text-xs text-text-muted">Բեռնվում է...</p>;
  if (topics.length === 0) {
    return <p className="mt-2 text-xs text-text-muted">Այս առարկայի համար թեմայական տվյալներ դեռ չկան։</p>;
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {topics.map((t) => (
        <div key={t.subtopic} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">{t.topic_name} · {t.subtopic_name}</span>
          <span className="text-text">{t.mastery_score != null ? `${t.mastery_score}%` : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function InterestEditForm({
  interest,
  onSaved,
  onCancel,
}: {
  interest: StudentSubjectInterest;
  onSaved: (updated: StudentSubjectInterest) => void;
  onCancel: () => void;
}) {
  const [priority, setPriority] = useState<GoalPriority>(interest.priority);
  const [targetNote, setTargetNote] = useState(interest.target_note);
  const [saving, setSaving] = useState(false);
  const { showError } = useToast();

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await profileApi.updateSubjectInterest(interest.id, {
        priority,
        target_note: targetNote.trim(),
      });
      onSaved(updated);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text outline-none focus:border-primary";

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <div>
        <label className="mb-1 block text-[11px] text-text-muted">Առաջնահերթություն</label>
        <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as GoalPriority)}>
          {(Object.keys(PRIORITY_LABELS) as GoalPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-text-muted">Նպատակ (ըստ ցանկության)</label>
        <input className={inputClass} value={targetNote} onChange={(e) => setTargetNote(e.target.value)} maxLength={200} placeholder="օր.՝ 90+ միավոր" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-2.5 py-1 text-xs text-text-muted hover:bg-surface-muted">
          Չեղարկել
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "..." : "Պահպանել"}
        </button>
      </div>
    </div>
  );
}

export function SubjectMasteryGrid() {
  const { showError } = useToast();
  const [scores, setScores] = useState<MasteryScore[] | null>(null);
  const [interests, setInterests] = useState<StudentSubjectInterest[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([knowledgeApi.fetchSubjectMasteryScores(), profileApi.fetchSubjectInterests()])
      .then(([s, i]) => {
        setScores(s);
        setInterests(i);
      })
      .catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loaded = scores !== null && interests !== null;
  const scoreByKey = new Map((scores ?? []).map((s) => [s.subject_key, s]));
  const interestByKey = new Map((interests ?? []).map((i) => [i.subject_key, i]));

  function upsertInterest(updated: StudentSubjectInterest) {
    setInterests((prev) => {
      const existing = prev ?? [];
      const idx = existing.findIndex((i) => i.id === updated.id);
      if (idx === -1) return [...existing, updated];
      const next = existing.slice();
      next[idx] = updated;
      return next;
    });
  }

  async function handleFocus(subjectKey: string) {
    setBusyKey(subjectKey);
    try {
      const created = await profileApi.createSubjectInterest({ subject_key: subjectKey, priority: "medium" });
      upsertInterest(created);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleToggleActive(interest: StudentSubjectInterest) {
    setBusyKey(interest.subject_key);
    try {
      const updated = await profileApi.updateSubjectInterest(interest.id, { is_active: !interest.is_active });
      upsertInterest(updated);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(interest: StudentSubjectInterest) {
    setBusyKey(interest.subject_key);
    try {
      await profileApi.deleteSubjectInterest(interest.id);
      setInterests((prev) => (prev ?? []).filter((i) => i.id !== interest.id));
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-text">
        <BookOpen size={16} strokeWidth={1.75} /> Առարկաներ ու իմացության մակարդակ
      </p>
      <p className="mb-4 text-xs text-text-muted">
        Իմացության մակարդակը հաշվարկվում է ձեր վերջին պատասխանների հիման վրա՝ վերջինները ավելի մեծ ազդեցություն ունեն։
      </p>

      {!loaded ? (
        <p className="text-sm text-text-muted">Բեռնվում է...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((subject) => {
            const score = scoreByKey.get(subject.key);
            const interest = interestByKey.get(subject.key);
            const hasScore = score != null && score.mastery_score != null;
            const focused = interest?.is_active ?? false;
            const isOpen = expanded === subject.key;
            const isEditing = editingKey === subject.key;
            const isBusy = busyKey === subject.key;

            return (
              <div
                key={subject.key}
                className={`rounded-[var(--radius)] border border-border bg-bg p-4 transition-opacity ${focused ? "" : "opacity-80"}`}
              >
                <button type="button" onClick={() => setExpanded(isOpen ? null : subject.key)} className="flex w-full items-start gap-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg text-primary">
                    {subject.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{subject.label}</span>
                    <span className="block text-xs text-text-muted">{hasScore ? levelLabel(score!.mastery_score!) : "Առարկա"}</span>
                  </span>
                  {score && (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${SUFFICIENCY_CLASSES[score.data_sufficiency]}`}>
                      {SUFFICIENCY_LABELS[score.data_sufficiency]}
                    </span>
                  )}
                </button>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-semibold text-text">{hasScore ? `${score!.mastery_score}%` : "—"}</span>
                  {score && <span className="text-[11px] text-text-muted">{score.attempts_count} փորձ</span>}
                </div>
                <div className="mt-1.5">
                  <ProgressBar percent={score?.mastery_score ?? 0} />
                </div>

                {!hasScore && (
                  <div className="mt-2.5">
                    <p className="text-[11px] leading-relaxed text-text-muted">
                      Դեռ բավարար տվյալներ չկան։ Լուծիր մի քանի հարց, և իմացության մակարդակը կսկսի ձևավորվել այստեղ։
                    </p>
                    <LinkButton to="/subjects" className="mt-1.5">
                      Սկսել գնահատումը →
                    </LinkButton>
                  </div>
                )}

                {isOpen && <TopicBreakdown subjectKey={subject.key} />}

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                  {focused && interest ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_CLASSES[interest.priority]}`}>
                      {PRIORITY_LABELS[interest.priority]}
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-muted">Ընտրված չէ</span>
                  )}

                  <span className="flex items-center gap-1.5">
                    {focused && interest && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingKey(isEditing ? null : subject.key)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Խմբագրել
                      </Button>
                    )}
                    {interest ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleToggleActive(interest)}
                          className="h-7 px-2 text-[11px]"
                        >
                          {focused ? "Դադարեցնել" : "Ակտիվացնել"}
                        </Button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemove(interest)}
                          aria-label="Ջնջել"
                          className="text-text-muted hover:text-incorrect disabled:opacity-60"
                        >
                          <Trash2 size={13} strokeWidth={1.75} />
                        </button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleFocus(subject.key)}
                        className="h-7 px-2 text-[11px]"
                      >
                        + Կենտրոնանալ
                      </Button>
                    )}
                  </span>
                </div>

                {isEditing && interest && (
                  <InterestEditForm
                    interest={interest}
                    onSaved={(updated) => {
                      upsertInterest(updated);
                      setEditingKey(null);
                    }}
                    onCancel={() => setEditingKey(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
