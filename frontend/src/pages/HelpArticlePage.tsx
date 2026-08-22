import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, ChevronRight, FileText, LifeBuoy, ThumbsDown, ThumbsUp } from "lucide-react";
import {
  getArticle, getCategory, submitArticleFeedback,
  type ArticleDetail, type ArticleSummary, type FeedbackReason,
} from "../api/help";
import { MarkdownMessage } from "../components/assistant/MarkdownMessage";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, FormAlert } from "../components/ui/Field";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

const REASON_OPTIONS: { value: FeedbackReason; label: string }[] = [
  { value: "not_solved", label: "Չլուծեց իմ խնդիրը" },
  { value: "outdated", label: "Հնացած է" },
  { value: "too_complicated", label: "Չափազանց բարդ է" },
  { value: "wrong_info", label: "Սխալ տեղեկատվություն" },
  { value: "other", label: "Այլ" },
];

function ArticleFeedback({ slug }: { slug: string }) {
  const [vote, setVote] = useState<"helpful" | "unhelpful" | "sent" | null>(null);
  const [reason, setReason] = useState<FeedbackReason>("not_solved");
  const [comment, setComment] = useState("");

  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  // Both were bare `await`s: a rejected request left the control in a state
  // the render did not handle, so the question simply appeared again with no
  // explanation of why the answer had not registered.
  async function send(helpful: boolean) {
    setSending(true);
    setFailed(false);
    try {
      await submitArticleFeedback(slug, helpful, helpful ? undefined : reason, helpful ? undefined : comment);
      setVote("sent");
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (vote === "sent") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] text-center">
        <p className="flex items-center justify-center gap-1.5 text-[length:var(--text-sm)] text-text">
          <Check size={14} strokeWidth={1.75} aria-hidden className="text-correct" /> Շնորհակալություն կարծիքի համար
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
      {vote !== "unhelpful" ? (
        <div>
          {failed && <FormAlert message="Կարծիքը չհաջողվեց ուղարկել։ Փորձիր կրկին։" />}
          <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
            <p className="text-[length:var(--text-sm)] font-medium text-text">Օգտակա՞ր էր այս հոդվածը</p>
            <div className="flex gap-[var(--space-2)]">
              <Button
                variant="secondary"
                size="sm"
                loading={sending}
                onClick={() => send(true)}
                iconLeft={<ThumbsUp size={14} strokeWidth={1.75} aria-hidden />}
              >
                Այո
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setVote("unhelpful")}
                iconLeft={<ThumbsDown size={14} strokeWidth={1.75} aria-hidden />}
              >
                Ոչ
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-text">Ի՞նչն էր անհարմար</p>
          {failed && <FormAlert message="Կարծիքը չհաջողվեց ուղարկել։ Փորձիր կրկին։" />}
          <Field label="Պատճառը">
            {({ id }) => (
              <Select
                id={id}
                value={reason}
                onChange={(v) => setReason(v as FeedbackReason)}
                options={REASON_OPTIONS}
              />
            )}
          </Field>
          <Field label="Մանրամասներ" hint="Կամընտիր">
            {(props) => (
              <textarea
                {...props}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ասա ավելին…"
                rows={2}
                className={cn(props.className, "resize-none")}
              />
            )}
          </Field>
          <Button size="sm" loading={sending} onClick={() => send(false)}>
            Ուղարկել
          </Button>
        </div>
      )}
    </div>
  );
}

/*
  The article page used to end at the thumbs-up/thumbs-down row. If the
  article had not solved the problem, the only way onward was to vote "Ոչ"
  and find a support link inside the follow-up form — the escape hatch was
  behind a negative rating, and there was no route to the next article at
  all. Both are unconditional now.
*/
function NextSteps({ article, siblings }: { article: ArticleDetail; siblings: ArticleSummary[] }) {
  return (
    <>
      {siblings.length > 0 && (
        <Section title="Նույն թեմայով" level={3} spacing="default">
          <ul className="flex flex-col gap-[var(--space-2)]">
            {siblings.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/help/articles/${a.slug}`}
                  className={cn(
                    "flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)]",
                    "border border-border bg-surface px-[var(--space-4)] py-[var(--space-3)]",
                    "text-[length:var(--text-sm)] text-text transition-colors hover:border-primary",
                  )}
                >
                  <span className="min-w-0 truncate">{a.title}</span>
                  <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Դեռ խնդի՞ր ունես" level={3} spacing="default">
        <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-text-muted">
          Բացիր հարցում՝ այս հոդվածի հետ կապված, և թիմը կպատասխանի քեզ։
        </p>
        <div className="flex flex-wrap gap-[var(--space-3)]">
          <LinkButton
            to={`/help/tickets?article=${article.slug}`}
            // The slug is the contract the form needs; the title is what the
            // student should read there. Carried in router state so the form
            // never has to print `reset-password` at a person.
            state={{ articleTitle: article.title }}
            variant="primary"
            size="md"
            iconLeft={<LifeBuoy size={15} strokeWidth={1.75} aria-hidden />}
          >
            Բացել հարցում
          </LinkButton>
          <LinkButton to="/assistant" variant="secondary" size="md">
            Հարցնել AI Օգնականին
          </LinkButton>
        </div>
      </Section>
    </>
  );
}

export function HelpArticlePage() {
  const { articleSlug } = useParams<{ articleSlug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [siblings, setSiblings] = useState<ArticleSummary[]>([]);
  // "Not found" and "could not reach the server" are different answers and
  // used to share one branch, so an offline student was told the article did
  // not exist — and offered no retry, because there is nothing to retry about
  // a 404.
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading");

  const load = useCallback(() => {
    if (!articleSlug) return;
    setStatus("loading");
    setArticle(null);
    setSiblings([]);
    getArticle(articleSlug)
      .then((a) => {
        setArticle(a);
        setStatus("ready");
        // Supplementary — the page is complete without it.
        getCategory(a.category.key)
          .then(({ articles }) => setSiblings(articles.filter((s) => s.slug !== a.slug).slice(0, 3)))
          .catch(() => setSiblings([]));
      })
      .catch((e: { response?: { status?: number } }) => {
        setStatus(e?.response?.status === 404 ? "missing" : "failed");
      });
  }, [articleSlug]);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
      {status === "missing" || status === "failed" ? (
        <>
          <PageHeader title="Հոդված" back={{ to: "/help", label: "Օգնության կենտրոն" }} />
          {status === "missing" ? (
            <EmptyState
              icon={<FileText size={26} strokeWidth={1.75} aria-hidden />}
              title="Հոդվածը չի գտնվել"
              hint="Հնարավոր է՝ հասցեն փոխվել է։ Փնտրիր օգնության կենտրոնում։"
              cta={{ label: "Դեպի օգնության կենտրոն", onClick: () => navigate("/help") }}
            />
          ) : (
            <ErrorState
              title="Հոդվածը չհաջողվեց բեռնել։"
              hint="Ստուգիր կապը և փորձիր կրկին։"
              onRetry={load}
            />
          )}
        </>
      ) : !article ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <>
          <PageHeader
            back={{ to: `/help/${article.category.key}`, label: article.category.name }}
            title={article.title}
            description={article.summary || undefined}
          />

          <div className="mb-[var(--space-8)]">
            <MarkdownMessage content={article.content} />
          </div>

          <ArticleFeedback slug={article.slug} />
          <NextSteps article={article} siblings={siblings} />
        </>
      )}
    </div>
  );
}
