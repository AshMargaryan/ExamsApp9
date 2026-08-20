import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronRight, Sparkles, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import * as profileApi from "../../api/profile";
import type { GoalPriority, StudentSubjectInterest } from "../../api/profile";
import * as knowledgeApi from "../../api/knowledge";
import type { TopicMasteryScore } from "../../api/knowledge";
import { extractErrorMessage, useToast } from "../../context/ToastContext";
import { SUBJECTS, type SubjectMeta } from "../../lib/subjects";
import {
  MASTERY_BAND_COLOR,
  MASTERY_BAND_LABEL,
  MASTERY_BAND_TEXT,
  PRIORITY_LABEL,
  SUFFICIENCY_CLASS,
  SUFFICIENCY_HINT,
  SUFFICIENCY_LABEL,
  masteryBand,
} from "../../lib/mastery";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ErrorState } from "../ui/ErrorState";
import { SegmentedControl } from "../SegmentedControl";
import { Skeleton } from "../ui/Skeleton";
import { useLearningProfileData } from "./LearningProfileData";

/*
  The mastery command centre.

  Five equal cards in a grid made every subject look equally important and
  buried the one fact that matters: *which topic inside a subject is the actual
  problem*. This is a master/detail instead — pick a subject on the left, see
  its real breakdown on the right, with weak topics surfaced first rather than
  listed in tree order.

  The detail panel opens on the weakest focused subject by default, so the page
  answers "what should I worry about" before the student clicks anything.
*/

const WEAK_FIRST_LIMIT = 4;

function SubjectRow({
  meta,
  score,
  focused,
  selected,
  onSelect,
}: {
  meta: SubjectMeta;
  score: number | null;
  focused: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const band = masteryBand(score);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`group flex w-full items-center gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        selected ? "border-primary bg-primary/8" : "border-transparent hover:border-border hover:bg-surface-muted"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base transition-colors ${
          selected ? "bg-primary text-primary-contrast" : "bg-surface-muted text-text-muted"
        }`}
        aria-hidden
      >
        <meta.Icon size={16} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className={`truncate text-sm ${selected ? "font-semibold text-text" : "font-medium text-text"}`}>
            {meta.label}
          </span>
          {focused && (
            <span
              aria-label="Ընտրված առարկա"
              title="Ընտրված առարկա"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
        </span>
        <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-surface-muted">
          <span
            className="block h-full rounded-full transition-[width] duration-[var(--motion-emphasis)] ease-[var(--ease-out)]"
            style={{ width: `${score ?? 0}%`, background: MASTERY_BAND_COLOR[band] }}
          />
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-text">
        {score != null ? `${score}%` : "—"}
      </span>
    </button>
  );
}

function TopicList({ subjectKey }: { subjectKey: string }) {
  const [topics, setTopics] = useState<TopicMasteryScore[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // `cancelled` guards the common case of switching subjects mid-flight —
    // without it a slow response for the previous subject overwrites the new one.
    let cancelled = false;
    setFailed(false);
    setTopics(null);
    setShowAll(false);
    knowledgeApi
      .fetchTopicMasteryScores(subjectKey)
      .then((t) => !cancelled && setTopics(t))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [subjectKey, attempt]);

  if (failed) {
    return <ErrorState size="sm" title="Չհաջողվեց բեռնել թեմաները։" onRetry={() => setAttempt((a) => a + 1)} />;
  }
  if (topics === null) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }
  if (topics.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-text-muted">
        Այս առարկայի համար թեմայական տվյալներ դեռ չկան։ Լուծիր մի քանի հարց, և թեմաները կհայտնվեն այստեղ։
      </p>
    );
  }

  const scored = topics.filter((t) => t.mastery_score != null);
  const weak = scored
    .filter((t) => masteryBand(t.mastery_score) !== "strong")
    .sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0));
  const strong = scored
    .filter((t) => masteryBand(t.mastery_score) === "strong")
    .sort((a, b) => (b.mastery_score ?? 0) - (a.mastery_score ?? 0));

  const visibleWeak = showAll ? weak : weak.slice(0, WEAK_FIRST_LIMIT);
  const visibleStrong = showAll ? strong : strong.slice(0, 3);
  const hiddenCount = weak.length - visibleWeak.length + (strong.length - visibleStrong.length);

  const row = (t: TopicMasteryScore) => {
    const band = masteryBand(t.mastery_score);
    return (
      <li key={t.subtopic} className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-text">{t.subtopic_name}</span>
          <span className="block truncate text-[11px] text-text-muted">{t.topic_name}</span>
        </span>
        <span className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-surface-muted sm:w-28">
          <span
            className="block h-full rounded-full"
            style={{ width: `${t.mastery_score ?? 0}%`, background: MASTERY_BAND_COLOR[band] }}
          />
        </span>
        <span className={`w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums ${MASTERY_BAND_TEXT[band]}`}>
          {t.mastery_score}%
        </span>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {visibleWeak.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-incorrect">ԱՇԽԱՏԱՆՔ Է ՊԵՏՔ</p>
          <ul className="flex flex-col gap-2.5">{visibleWeak.map(row)}</ul>
        </div>
      )}
      {visibleStrong.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-correct">ՈՒԺԵՂ ԿՈՂՄԵՐ</p>
          <ul className="flex flex-col gap-2.5">{visibleStrong.map(row)}</ul>
        </div>
      )}
      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="self-start text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Տեսնել ևս {hiddenCount} թեմա
        </button>
      )}
    </div>
  );
}

