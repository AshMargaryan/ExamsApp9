import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, LifeBuoy, Loader2, Paperclip } from "lucide-react";
import { getTicket, replyToTicket, type TicketAttachment, type TicketDetail } from "../api/help";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Field, FormAlert } from "../components/ui/Field";
import { FilePicker } from "../components/ui/FilePicker";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { downloadAuthenticatedFile } from "../lib/authenticatedFile";
import { cn } from "../lib/cn";
import { formatBytes } from "../lib/formatBytes";
import { formatRelativeTime } from "../lib/relativeTime";
import {
  ATTACHMENT_ACCEPT, ATTACHMENT_ACCEPT_HINT, ATTACHMENT_MAX_MB,
} from "../lib/attachmentRules";
import {
  TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, TICKET_STATUS_TONE, ticketAcceptsReply,
} from "../lib/ticketStatus";

/*
  An attachment is served by an authenticated endpoint
  (apps/helpcenter/views.py TicketAttachmentDownloadView), so the plain
  `<a href target="_blank">` this used to render sent no Authorization header
  and answered 401 — every attachment in the help centre was undownloadable,
  including anything support sent back. Chat and the note editor already fetch
  these through `downloadAuthenticatedFile`; this is the third caller.
*/
function AttachmentButton({ attachment }: { attachment: TicketAttachment }) {
  const [state, setState] = useState<"idle" | "loading" | "failed">("idle");

  async function download() {
    setState("loading");
    try {
      await downloadAuthenticatedFile(attachment.download_url, attachment.original_filename);
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={state === "loading"}
      className={cn(
        "flex w-full max-w-full items-center gap-[var(--space-2)] rounded-[var(--radius-md)]",
        "border border-border bg-bg px-[var(--space-2)] py-1 text-left",
        "text-[length:var(--text-xs)] text-text transition-colors",
        "hover:border-primary disabled:opacity-60",
        state === "failed" && "border-incorrect",
      )}
    >
      {state === "loading" ? (
        <Loader2 size={12} strokeWidth={2} aria-hidden className="shrink-0 animate-spin" />
      ) : (
        <Paperclip size={12} strokeWidth={1.75} aria-hidden className="shrink-0" />
      )}
      <span className="min-w-0 flex-1 truncate">{attachment.original_filename}</span>
      <span className="shrink-0 tabular-nums text-text-muted">{formatBytes(attachment.size)}</span>
      {state === "failed" ? (
        <span className="shrink-0 text-incorrect">Չհաջողվեց</span>
      ) : (
        <Download size={12} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
      )}
    </button>
  );
}

function AttachmentList({ attachments }: { attachments: TicketAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <ul className="mt-[var(--space-2)] flex flex-col gap-1">
      {attachments.map((a) => (
        <li key={a.id}>
          <AttachmentButton attachment={a} />
        </li>
      ))}
    </ul>
  );
}

function Message({ isStaff, text, attachments, createdAt }: {
  isStaff: boolean; text: string; attachments: TicketAttachment[]; createdAt: string;
}) {
  return (
    <div className={cn("flex", isStaff ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "min-w-0 max-w-[85%] rounded-[var(--radius-lg)] border p-[var(--space-3)]",
          isStaff ? "border-border bg-surface" : "border-primary-line bg-primary-bg",
        )}
      >
        <p className="text-[length:var(--text-xs)] font-medium text-text-muted">
          {isStaff ? "Աջակցության թիմ" : "Դու"}
        </p>
        {text && (
          <p className="mt-1 wrap-anywhere whitespace-pre-wrap text-[length:var(--text-sm)] text-text">{text}</p>
        )}
        <AttachmentList attachments={attachments} />
        <p
          className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted"
          title={new Date(createdAt).toLocaleString("hy-AM")}
        >
          {formatRelativeTime(createdAt)}
        </p>
      </div>
    </div>
  );
}

function ReplyBox({ ticketId, onSent }: { ticketId: number; onSent: () => void }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await replyToTicket(ticketId, text, files);
      setText("");
      setFiles([]);
      onSent();
    } catch {
      // Was `try/finally` with no catch, so a failed reply cleared the
      // spinner and said nothing — indistinguishable from having been sent,
      // except that the message never appeared in the thread.
      setError("Պատասխանը չհաջողվեց ուղարկել։ Գրածդ պահպանված է — փորձիր կրկին։");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-[var(--space-6)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-4)]"
    >
      {error && <FormAlert message={error} />}
      <Field label="Պատասխան">
        {(props) => (
          <textarea
            {...props}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Գրիր պատասխան…"
            rows={3}
            className={cn(props.className, "resize-none")}
          />
        )}
      </Field>
      <FilePicker
        label="Կցել ֆայլ"
        hint={ATTACHMENT_ACCEPT_HINT}
        multiple
        accept={ATTACHMENT_ACCEPT}
        maxSizeMb={ATTACHMENT_MAX_MB}
        files={files}
        onChange={setFiles}
      />
      <Button type="submit" loading={sending} disabled={!text.trim() && files.length === 0}>
        Ուղարկել
      </Button>
    </form>
  );
}

