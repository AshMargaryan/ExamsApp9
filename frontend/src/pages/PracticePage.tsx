import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getHierarchy, getSubtopicMaterial, TIER_LABELS,
  type SubjectNode, type DomainNode, type TopicNode, type SubtopicNode,
  type SubtopicMaterial, type Tier,
} from "../api/practice";
import { Battery } from "../components/Battery";
import { MarkdownMessage } from "../components/assistant/MarkdownMessage";

const TIERS: Tier[] = ["easy", "medium", "hard"];

type Selected =
  | { kind: "domain"; node: DomainNode }
  | { kind: "topic"; node: TopicNode }
  | { kind: "subtopic"; node: SubtopicNode };

function IntroPanel({ name, introText }: { name: string; introText: string }) {
  return (
    <div>
      <h1 className="mb-4 text-3xl font-semibold text-text">{name}</h1>
      <MarkdownMessage
        className="text-lg leading-relaxed"
        content={introText || "Ներածական տեքստը կավելացվի ավելի ուշ։"}
      />
    </div>
  );
}

function SubtopicPanel({ subtopic }: { subtopic: SubtopicNode }) {
  const [material, setMaterial] = useState<SubtopicMaterial | null>(null);
  const exercisesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMaterial(null);
    if (subtopic.has_learning_material) {
      getSubtopicMaterial(subtopic.id).then(setMaterial);
    }
  }, [subtopic.id, subtopic.has_learning_material]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-text">{subtopic.name}</h1>
        <button
          type="button"
          onClick={() => exercisesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="shrink-0 rounded-[var(--radius)] border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-contrast"
        >
          Անցնել վարժություններին
        </button>
      </div>

      {subtopic.has_learning_material ? (
        material ? (
          <MarkdownMessage className="text-xl leading-relaxed" content={material.learning_material} />
        ) : (
          <p className="text-lg text-text-muted">Բեռնվում է...</p>
        )
      ) : (
        <p className="text-lg text-text-muted">Ուսումնական նյութը կավելացվի ավելի ուշ։</p>
      )}

      <div ref={exercisesRef} className="mt-8 grid scroll-mt-8 gap-4 pt-2 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const score = subtopic.tier_scores[tier];
          const done = score !== null;
          return (
            <Link
              key={tier}
              to={`/practice/subtopic/${subtopic.id}/${tier}`}
              state={{ subtopicName: subtopic.name }}
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
  );
}

export function PracticePage() {
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    getHierarchy().then(setSubjects);
  }, []);

  if (!subjects) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      {sidebarOpen ? (
        <aside className="w-[26rem] shrink-0 overflow-y-auto border-r border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <Link to="/" className="text-sm text-primary hover:underline">
              ← Գլխավոր
            </Link>
            <button
              type="button"
              title="Փակել ցանկը"
              onClick={() => setSidebarOpen(false)}
              className="rounded px-2 py-1 text-text-muted hover:bg-surface-muted hover:text-text"
            >
              ‹‹
            </button>
          </div>
          <h2 className="mb-4 text-xl font-semibold text-text">Պարապել</h2>

          {subjects.map((subject) => (
            <div key={subject.id} className="mb-3">
              <div className="mb-2 flex items-center justify-between text-base font-semibold text-text">
                <span>{subject.name}</span>
                <Battery percent={subject.progress.percent} avgScore={subject.progress.avg_score} />
              </div>

              {subject.domains.map((domain) => (
                <details key={domain.id} className="mb-1 ml-1">
                  <summary
                    onClick={() => setSelected({ kind: "domain", node: domain })}
                    className="flex cursor-pointer items-center justify-between rounded px-1.5 py-1.5 text-base text-text hover:bg-surface-muted"
                  >
                    <span>{domain.name}</span>
                    <Battery percent={domain.progress.percent} avgScore={domain.progress.avg_score} />
                  </summary>

                  {domain.topics.map((topic) => (
                    <details key={topic.id} className="mb-1 ml-4" open>
                      <summary
                        onClick={() => setSelected({ kind: "topic", node: topic })}
                        className="flex cursor-pointer items-center justify-between rounded px-1.5 py-1 text-sm text-text-muted hover:bg-surface-muted"
                      >
                        <span>{topic.name}</span>
                        <Battery percent={topic.progress.percent} avgScore={topic.progress.avg_score} />
                      </summary>

                      <ul className="ml-4">
                        {topic.subtopics.map((subtopic) => (
                          <li key={subtopic.id}>
                            <button
                              type="button"
                              onClick={() => setSelected({ kind: "subtopic", node: subtopic })}
                              className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors ${
                                selected?.kind === "subtopic" && selected.node.id === subtopic.id
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
      ) : (
        <aside className="flex w-12 shrink-0 flex-col items-center border-r border-border bg-surface py-5">
          <button
            type="button"
            title="Բացել ցանկը"
            onClick={() => setSidebarOpen(true)}
            className="rounded px-2 py-1 text-text-muted hover:bg-surface-muted hover:text-text"
          >
            ››
          </button>
        </aside>
      )}

      <main className={`flex-1 px-8 py-8 ${sidebarOpen ? "" : "mx-auto w-full max-w-4xl"}`}>
        {!selected && (
          <p className="text-lg text-text-muted">Ընտրեք ոլորտ, թեմա կամ ենթաթեմա ձախ կողմի ցանկից՝ սկսելու համար։</p>
        )}

        {selected?.kind === "subtopic" && <SubtopicPanel subtopic={selected.node} />}

        {(selected?.kind === "domain" || selected?.kind === "topic") && (
          <IntroPanel name={selected.node.name} introText={selected.node.intro_text} />
        )}
      </main>
    </div>
  );
}