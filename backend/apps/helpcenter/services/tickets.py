from ..models import SupportTicket, TicketAttachment, TicketMessage, TicketStatus
from ..validators import validate_attachment_file


def _save_attachments(ticket, uploaded_by, files, message=None):
    # Validate every file BEFORE creating any row, so a rejected third file
    # doesn't leave the first two already persisted.
    #
    # This used to accept any file of any size and record the client-supplied
    # f.content_type verbatim. Uploads land in MEDIA_ROOT, which nginx serves
    # at /media/ on the app's own origin, so an .html or .svg attachment was
    # stored script running with the app's origin — able to read the JWTs the
    # frontend keeps in localStorage. Sniffing the real type from the bytes is
    # what makes the extension allowlist meaningful.
    validated = [(f, validate_attachment_file(f)) for f in files or []]

    for f, mime_type in validated:
        TicketAttachment.objects.create(
            ticket=ticket,
            message=message,
            uploaded_by=uploaded_by,
            file=f,
            original_filename=f.name,
            mime_type=mime_type,
            size=f.size,
        )


def create_ticket(user, *, category, description, diagnostic_info=None,
                   source_article_slugs=None, ai_context="", files=None):
    ticket = SupportTicket.objects.create(
        user=user,
        category=category,
        description=description,
        diagnostic_info=diagnostic_info,
        source_article_slugs=source_article_slugs or [],
        ai_context=ai_context,
    )
    _save_attachments(ticket, user, files)
    return ticket


def add_message(ticket, user, *, text, files=None):
    message = TicketMessage.objects.create(ticket=ticket, sender=user, text=text)
    _save_attachments(ticket, user, files, message=message)

    # A user reply means the ball is back in support's court, so a ticket
    # parked waiting on the user reopens.
    #
    # RESOLVED reopens too, and that is a deliberate change: replying to a
    # resolved ticket is how a student says "this did not actually fix it",
    # and leaving it resolved filed that message under a status nobody is
    # working through — the reply went nowhere, silently, with the UI still
    # reporting success. CLOSED is the one terminal state and stays terminal;
    # the frontend offers a new ticket there instead of a reply box.
    if ticket.status in (TicketStatus.WAITING_FOR_YOU, TicketStatus.RESOLVED):
        ticket.status = TicketStatus.IN_PROGRESS
        ticket.save(update_fields=["status", "updated_at"])

    return message
