import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bot, ChevronRight, CreditCard, FileText, LifeBuoy, Search, SearchX, UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  listCategories, listPopularArticles, listTickets, searchArticles,
  type ArticleSummary, type Category, type Ticket,
} from "../api/help";
import { ArticleRow } from "../components/help/ArticleRow";
import { Card } from "../components/ui/Card";
import { Section } from "../components/ui/Section";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { fieldInputClass } from "../components/ui/Field";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { ticketGroup } from "../lib/ticketStatus";

/*
  The category's `icon` field holds a server-stored emoji — 👤 for the account
  category, 🤖 for the AI assistant. Unlike an achievement's emblem, which the
  product treats as the badge's own content, these are plain UI iconography
  for a fixed, small set of keys, so they map to the one icon language.
  Anything unmapped falls back rather than rendering whatever the row holds.
*/
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  account: UserRound,
  "ai-assistant": Bot,
  payment: CreditCard,
  billing: CreditCard,
};

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/*
  Where the student's own tickets are.

  The landing page had no route to them at all: the only link to /help/tickets
  was a button at the very bottom labelled "Դիմել աջակցության թիմին", which
  reads as "open a new one". So a student whose ticket was parked
  waiting_for_you — meaning support is blocked on *them* — could open the help
  centre and be told nothing about it, while three static articles took the
  whole page. It only renders when there is something to say, so a first-time
  visitor still sees a clean page.
*/
function MyTicketsRow({ tickets }: { tickets: Ticket[] }) {
  const waiting = tickets.filter((t) => ticketGroup(t.status) === "waiting").length;
  const active = tickets.filter((t) => ticketGroup(t.status) !== "done").length;
  if (tickets.length === 0) return null;

  return (
    <Link
      to="/help/tickets"
      className={cn(
        "mb-[var(--space-6)] flex items-center gap-[var(--space-3)] rounded-[var(--radius-lg)]",
        "border bg-surface p-[var(--space-4)] transition-colors hover:border-primary",
        waiting > 0 ? "border-accent-line bg-accent-bg" : "border-border",
      )}
    >
      <LifeBuoy
        size={20}
        strokeWidth={1.75}
        aria-hidden
        className={cn("shrink-0", waiting > 0 ? "text-accent" : "text-text-muted")}
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-text">Իմ հարցումները</span>
        <span className="mt-0.5 block text-[length:var(--text-sm)] text-text-muted">
          {waiting > 0
            ? `${waiting} հարցում սպասում է քո պատասխանին`
            : active > 0
              ? `${active} բաց հարցում`
              : "Բոլորը փակված են"}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
    </Link>
  );
}

/** The escape hatch, shown under every branch of this page — including the
 *  error branch, where reaching a human matters most. */
function ContactCard() {
  return (
    <Card className="flex flex-col items-start gap-[var(--space-2)]">
      <p className="font-medium text-text">Չգտա՞ր, ինչ փնտրում էիր</p>
      <p className="text-[length:var(--text-sm)] text-text-muted">
        Բացիր հարցում, և մեր թիմը կպատասխանի քեզ։ Կարող ես նաև հարցնել AI Օգնականին՝ արագ պատասխանի համար։
      </p>
      <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-3)]">
        <LinkButton to="/help/tickets" variant="primary" size="md">
          Բացել հարցում
        </LinkButton>
        <LinkButton to="/assistant" variant="secondary" size="md">
          Հարցնել AI Օգնականին
        </LinkButton>
      </div>
    </Card>
  );
}