function FocusPanel({
  meta,
  interest,
}: {
  meta: SubjectMeta;
  interest: StudentSubjectInterest | undefined;
}) {
  const { showError } = useToast();
  const { upsertInterest, removeInterest } = useLearningProfileData();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(interest?.target_note ?? "");
  const [noteSaved, setNoteSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setNote(interest?.target_note ?? "");
    setNoteSaved(false);
  }, [interest?.id, interest?.target_note]);

  async function patch(payload: Parameters<typeof profileApi.updateSubjectInterest>[1]) {
    if (!interest) return;
    setBusy(true);
    try {
      upsertInterest(await profileApi.updateSubjectInterest(interest.id, payload));
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function startFocus() {
    setBusy(true);
    try {
      upsertInterest(await profileApi.createSubjectInterest({ subject_key: meta.key, priority: "medium" }));
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!interest) return;
    setBusy(true);
    try {
      await profileApi.deleteSubjectInterest(interest.id);
      removeInterest(interest.id);
      setConfirmOpen(false);
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!interest) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-border p-4">
        <p className="text-sm font-medium text-text">Դարձնել այս առարկան ուսումնական առաջնահերթություն</p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">
          Ընտրված առարկաները մտնում են քո միջին իմացության մեջ և ուղղորդում են ամենօրյա պլանը։
        </p>
        <Button size="sm" className="mt-3" loading={busy} onClick={startFocus}>
          Կենտրոնանալ {meta.label}-ի վրա
        </Button>
      </div>
    );
  }

  const noteDirty = note.trim() !== interest.target_note;

  return (
    <div className="rounded-[var(--radius)] border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text">
          <Sparkles size={14} strokeWidth={1.75} className="text-primary" />
          {interest.is_active ? "Ընտրված առարկա" : "Ժամանակավորապես դադարեցված"}
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => patch({ is_active: !interest.is_active })}>
            {interest.is_active ? "Դադարեցնել" : "Ակտիվացնել"}
          </Button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmOpen(true)}
            aria-label={`Հեռացնել ${meta.label}-ը ընտրվածներից`}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-muted hover:text-incorrect focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs text-text-muted">Առաջնահերթություն</p>
          <SegmentedControl
            className="w-full"
            value={interest.priority}
            onChange={(priority: GoalPriority) => patch({ priority })}
            options={(Object.keys(PRIORITY_LABEL) as GoalPriority[]).map((p) => ({
              value: p,
              label: PRIORITY_LABEL[p],
            }))}
          />
        </div>
        <div>
          <label htmlFor={`target-${interest.id}`} className="mb-1.5 block text-xs text-text-muted">
            Նպատակ (ըստ ցանկության)
          </label>
          <div className="flex gap-2">
            <input
              id={`target-${interest.id}`}
              value={note}
              maxLength={200}
              placeholder="օր.՝ 90+ միավոր"
              onChange={(e) => {
                setNote(e.target.value);
                setNoteSaved(false);
              }}
              className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none focus:border-primary"
            />
            {noteDirty ? (
              <Button
                size="sm"
                loading={busy}
                onClick={async () => {
                  await patch({ target_note: note.trim() });
                  setNoteSaved(true);
                }}
              >
                Պահպանել
              </Button>
            ) : (
              noteSaved && (
                <span className="flex items-center gap-1 self-center text-xs text-correct">
                  <Check size={12} strokeWidth={2} /> Պահպանված է
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Հեռացնե՞լ «${meta.label}»-ը ընտրվածներից`}
        description="Իմացության տվյալներդ չեն ջնջվի — առարկան պարզապես այլևս չի ուղղորդի քո ուսումնական պլանը։"
        confirmLabel="Հեռացնել"
        busy={busy}
        onConfirm={remove}
      />
    </div>
  );
}

export function SubjectMasterySection() {
  const { status, interests, scores } = useLearningProfileData();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const scoreByKey = new Map(scores.map((s) => [s.subject_key, s]));
  const interestByKey = new Map(interests.map((i) => [i.subject_key, i]));

  // Open on the weakest focused subject — the one the student most needs to
  // look at — rather than whichever subject happens to sort first.
  useEffect(() => {
    if (selectedKey !== null || status !== "ready") return;
    const focusedWithScore = interests
      .filter((i) => i.is_active)
      .map((i) => ({ key: i.subject_key, score: scoreByKey.get(i.subject_key)?.mastery_score ?? null }))
      .filter((f) => f.score != null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    setSelectedKey(
      focusedWithScore[0]?.key ?? interests.find((i) => i.is_active)?.subject_key ?? SUBJECTS[0].key,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, interests]);

  if (status === "loading") {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <Skeleton className="h-4 w-56" />
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,264px)_1fr]">
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }
  if (status === "error") return null; // the hero already owns the page-level error + retry

  const activeKey = selectedKey ?? SUBJECTS[0].key;
  const meta = SUBJECTS.find((s) => s.key === activeKey) ?? SUBJECTS[0];
  const score = scoreByKey.get(activeKey);
  const interest = interestByKey.get(activeKey);
  const value = score?.mastery_score ?? null;
  const band = masteryBand(value);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5">
        <BookOpen size={16} strokeWidth={1.75} className="text-text-muted" />
        <h2 className="text-sm font-semibold text-text">Առարկաներ ու իմացության մակարդակ</h2>
      </div>
      <p className="mb-5 text-xs text-text-muted">
        Իմացության մակարդակը հաշվարկվում է քո վերջին պատասխանների հիման վրա՝ վերջինները ավելի մեծ ազդեցություն ունեն։
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,264px)_1fr] lg:gap-7">
        <div
          role="tablist"
          aria-label="Առարկաներ"
          className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:border-r lg:border-border lg:pr-4 lg:pb-0 no-scrollbar"
        >
          {SUBJECTS.map((s) => (
            <div key={s.key} role="presentation" className="min-w-[190px] lg:min-w-0">
              <SubjectRow
                meta={s}
                score={scoreByKey.get(s.key)?.mastery_score ?? null}
                focused={interestByKey.get(s.key)?.is_active ?? false}
                selected={s.key === activeKey}
                onSelect={() => setSelectedKey(s.key)}
              />
            </div>
          ))}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold text-text">
                <meta.Icon size={18} strokeWidth={1.75} aria-hidden className="shrink-0" />
                {meta.label}
              </p>
              <p className={`mt-0.5 text-xs font-medium ${MASTERY_BAND_TEXT[band]}`}>{MASTERY_BAND_LABEL[band]}</p>
            </div>
            {score && (
              <span
                title={SUFFICIENCY_HINT[score.data_sufficiency]}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${SUFFICIENCY_CLASS[score.data_sufficiency]}`}
              >
                {SUFFICIENCY_LABEL[score.data_sufficiency]}
              </span>
            )}
          </div>

          {value != null ? (
            <>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-[40px] leading-none font-semibold tabular-nums text-text">{value}%</span>
                {score && (
                  <span className="pb-1.5 text-xs text-text-muted">
                    {score.attempts_count} փորձ · {score.correct_count} ճիշտ
                  </span>
                )}
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full transition-[width] duration-[var(--motion-emphasis)] ease-[var(--ease-out)]"
                  style={{ width: `${value}%`, background: MASTERY_BAND_COLOR[band] }}
                />
              </div>

              <div className="mt-6">
                <TopicList subjectKey={activeKey} />
              </div>
            </>
          ) : (
            <div className="mt-4 rounded-[var(--radius)] border border-dashed border-border p-5">
              <p className="text-sm font-medium text-text">Մենք դեռ քեզ բավականաչափ չենք ճանաչում։</p>
              <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                Լուծիր 5–10 հարց {meta.label}-ից, և Gitus-ը կսկսի կառուցել քո իրական իմացության պատկերը՝ թեմա առ
                թեմա։ Առանց դրա պլանը կռահում է, փոխարենը որ իմանա։
              </p>
              <Link
                to="/subjects"
                className="mt-3 inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border bg-surface px-3.5 py-2 text-sm font-medium text-text transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Սկսել գնահատումը
                <ChevronRight size={14} strokeWidth={2} />
              </Link>
            </div>
          )}

          <div className="mt-6">
            <FocusPanel meta={meta} interest={interest} />
          </div>
        </div>
      </div>
    </div>
  );
}
