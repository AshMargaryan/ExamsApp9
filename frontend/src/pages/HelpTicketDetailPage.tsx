import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { LifeBuoy, Paperclip } from "lucide-react";
import { getTicket, replyToTicket, type TicketAttachment, type TicketDetail, type TicketStatus } from "../api/help";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ExternalLinkButton, LinkButton } from "../components/ui/LinkButton";

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

function AttachmentList({ attachments }: { attachments: TicketAttachment[] }) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((a) => (
        <ExternalLinkButton
          key={a.id}
          href={a.download_url}
          target="_blank"
          rel="noreferrer"
          className="h-7 px-2 text-xs"
        >
          <Paperclip className="mr-1 inline" size={12} strokeWidth={1.75} /> {a.original_filename}
        </ExternalLinkButton>
      ))}
    </div>
  );
}

function Bubble({ isStaff, text, attachments, createdAt }: {
  isStaff: boolean; text: string; attachments: TicketAttachment[]; createdAt: string;
}) {
  return (
    <div className={`flex ${isStaff ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-[var(--radius)] border p-3 ${
          isStaff ? "border-border bg-surface" : "border-primary bg-primary/10"
        }`}
      >
        <p className="text-xs font-medium text-text-muted">{isStaff ? "Աջակցության թիմ" : "Դուք"}</p>
        {text && <p className="mt-1 whitespace-pre-wrap text-sm text-text">{text}</p>}
        <AttachmentList attachments={attachments} />
        <p className="mt-1 text-[10px] text-text-muted">{new Date(createdAt).toLocaleString("hy-AM")}</p>
      </div>
    </div>
  );
}

function ReplyBox({ ticketId, onSent }: { ticketId: number; onSent: () => void }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      await replyToTicket(ticketId, text, files);
      setText("");
      setFiles([]);
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Գրեք պատասխան…"
        rows={3}
        className="resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="min-w-0 max-w-full text-sm text-text-muted"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && files.length === 0)}
          className="shrink-0 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {sending ? "Ուղարկվում է…" : "Ուղարկել"}
        </button>
      </div>
    </form>
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

  return (
    <div className="mx-auto max-w-2xl px-4 pt-8 pb-28">
      <LinkButton to="/help/tickets" className="mb-4">← Իմ հարցումները</LinkButton>

      {notFound ? (
        <EmptyState icon={<LifeBuoy size={26} strokeWidth={1.75} />} title="Հարցումը չի գտնվել" />
      ) : !ticket ? (
        <div className="flex flex-col gap-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-surface-muted" />
          <div className="h-24 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-text">{ticket.subject}</h1>
              <p className="mt-1 text-xs text-text-muted">
                Բացվել է՝ {new Date(ticket.created_at).toLocaleString("hy-AM")}
              </p>
            </div>
            <Badge tone={STATUS_TONE[ticket.status]}>{STATUS_LABEL[ticket.status]}</Badge>
          </div>

          <div className="flex flex-col gap-3">
            <Bubble
              isStaff={false}
              text={ticket.description}
              attachments={ticket.attachments}
              createdAt={ticket.created_at}
            />
            {ticket.messages.map((m) => (
              <Bubble
                key={m.id}
                isStaff={m.is_staff}
                text={m.text}
                attachments={m.attachments}
                createdAt={m.created_at}
              />
            ))}
          </div>

          <ReplyBox ticketId={ticket.id} onSent={reload} />
        </>
      )}
    </div>
  );
}
