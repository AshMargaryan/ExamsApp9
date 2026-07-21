import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getHierarchy, TIER_LABELS, type SubjectNode, type SubtopicNode, type Tier } from "../api/practice";
import { Battery } from "../components/Battery";

const TIERS: Tier[] = ["easy", "medium", "hard"];

function InfoLink({ to, name, introText }: { to: string; name: string; introText: string }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      title="Ներածական տեքստ"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(to, { state: { name, introText } });
      }}
      className="ml-1 rounded px-1 text-text-muted hover:text-primary"
    >
      ⓘ
    </button>
  );
}

export function PracticePage() {
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [selected, setSelected] = useState<SubtopicNode | null>(null);

  useEffect(() => {
    getHierarchy().then(setSubjects);
  }, []);

  if (!subjects) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="w-[26rem] shrink-0 overflow-y-auto border-r border-border bg-surface p-5">
        <Link to="/" className="mb-4 inline-block text-sm text-primary hover:underline">
          ← Գլխավոր
        </Link>
        <h2 className="mb-4 text-xl font-semibold text-text">Պարապել</h2>

        {subjects.map((subject) => (
          <div key={subject.id} className="mb-3">
            <div className="mb-2 flex items-center justify-between text-base font-semibold text-text">
              <span>{subject.name}</span>
              <Battery percent={subject.progress.percent} avgScore={subject.progress.avg_score} />
            </div>

            {subject.domains.map((domain) => (
              <details key={domain.id} className="mb-1 ml-1">
                <summary className="flex cursor-pointer items-center justify-between rounded px-1.5 py-1.5 text-base text-text hover:bg-surface-muted">
                  <span>
                    {domain.name}
                    <InfoLink
                      to={`/practice/domain/${domain.id}`}
                      name={domain.name}
                      introText={domain.intro_text}
                    />
                  </span>
                  <Battery percent={domain.progress.percent} avgScore={domain.progress.avg_score} />
                </summary>

                {domain.topics.map((topic) => (
                  <details key={topic.id} className="mb-1 ml-4" open>
                    <summary className="flex cursor-pointer items-center justify-between rounded px-1.5 py-1 text-sm text-text-muted hover:bg-surface-muted">
                      <span>
                        {topic.name}
                        <InfoLink
                          to={`/practice/topic/${topic.id}`}
                          name={topic.name}
                          introText={topic.intro_text}
                        />
                      </span>
                      <Battery percent={topic.progress.percent} avgScore={topic.progress.avg_score} />
                    </summary>

                    <ul className="ml-4">
                      {topic.subtopics.map((subtopic) => (
                        <li key={subtopic.id}>
                          <button
                            type="button"
                            onClick={() => setSelected(subtopic)}
                            className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                              selected?.id === subtopic.id
                                ? "bg-primary text-primary-contrast"
                                : "text-text hover:bg-surface-muted"
                            }`}
                          >
                            {subtopic.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </details>
            ))}
          </div>
        ))}
      </aside>

      <main className="flex-1 px-8 py-8">
        {!selected && (
          <p className="text-lg text-text-muted">Ընտրեք ենթաթեմա ձախ կողմի ցանկից՝ սկսելու համար։</p>
        )}

        {selected && (
          <div>
            <h1 className="mb-4 text-3xl font-semibold text-text">{selected.name}</h1>

            <div className="mb-3 rounded-[var(--radius)] border border-border bg-surface p-5 opacity-60">
              <span className="text-lg font-medium text-text">📘 Ուսումնական նյութ</span>
              <p className="text-text-muted">Շուտով...</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {TIERS.map((tier) => {
                const score = selected.tier_scores[tier];
                const done = score !== null;
                return (
                  <Link
                    key={tier}
                    to={`/practice/subtopic/${selected.id}/${tier}`}
                    state={{ subtopicName: selected.name }}
                    className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center transition-colors hover:border-primary"
                  >
                    <div
                      className="mx-auto mb-3 h-2 w-12 rounded-full"
                      style={{ backgroundColor: `var(--color-${tier})` }}
                    />
                    <p className="text-lg font-medium text-text">{TIER_LABELS[tier]}</p>
                    <p className="text-text-muted">{done ? `Ավարտված ✓ (${score}%)` : "Չսկսված"}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
