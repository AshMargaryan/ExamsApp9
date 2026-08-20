import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { ArticleSummary } from "../../api/help";
import { cn } from "../../lib/cn";

/** One help article in a list. The centre, the category page and search all
 *  rendered their own copy of this, and they had already drifted — one
 *  clamped its summary and one did not. */
export function ArticleRow({ article }: { article: ArticleSummary }) {
  return (
    <Link
      to={`/help/articles/${article.slug}`}
      className={cn(
        "flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-lg)]",
        "border border-border bg-surface p-[var(--space-4)] transition-colors hover:border-primary",
      )}
    >
      <span className="min-w-0">
        <span className="block font-medium text-text">{article.title}</span>
        {article.summary && (
          <span className="mt-1 line-clamp-2 block text-[length:var(--text-sm)] text-text-muted">
            {article.summary}
          </span>
        )}
      </span>
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
    </Link>
  );
}
