import { useEffect, useState } from "react";
import * as challengesApi from "../../api/challenges";
import type { ChallengeInvite } from "../../api/challenges";
import * as practiceApi from "../../api/practice";
import type { SubjectNode } from "../../api/practice";
import type { FriendUser } from "../../api/friends";
import { Swords, X } from "lucide-react";
import { Button } from "../ui/Button";
import { Field } from "../ui/Field";
import { Select } from "../ui/Select";

export function ChallengeModal({
  friend, onClose, onSent,
}: {
  friend: FriendUser;
  onClose: () => void;
  onSent?: (invite: ChallengeInvite) => void;
}) {
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    practiceApi.getHierarchy().then((data) => {
      setSubjects(data);
      if (data.length > 0) setSubjectId(data[0].id);
    });
  }, []);

  const selectedSubject = subjects?.find((s) => s.id === subjectId);
  const topics = selectedSubject?.domains.flatMap((d) => d.topics) ?? [];

  async function handleSend() {
    if (!subjectId) return;
    setSending(true);
    setError(null);
    try {
      const invite = await challengesApi.sendChallenge(friend.id, subjectId, topicId);
      setSent(true);
      onSent?.(invite);
    } catch {
      setError("Մարտահրավերն ուղարկելիս սխալ տեղի ունեցավ։");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-[var(--space-2)] text-lg font-semibold text-text">
            <Swords size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
            Մարտահրավեր @{friend.username}-ին
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:bg-surface-muted hover:text-text"
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </div>

        {sent ? (
          <p className="text-sm text-text">Մարտահրավերն ուղարկվեց։ Սպասիր {friend.username}-ի պատասխանին։</p>
        ) : (
          <>
            {!subjects && <p className="text-text-muted">Բեռնվում է…</p>}
            {subjects && subjects.length === 0 && (
              <p className="text-sm text-text-muted">Առարկաներ դեռ հասանելի չեն։</p>
            )}
            {subjects && subjects.length > 0 && (
              <div className="flex flex-col gap-3">
                <Field label="Առարկա" containerClassName="mb-0">
                  {(control) => (
                    <Select<string>
                      id={control.id}
                      value={subjectId == null ? "" : String(subjectId)}
                      onChange={(next) => {
                        setSubjectId(Number(next));
                        setTopicId(null);
                      }}
                      options={subjects.map((s) => ({ value: String(s.id), label: s.name }))}
                    />
                  )}
                </Field>

                {topics.length > 0 && (
                  <Field label="Թեմա (ընտրովի)" containerClassName="mb-0">
                    {(control) => (
                      <Select<string>
                        id={control.id}
                        value={topicId == null ? "" : String(topicId)}
                        onChange={(next) => setTopicId(next ? Number(next) : null)}
                        placeholder="Բոլոր թեմաները"
                        options={[
                          { value: "", label: "Բոլոր թեմաները" },
                          ...topics.map((t) => ({ value: String(t.id), label: t.name })),
                        ]}
                      />
                    )}
                  </Field>
                )}

                <p className="text-xs text-text-muted">
                  10 հարց, խառը դժվարություն։ Հաղթողը ստանում է +20 XP բոնուս։
                </p>

                <Button onClick={handleSend} loading={sending} disabled={!subjectId}>
                  Ուղարկել մարտահրավերը
                </Button>
              </div>
            )}
          </>
        )}

        {error && <p className="mt-3 text-sm text-incorrect">{error}</p>}
      </div>
    </div>
  );
}
