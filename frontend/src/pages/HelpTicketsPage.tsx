import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { LifeBuoy, Plus } from "lucide-react";
import { createTicket, listTickets, type Ticket, type TicketCategory } from "../api/help";
import { collectDiagnostics } from "../lib/helpDiagnostics";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, FormAlert } from "../components/ui/Field";
import { FilePicker } from "../components/ui/FilePicker";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { formatRelativeTime } from "../lib/relativeTime";
import {
  ATTACHMENT_ACCEPT, ATTACHMENT_ACCEPT_HINT, ATTACHMENT_MAX_MB,
} from "../lib/attachmentRules";
import {
  TICKET_CATEGORY_LABEL, TICKET_GROUP_LABEL, TICKET_GROUP_ORDER,
  TICKET_STATUS_LABEL, TICKET_STATUS_TONE, ticketGroup, type TicketGroupKey,
} from "../lib/ticketStatus";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] =
  (Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((value) => ({
    value,
    label: TICKET_CATEGORY_LABEL[value],
  }));

function NewTicketForm({ prefillSlug, prefillTitle, onCreated }: {
  prefillSlug: string | null;
  /** The article's human title, carried in router state from the article page. */
  prefillTitle: string | null;
  onCreated: (id: number) => void;
}) {
  const [category, setCategory] = useState<TicketCategory>("other");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const ticket = await createTicket({
        category,
        description,
        diagnosticInfo: collectDiagnostics(),
        sourceArticleSlugs: prefillSlug ? [prefillSlug] : undefined,
        files,
      });
      onCreated(ticket.id);
    } catch {
      setError("Հարցումը չհաջողվեց ուղարկել։ Գրածդ պահպանված է — փորձիր կրկին։");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]"
    >
      {/* The slug travels with the ticket so support can see which article
          failed the student, but it is developer data — printing
          `reset-password` at a reader tells them nothing and looks broken.
          Deep-linked or refreshed, router state is gone and there is no title
          to show, so the line is simply omitted rather than falling back to
          the slug. */}
      {prefillSlug && prefillTitle && (
        <p className="mb-[var(--space-3)] text-[length:var(--text-xs)] text-text-muted">
          Կապված հոդված՝{" "}
          <Link
            to={`/help/articles/${prefillSlug}`}
            className="font-medium text-text underline-offset-4 hover:underline"
          >
            {prefillTitle}
          </Link>
        </p>
      )}
      {error && <FormAlert message={error} />}

      {/* Three unlabelled controls — a native select, a placeholder-only
          textarea and a bare file input — in a form a student reaches when
          something has already gone wrong for them. */}
      <Field label="Ինչի՞ մասին է">
        {({ id }) => (
          <Select
            id={id}
            value={category}
            onChange={(v) => setCategory(v as TicketCategory)}
            options={CATEGORY_OPTIONS}
          />
        )}
      </Field>

      <Field label="Նկարագրիր խնդիրը" hint="Ի՞նչ էիր անում, ի՞նչ սպասում էիր, և ի՞նչ տեղի ունեցավ փոխարենը">
        {(props) => (
          <textarea
            {...props}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Օրինակ՝ քննությունն ավարտելուց հետո արդյունքների էջը դատարկ է…"
            rows={4}
            required
            className={cn(props.className, "resize-none")}
          />
        )}
      </Field>

      <FilePicker
        label="Կցել նկար կամ ֆայլ"
        hint={`Կամընտիր. սքրինշոթը հաճախ ամենաարագ ճանապարհն է։ ${ATTACHMENT_ACCEPT_HINT}`}
        multiple
        accept={ATTACHMENT_ACCEPT}
        maxSizeMb={ATTACHMENT_MAX_MB}
        files={files}
        onChange={setFiles}
      />

      <Button type="submit" loading={submitting} disabled={!description.trim()}>
        Ուղարկել հարցումը
      </Button>
    </form>
  );
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  return (
    <li>
      <Link
        to={`/help/tickets/${ticket.id}`}
        className={cn(
          "flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-lg)]",
          "border border-border bg-surface p-[var(--space-4)] transition-colors hover:border-primary",
        )}
      >
        <span className="min-w-0">
          <span className="block truncate font-medium text-text">{ticket.subject}</span>
          <span
            className="mt-1 block text-[length:var(--text-xs)] text-text-muted"
            title={new Date(ticket.updated_at).toLocaleString("hy-AM")}
          >
            {TICKET_CATEGORY_LABEL[ticket.category]} · {formatRelativeTime(ticket.updated_at)}
          </span>
        </span>
        <Badge tone={TICKET_STATUS_TONE[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>
      </Link>
    </li>
  );
}

export function HelpTicketsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const prefillSlug = searchParams.get("article");
  const prefillTitle = (location.state as { articleTitle?: string } | null)?.articleTitle ?? null;
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showForm, setShowForm] = useState(!!prefillSlug);

  const load = useCallback(() => {
    setLoadFailed(false);
    listTickets().then(setTickets).catch(() => setLoadFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /*
    The endpoint orders by -updated_at, which answers "what happened most
    recently" — not "what needs me". On the seeded account the one ticket
    support was blocked on sat fifth of six, wearing a badge indistinguishable
    in weight from the two closed ones above it. Grouping makes the order
    legible instead of merely present: the same lesson the mistake notebook
    learned, where a worst-first sort conveyed nothing because nothing on the
    row said so.
  */
  const groups = useMemo(() => {
    const byGroup: Record<TicketGroupKey, Ticket[]> = { waiting: [], active: [], done: [] };
    for (const t of tickets ?? []) byGroup[ticketGroup(t.status)].push(t);
    return TICKET_GROUP_ORDER.map((key) => ({ key, tickets: byGroup[key] })).filter((g) => g.tickets.length > 0);
  }, [tickets]);

  function handleCreated(id: number) {
    // Was `window.location.href`, which reloaded the entire application to
    // move one route inside it — after a submit, which is the worst moment to
    // spend two seconds on a blank screen.
    navigate(`/help/tickets/${id}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/help", label: "Օգնության կենտրոն" }}
        title="Իմ հարցումները"
        actions={
          !showForm && (
            <Button onClick={() => setShowForm(true)} iconLeft={<Plus size={16} strokeWidth={2} aria-hidden />}>
              Նոր հարցում
            </Button>
          )
        }
      />

      {showForm && (
        <div className="mb-[var(--space-8)]">
          <NewTicketForm prefillSlug={prefillSlug} prefillTitle={prefillTitle} onCreated={handleCreated} />
        </div>
      )}

      {loadFailed && !tickets ? (
        <ErrorState
          title="Հարցումների ցանկը չհաջողվեց բեռնել։"
          hint="Նոր հարցում բացելը շարունակում է աշխատել։"
          onRetry={load}
        />
      ) : !tickets ? (
        <div className="flex flex-col gap-[var(--space-3)]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : tickets.length === 0 ? (
        !showForm && (
          <EmptyState
            icon={<LifeBuoy size={26} strokeWidth={1.75} aria-hidden />}
            title="Հարցումներ դեռ չկան"
            hint="Բացիր հարցում, եթե խնդիր ունես — թիմը կպատասխանի հենց այստեղ։"
            cta={{ label: "Նոր հարցում", onClick: () => setShowForm(true) }}
          />
        )
      ) : (
        <div className="flex flex-col gap-[var(--section-gap)]">
          {groups.map((group) => (
            <Section key={group.key} title={TICKET_GROUP_LABEL[group.key]} level={3} spacing="none">
              <ul className="flex flex-col gap-[var(--space-3)]">
                {group.tickets.map((t) => <TicketRow key={t.id} ticket={t} />)}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}