export function HelpCenterPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [searchResults, setSearchResults] = useState<ArticleSummary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [popular, setPopular] = useState<ArticleSummary[] | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(() => {
    setLoadFailed(false);
    // Both were unguarded, so a help centre that could not reach the server
    // showed shimmering placeholders indefinitely — on the one page a student
    // opens *because* something is already going wrong.
    Promise.all([
      listCategories().then(setCategories),
      listPopularArticles().then(setPopular),
    ]).catch(() => setLoadFailed(true));
    // Supplementary: if this fails the page is still a working help centre,
    // so it degrades to not mentioning tickets rather than to an error.
    listTickets().then(setTickets).catch(() => setTickets([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const trimmedQuery = debouncedQuery.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      setSearchResults(null);
      setSearching(false);
      setSearchFailed(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchFailed(false);
    // Clear first: keeping the previous query's hits on screen under the new
    // query's heading claims they are results for a search that has not run.
    setSearchResults(null);
    searchArticles(trimmedQuery)
      .then((results) => {
        if (!cancelled) setSearchResults(results);
      })
      // Was unguarded: a failed search left the previous query's results on
      // screen under the new query's heading, which is worse than an error.
      .catch(() => {
        if (!cancelled) {
          setSearchResults(null);
          setSearchFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trimmedQuery, searchAttempt]);

  const showingSearch = !!trimmedQuery;

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      {/* Was an emoji in the `h1` and a `text-3xl` title in the body face —
          a page title that read as larger body text with a glyph in front. */}
      <PageHeader
        title="Օգնության կենտրոն"
        description="Փնտրիր պատասխան, կամ գրիր մեզ ուղղակիորեն։"
        back={{ to: "/", label: "Գլխավոր" }}
      />

      <MyTicketsRow tickets={tickets} />

      <div className="relative mb-[var(--space-8)]">
        <Search
          size={18}
          strokeWidth={1.75}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-[var(--space-4)] -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Փնտրել օգնության հոդվածներում"
          placeholder="Ինչո՞վ կարող ենք օգնել…"
          className={cn(fieldInputClass, "py-3 pl-11")}
        />
      </div>

      {showingSearch ? (
        <Section spacing="none" title={`Արդյունքներ՝ «${trimmedQuery}»`}>
          {searching && !searchResults ? (
            <div className="flex flex-col gap-[var(--space-3)]">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : searchFailed ? (
            <ErrorState
              title="Որոնումը չհաջողվեց։"
              hint="Ստուգիր կապը և փորձիր կրկին։"
              onRetry={() => setSearchAttempt((n) => n + 1)}
            />
          ) : !searchResults || searchResults.length === 0 ? (
            <EmptyState
              icon={<SearchX size={26} strokeWidth={1.75} aria-hidden />}
              title="Ոչինչ չգտնվեց"
              hint="Փորձիր այլ բառեր, կամ գրիր աջակցության թիմին։"
              /* Was `window.location.href`, which reloads the whole
                 application to move one route inside it. */
              cta={{ label: "Բացել հարցում", onClick: () => navigate("/help/tickets") }}
            />
          ) : (
            <div className="flex flex-col gap-[var(--space-3)]">
              {searchResults.map((a) => (
                <ArticleRow key={a.id} article={a} />
              ))}
            </div>
          )}
        </Section>
      ) : loadFailed ? (
        <div className="flex flex-col gap-[var(--space-8)]">
          <ErrorState
            title="Օգնության կենտրոնը չհաջողվեց բեռնել։"
            hint="Կարող ես անմիջապես հարցում բացել կամ հարցնել AI Օգնականին։"
            onRetry={load}
          />
          <ContactCard />
        </div>
      ) : (
        <div className="flex flex-col gap-[var(--space-8)]">
          <Section spacing="none" title="Կատեգորիաներ">
            {!categories ? (
              <div className="grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-3">
                {categories.map((c) => {
                  const Icon = CATEGORY_ICONS[c.key] ?? LifeBuoy;
                  return (
                    <Link
                      key={c.key}
                      to={`/help/${c.key}`}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-[var(--radius-lg)] border border-border",
                        "bg-surface p-[var(--space-4)] text-center transition-colors hover:border-primary",
                      )}
                    >
                      <Icon size={22} strokeWidth={1.75} aria-hidden className="text-primary" />
                      <span className="text-[length:var(--text-sm)] font-medium text-text">{c.name}</span>
                      <span className="text-[length:var(--text-xs)] text-text-muted">{c.article_count} հոդված</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </Section>

          <Section spacing="none" title="Հաճախ դիտվող հոդվածներ">
            {!popular ? (
              <div className="flex flex-col gap-[var(--space-3)]">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : popular.length === 0 ? (
              <EmptyState
                icon={<FileText size={26} strokeWidth={1.75} aria-hidden />}
                title="Հոդվածներ դեռ չկան"
                hint="Մինչ այդ՝ գրիր աջակցության թիմին կամ հարցրու AI Օգնականին։"
              />
            ) : (
              <div className="flex flex-col gap-[var(--space-3)]">
                {popular.map((a) => <ArticleRow key={a.id} article={a} />)}
              </div>
            )}
          </Section>

          <ContactCard />
        </div>
      )}
    </div>
  );
}
