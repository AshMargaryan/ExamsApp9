import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, LifeBuoy, SearchX } from "lucide-react";
import {
  getCategory, listCategories, listPopularArticles, searchArticles,
  type ArticleSummary, type Category,
} from "../api/help";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function ArticleRow({ article }: { article: ArticleSummary }) {
  return (
    <Link
      to={`/help/articles/${article.slug}`}
      className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-primary"
    >
      <div className="min-w-0">
        <p className="font-medium text-text">{article.title}</p>
        {article.summary && <p className="mt-1 text-sm text-text-muted">{article.summary}</p>}
      </div>
      <span className="shrink-0 text-text-muted">→</span>
    </Link>
  );
}

export function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [searchResults, setSearchResults] = useState<ArticleSummary[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [popular, setPopular] = useState<ArticleSummary[] | null>(null);

  useEffect(() => {
    listCategories().then(setCategories);
    listPopularArticles().then(setPopular);
  }, []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    searchArticles(debouncedQuery).then((results) => {
      if (!cancelled) setSearchResults(results);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-28">
      <LinkButton to="/" className="mb-4">← Գլխավոր</LinkButton>
      <h1 className="mb-1 text-3xl font-semibold text-text">🆘 Օգնության կենտրոն</h1>
      <p className="mb-6 text-sm text-text-muted">Փնտրեք պատասխան, կամ դիմեք մեզ ուղղակիորեն։</p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ինչո՞վ կարող ենք օգնել…"
        className="mb-8 w-full rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
      />

      {searchResults ? (
        <div className="flex flex-col gap-3">
          <SectionHeader title={`Արդյունքներ՝ "${debouncedQuery}"`} />
          {searchResults.length === 0 ? (
            <EmptyState
              icon={<SearchX size={26} strokeWidth={1.75} />}
              title="Ոչինչ չգտնվեց"
              hint="Փորձեք այլ բառեր, կամ դիմեք աջակցության թիմին։"
              cta={{ label: "Բացել հարցում", onClick: () => (window.location.href = "/help/tickets") }}
            />
          ) : (
            searchResults.map((a) => <ArticleRow key={a.id} article={a} />)
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div>
            <SectionHeader title="Կատեգորիաներ" />
            {!categories ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categories.map((c) => (
                  <Link
                    key={c.key}
                    to={`/help/${c.key}`}
                    className="flex flex-col items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors hover:border-primary"
                  >
                    <span className="flex text-2xl" aria-hidden>{c.icon || <LifeBuoy size={22} strokeWidth={1.75} />}</span>
                    <span className="text-sm font-medium text-text">{c.name}</span>
                    <span className="text-xs text-text-muted">{c.article_count} հոդված</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Հաճախ դիտվող հոդվածներ" />
            {!popular ? (
              <div className="flex flex-col gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <EmptyState icon={<FileText size={26} strokeWidth={1.75} />} title="Հոդվածներ դեռ չկան" />
            ) : (
              <div className="flex flex-col gap-3">
                {popular.map((a) => <ArticleRow key={a.id} article={a} />)}
              </div>
            )}
          </div>

          <Card className="flex flex-col items-start gap-2">
            <p className="font-medium text-text">Չգտա՞ք ինչ փնտրում էիք</p>
            <p className="text-sm text-text-muted">
              Բացեք հարցում, և մեր թիմը կպատասխանի ձեզ։ Կարող եք նաև դիմել AI Օգնականին արագ պատասխանների համար։
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link
                to="/help/tickets"
                className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:opacity-90"
              >
                Դիմել աջակցության թիմին
              </Link>
              <Link
                to="/assistant"
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary"
              >
                Հարցնել AI Օգնականին
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
