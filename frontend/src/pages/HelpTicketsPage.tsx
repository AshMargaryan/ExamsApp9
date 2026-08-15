import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { LifeBuoy } from "lucide-react";
import { createTicket, listTickets, type Ticket, type TicketCategory, type TicketStatus } from "../api/help";
import { collectDiagnostics } from "../lib/helpDiagnostics";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "account", label: "Հաշիվ" },
  { value: "ai", label: "AI Օգնական" },
  { value: "payment", label: "Վճարում" },
  { value: "bug", label: "Վրիպակ" },
  { value: "study_feature", label: "Ուսումնական հնարավորություն" },
  { value: "other", label: "Այլ" },
];

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Բաց",
  waiting_for_you: "Սպասում է ձեզ",
  in_progress: "Ընթացքի մեջ",
  resolved: "Լուծված",
  closed: "Փակված",
};

const STATUS_TONE: Record<TicketStatus, "neutral" | "primary" | "correct" | "incorrect"> = {
  open: "primary",
  waiting_for_you: "incorrect",
  in_progress: "primary",
  resolved: "correct",
  closed: "neutral",
};

function NewTicketForm({ prefillSlug, onCreated }: { prefillSlug: string | null; onCreated: (id: number) => void }) {
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
        category, description,
        diagnosticInfo: collectDiagnostics(),
        sourceArticleSlugs: prefillSlug ? [prefillSlug] : [],
        files,
      });
      onCreated(ticket.id);
    } catch {
      setError("Չհաջողվեց ուղարկել հարցումը։ Փորձեք կրկին։");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-5">
      {prefillSlug && (
        <p className="text-xs text-text-muted">Կապված հոդված՝ {prefillSlug}</p>
      )}
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value as TicketCategory)}
        className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      >
        {CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Նկարագրեք ձեր խնդիրը…"
        rows={4}
        required
        className="resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
      />
      <input
        type="file"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        className="text-sm text-text-muted"
      />
      {error && <p className="text-sm text-incorrect">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !description.trim()}
        className="self-start rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Ուղարկվում է…" : "Ուղարկել հարցումը"}
      </button>
    </form>
  );
}

export function HelpTicketsPage() {
  const [searchParams] = useSearchParams();
  const prefillSlug = searchParams.get("article");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [showForm, setShowForm] = useState(!!prefillSlug);

  useEffect(() => {
    listTickets().then(setTickets);
  }, []);

  function handleCreated(id: number) {
    window.location.href = `/help/tickets/${id}`;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-28">
      <LinkButton to="/help" className="mb-4">← Օգնության կենտրոն</LinkButton>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Իմ հարցումները</h1>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:opacity-90"
          >
            + Նոր հարցում
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-8">
          <NewTicketForm prefillSlug={prefillSlug} onCreated={handleCreated} />
        </div>
      )}

      {!tickets ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ))}
        </div>
      ) : tickets.length === 0 ? (
        !showForm && <EmptyState icon={<LifeBuoy size={26} strokeWidth={1.75} />} title="Հարցումներ դեռ չկան" hint="Բացեք հարցում, եթե խնդիր ունեք։" />
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              to={`/help/tickets/${t.id}`}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-primary"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text">{t.subject}</p>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(t.updated_at).toLocaleString("hy-AM")}
                </p>
              </div>
              <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
