import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { RotateCcw, Sparkles, Play } from "lucide-react";
import {
  listMockExams, getExamAttemptHistory, startAttempt, abandonAttempt, formatSeconds,
  type MockExamSummary, type MockExamAttempt,
} from "../api/mockExams";
import { TimeSelector } from "../components/exams/TimeSelector";
import { ConfirmModal } from "../components/ConfirmModal";
import { StatTile } from "../components/ui/StatTile";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { subjectMeta } from "../lib/subjects";
import { parseExamTitle } from "../lib/examTitle";
import { LinkButton } from "../components/ui/LinkButton";

const RECOMMENDED_MINUTES = 120;

// Remembers, per attempt, whether the student wants the floating AI
// assistant available while taking that specific test.
const aiChoiceKey = (attemptId: number) => `mockexam_ai_choice_${attemptId}`;

const RULES = [
  "Պատասխանները ավտոմատ պահպանվում են",
  "Ժամանակը սկսվում է մեկնարկից",
  "Կարող ես վերադառնալ նախորդ հարցերին",
  "Ավարտելուց հետո կստանաս մանրամասն վերլուծություն",
];

export function MockExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const id = Number(examId);
  const navigate = useNavigate();

  const [exam, setExam] = useState<MockExamSummary | null | undefined>(undefined);
  const [history, setHistory] = useState<MockExamAttempt[] | null>(null);
  const [duration, setDuration] = useState<number | null>(RECOMMENDED_MINUTES);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    listMockExams().then((all) => setExam(all.find((e) => e.id === id) ?? null));
    getExamAttemptHistory(id).then(setHistory);
  }, [id]);

  async function handleStart() {
    setBusy(true);
    setStartError(null);
    try {
      const attempt = await startAttempt(id, duration, hintsEnabled);
      localStorage.setItem(aiChoiceKey(attempt.id), aiEnabled ? "yes" : "no");
      navigate(`/mock-exams/attempt/${attempt.id}`);
    } catch (err) {
      // A stale page (opened before an earlier attempt at this exam was
      // started elsewhere) can race into "already has an in-progress
      // attempt" — recover by jumping straight to that draft instead of
      // just failing silently.
      const draftAttemptId = axios.isAxiosError(err) ? err.response?.data?.draft_attempt_id : undefined;
      if (draftAttemptId) {
        navigate(`/mock-exams/attempt/${draftAttemptId}`);
        return;
      }
      setStartError("Չհաջողվեց սկսել թեստը։ Փորձիր կրկին։");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetDraft() {
    if (!exam?.draft_attempt_id) return;
    setBusy(true);
    try {
      await abandonAttempt(exam.draft_attempt_id);
      setExam({ ...exam, has_draft: false, draft_attempt_id: null });
    } finally {
      setBusy(false);
      setShowResetConfirm(false);
    }
  }

  if (exam === undefined || history === null) {
    return <div className="p-8 text-lg text-text-muted">Բացվում է թեստը...</div>;
  }
  if (exam === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="mb-4 text-lg text-text-muted">Չկարողացանք գտնել այս թեստը։</p>
        <LinkButton to="/mock-exams">← Ամբողջական թեստեր</LinkButton>
      </div>
    );
  }

  const subject = subjectMeta(exam.subject);
  const { main, secondary } = parseExamTitle(exam.title, subject?.label ?? exam.title);
  const scores = history
    .filter((a) => a.scaled_score !== null)
    .slice()
    .reverse()
    .slice(-5)
    .map((a) => a.scaled_score as number);
  const bestScore = history.reduce<number | null>(
    (best, a) => (a.scaled_score !== null && (best === null || a.scaled_score > best) ? a.scaled_score : best),
    null,
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/mock-exams" className="mb-4">← Ամբողջական թեստեր</LinkButton>
      <div className="mb-1 flex items-center gap-2 text-lg font-medium text-text-muted">
        {subject && <subject.Icon size={18} strokeWidth={1.75} aria-hidden className="shrink-0" />}
        <span>{main}</span>
      </div>
      <p className="mb-6 text-sm text-text-muted">{secondary}</p>

      <div className="mb-8 grid grid-cols-3 gap-3">
        <StatTile label="ՀԱՐՑ" value={String(exam.question_count)} />
        <StatTile label="ԺԱՄԱՆԱԿ" value={duration === null ? "Անժամկետ" : formatSeconds(duration * 60)} />
        <StatTile label="ՄԻԱՎՈՐ" value="20" />
      </div>

      {history.length > 0 && (
        <Card className="mb-8">
          <h2 className="mb-3 text-base font-semibold text-text">Քո արդյունքները</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <p className="text-text-muted">Լավագույն</p>
              <p className="text-lg font-semibold text-primary">{bestScore} / 20</p>
            </div>
            <div>
              <p className="text-text-muted">Վերջին</p>
              <p className="text-lg font-semibold text-text">{history[0].scaled_score} / 20</p>
            </div>
            <div>
              <p className="text-text-muted">Փորձեր</p>
              <p className="text-lg font-semibold text-text">{history.length}</p>
            </div>
          </div>
          {scores.length > 1 && (
            <p className="mt-4 text-sm text-text-muted">
              {scores.map((s, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  <span className={i === scores.length - 1 ? "font-semibold text-text" : ""}>{s}</span>
                </span>
              ))}
            </p>
          )}
        </Card>
      )}

      {exam.has_draft && exam.draft_attempt_id ? (
        <Card className="mb-8 border-primary/40">
          <p className="mb-3 text-text">Դու ունես անավարտ փորձ այս թեստից։</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => navigate(`/mock-exams/attempt/${exam.draft_attempt_id}`)}>
              <Play size={15} strokeWidth={2} aria-hidden /> Շարունակել
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => setShowResetConfirm(true)}>
              <RotateCcw size={15} strokeWidth={1.75} /> Սկսել նորից
            </Button>
          </div>
          {showResetConfirm && (
            <ConfirmModal
              message="Անավարտ փորձը կջնջվի և կկարողանաս սկսել այս թեստը զրոյից։ Շարունակե՞լ։"
              confirmLabel="Այո, սկսել նորից"
              onConfirm={handleResetDraft}
              onCancel={() => setShowResetConfirm(false)}
            />
          )}
        </Card>
      ) : (
        <>
          <h2 className="mb-3 text-base font-semibold text-text">Ժամանակի սահմանաչափ</h2>
          <div className="mb-8">
            <TimeSelector value={duration} onChange={setDuration} />
          </div>

          <Card className="mb-8 flex items-center justify-between">
            <span className="text-base font-medium text-text">Հուշումներ</span>
            <input
              type="checkbox"
              checked={hintsEnabled}
              onChange={(e) => setHintsEnabled(e.target.checked)}
              className="h-5 w-5"
              aria-label="Ակտիվացնել հուշումները"
            />
          </Card>

          <Card className="mb-8 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-base font-medium text-text">
              <Sparkles size={16} strokeWidth={1.75} /> AI Օգնական
            </span>
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="h-5 w-5"
              aria-label="Ակտիվացնել AI Օգնականը"
            />
          </Card>

          <Card className="mb-8">
            <h2 className="mb-3 text-base font-semibold text-text">Պատրա՞ստ ես</h2>
            <ul className="flex flex-col gap-2 text-sm text-text-muted">
              {RULES.map((rule) => (
                <li key={rule} className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  {rule}
                </li>
              ))}
            </ul>
          </Card>

          {startError && <p className="mb-3 text-sm text-incorrect">{startError}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" size="lg" loading={busy} onClick={handleStart} className="flex-1">
              🚀 Սկսել թեստը
            </Button>
            <Button variant="secondary" size="lg" onClick={() => navigate("/mock-exams")}>
              ← Վերադառնալ
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
