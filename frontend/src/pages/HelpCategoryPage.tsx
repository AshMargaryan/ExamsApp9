import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FileText, LifeBuoy } from "lucide-react";
import { getCategory, type ArticleSection, type ArticleSummary, type Category } from "../api/help";
import { ArticleRow } from "../components/help/ArticleRow";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Skeleton } from "../components/ui/Skeleton";

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
  const navigate = useNavigate();
  const [data, setData] = useState<{ category: Category; articles: ArticleSummary[] } | null>(null);
  // A missing category and an unreachable server used to share one branch, so
  // an offline student was told the category did not exist.
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading");

  const load = useCallback(() => {
    if (!categoryKey) return;
    setStatus("loading");
    setData(null);
    getCategory(categoryKey)
      .then((d) => {
        setData(d);
        setStatus("ready");
      })
      .catch((e: { response?: { status?: number } }) => {
        setStatus(e?.response?.status === 404 ? "missing" : "failed");
      });
  }, [categoryKey]);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      {status === "missing" || status === "failed" ? (
        <>
          <PageHeader title="Կատեգորիա" back={{ to: "/help", label: "Օգնության կենտրոն" }} />
          {status === "missing" ? (
            <EmptyState
              icon={<LifeBuoy size={26} strokeWidth={1.75} aria-hidden />}
              title="Կատեգորիան չի գտնվել"
              hint="Հնարավոր է՝ հասցեն փոխվել է։"
              cta={{ label: "Դեպի օգնության կենտրոն", onClick: () => navigate("/help") }}
            />
          ) : (
            <ErrorState
              title="Կատեգորիան չհաջողվեց բեռնել։"
              hint="Ստուգիր կապը և փորձիր կրկին։"
              onRetry={load}
            />
          )}
        </>
      ) : !data ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-1/2" />
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <>
          {/* The heading opened with the category's stored emoji. */}
          <PageHeader
            back={{ to: "/help", label: "Օգնության կենտրոն" }}
            title={data.category.name}
            description={data.category.description || undefined}
          />

          {data.articles.length === 0 ? (
            <EmptyState
              icon={<FileText size={26} strokeWidth={1.75} aria-hidden />}
              title="Այս կատեգորիայում հոդվածներ դեռ չկան"
              hint="Գրիր աջակցության թիմին — կպատասխանենք ուղղակիորեն։"
              cta={{ label: "Բացել հարցում", onClick: () => navigate("/help/tickets") }}
            />
          ) : (
            <div className="flex flex-col gap-[var(--section-gap)]">
              {groupBySection(data.articles).map(([section, articles]) => (
                // Was a hand-rolled `<h2 className="mb-3 text-lg font-semibold">`
                // — the exact pattern `Section` exists to make consistent.
                <Section key={section} title={SECTION_LABEL[section]} level={2} spacing="none">
                  <div className="flex flex-col gap-[var(--space-3)]">
                    {articles.map((article) => <ArticleRow key={article.id} article={article} />)}
                  </div>
                </Section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
