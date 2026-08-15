import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FileText, LifeBuoy } from "lucide-react";
import { getCategory, type ArticleSection, type ArticleSummary, type Category } from "../api/help";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";

const SECTION_LABEL: Record<ArticleSection, string> = {
  guide: "Առաջին քայլեր",
  feature: "Հնարավորություններ",
  troubleshooting: "Խնդիրների լուծում",
};

const SECTION_ORDER: ArticleSection[] = ["guide", "feature", "troubleshooting"];

function groupBySection(articles: ArticleSummary[]): [ArticleSection, ArticleSummary[]][] {
  const groups = new Map<ArticleSection, ArticleSummary[]>();
  for (const article of articles) {
    if (!groups.has(article.section)) groups.set(article.section, []);
    groups.get(article.section)!.push(article);
  }
  return SECTION_ORDER.filter((s) => groups.has(s)).map((s) => [s, groups.get(s)!]);
}

export function HelpCategoryPage() {
  const { categoryKey } = useParams<{ categoryKey: string }>();
  const [data, setData] = useState<{ category: Category; articles: ArticleSummary[] } | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!categoryKey) return;
    setData(null);
    setNotFound(false);
    getCategory(categoryKey).then(setData).catch(() => setNotFound(true));
  }, [categoryKey]);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-28">
      <LinkButton to="/help" className="mb-4">← Օգնության կենտրոն</LinkButton>

      {notFound ? (
        <EmptyState icon={<LifeBuoy size={26} strokeWidth={1.75} />} title="Կատեգորիան չի գտնվել" />
      ) : !data ? (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-1/2 animate-pulse rounded bg-surface-muted" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : (
        <>
          <h1 className="mb-1 text-3xl font-semibold text-text">
            <span aria-hidden>{data.category.icon}</span> {data.category.name}
          </h1>
          {data.category.description && (
            <p className="mb-6 text-sm text-text-muted">{data.category.description}</p>
          )}

          {data.articles.length === 0 ? (
            <EmptyState icon={<FileText size={26} strokeWidth={1.75} />} title="Այս կատեգորիայում հոդվածներ դեռ չկան" />
          ) : (
            <div className="flex flex-col gap-8">
              {groupBySection(data.articles).map(([section, articles]) => (
                <div key={section}>
                  <h2 className="mb-3 text-lg font-semibold text-text">{SECTION_LABEL[section]}</h2>
                  <div className="flex flex-col gap-3">
                    {articles.map((article) => (
                      <Link
                        key={article.id}
                        to={`/help/articles/${article.slug}`}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-primary"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-text">{article.title}</p>
                          {article.summary && <p className="mt-1 text-sm text-text-muted">{article.summary}</p>}
                        </div>
                        <span className="shrink-0 text-text-muted">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