/** A closed ticket accepts replies the backend files under a status nobody
 *  works through, so it says so rather than accepting a message into a void. */
function ClosedNotice() {
  return (
    <div className="mt-[var(--space-6)] rounded-[var(--radius-lg)] border border-border bg-surface-muted p-[var(--space-4)]">
      <p className="text-[length:var(--text-sm)] font-medium text-text">Այս հարցումը փակված է։</p>
      <p className="mt-1 text-[length:var(--text-sm)] text-text-muted">
        Եթե խնդիրը կրկնվել է, բացիր նոր հարցում — այնտեղ թիմը կտեսնի այն։
      </p>
      <Link
        to="/help/tickets"
        className="mt-[var(--space-3)] inline-flex text-[length:var(--text-sm)] font-medium text-primary underline-offset-4 hover:underline"
      >
        Բացել նոր հարցում
      </Link>
    </div>
  );
}

export function HelpTicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  function reload() {
    if (!ticketId) return;
    getTicket(Number(ticketId)).then(setTicket).catch(() => setNotFound(true));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // `subject` is auto-derived from the first 60 characters of `description`
  // (apps/helpcenter/models.py SupportTicket.save), so for any short ticket
  // the two are byte-identical — and the page printed the same sentence as
  // its h1 and again as the first message. Only show the body when it says
  // more than the title already did.
  const descriptionAddsSomething = !!ticket && ticket.description !== ticket.subject;

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
      {notFound ? (
        <>
          <PageHeader title="Հարցում" back={{ to: "/help/tickets", label: "Իմ հարցումները" }} />
          <EmptyState
            icon={<LifeBuoy size={26} strokeWidth={1.75} aria-hidden />}
            title="Հարցումը չի գտնվել"
            hint="Հնարավոր է՝ այն ջնջվել է։ Բոլոր հարցումներդ ցանկում են։"
          />
        </>
      ) : !ticket ? (
        <div className="flex flex-col gap-[var(--space-4)]">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          <PageHeader
            back={{ to: "/help/tickets", label: "Իմ հարցումները" }}
            // The category the student chose was never shown again anywhere.
            eyebrow={TICKET_CATEGORY_LABEL[ticket.category]}
            // The subject is the student's own first sentence, not a page
            // name — see PageHeader's `size` note.
            title={ticket.subject}
            size="prose"
            description={
              <span title={new Date(ticket.created_at).toLocaleString("hy-AM")}>
                Բացվել է {formatRelativeTime(ticket.created_at)}
              </span>
            }
            actions={<Badge tone={TICKET_STATUS_TONE[ticket.status]}>{TICKET_STATUS_LABEL[ticket.status]}</Badge>}
          />

          <div className="flex flex-col gap-[var(--space-3)]">
            {(descriptionAddsSomething || ticket.attachments.length > 0) && (
              <Message
                isStaff={false}
                text={descriptionAddsSomething ? ticket.description : ""}
                attachments={ticket.attachments}
                createdAt={ticket.created_at}
              />
            )}
            {ticket.messages.map((m) => (
              <Message
                key={m.id}
                isStaff={m.is_staff}
                text={m.text}
                attachments={m.attachments}
                createdAt={m.created_at}
              />
            ))}
          </div>

          {ticketAcceptsReply(ticket.status) ? (
            <ReplyBox ticketId={ticket.id} onSent={reload} />
          ) : (
            <ClosedNotice />
          )}
        </>
      )}
    </div>
  );
}
