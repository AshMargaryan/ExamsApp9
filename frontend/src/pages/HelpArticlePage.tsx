import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Check, FileText, ThumbsDown, ThumbsUp } from "lucide-react";
import { getArticle, submitArticleFeedback, type ArticleDetail, type FeedbackReason } from "../api/help";
import { MarkdownMessage } from "../components/assistant/MarkdownMessage";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";

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
  const navigate = useNavigate();

  async function sendHelpful() {
    setVote("helpful");
    await submitArticleFeedback(slug, true);
    setVote("sent");
  }

  async function sendUnhelpful() {
    await submitArticleFeedback(slug, false, reason, comment);
    setVote("sent");
  }

  if (vote === "sent") {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm text-text">
          <Check size={14} strokeWidth={1.75} /> Շնորհակալություն կարծիքի համար
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      {vote !== "unhelpful" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-text">Օգտակա՞ր էր այս հոդվածը</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendHelpful}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-correct hover:text-correct"
            >
              <ThumbsUp size={14} strokeWidth={1.75} /> Այո
            </button>
            <button
              type="button"
              onClick={() => setVote("unhelpful")}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-incorrect hover:text-incorrect"
            >
              <ThumbsDown size={14} strokeWidth={1.75} /> Ոչ
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-text">Ի՞նչն էր անհարմար</p>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value as FeedbackReason)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
          >
            {REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ասեք ավելին (կամընտիր)"
            rows={2}
            className="resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={sendUnhelpful}
              className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:opacity-90"
            >
              Ուղարկել
            </button>
            <Button variant="secondary" size="sm" onClick={() => navigate(`/help/tickets?article=${slug}`)}>
              Դեռ խնդի՞ր ունեք → Դիմել աջակցության թիմին
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HelpArticlePage() {
  const { articleSlug } = useParams<{ articleSlug: string }>();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!articleSlug) return;
    setArticle(null);
    setNotFound(false);
    getArticle(articleSlug).then(setArticle).catch(() => setNotFound(true));
  }, [articleSlug]);

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-28">
      {article ? (
        <LinkButton to={`/help/${article.category.key}`} className="mb-4">
          ← {article.category.name}
        </LinkButton>
      ) : (
        <LinkButton to="/help" className="mb-4">← Օգնության կենտրոն</LinkButton>
      )}

      {notFound ? (
        <EmptyState icon={<FileText size={26} strokeWidth={1.75} />} title="Հոդվածը չի գտնվել" />
      ) : !article ? (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-40 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-2xl font-semibold text-text">{article.title}</h1>
          {article.summary && <p className="mb-6 text-sm text-text-muted">{article.summary}</p>}

          <div className="mb-8">
            <MarkdownMessage content={article.content} />
          </div>

          <ArticleFeedback slug={article.slug} />
        </>
      )}
    </div>
  );
}
