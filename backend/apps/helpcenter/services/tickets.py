from ..models import SupportTicket, TicketAttachment, TicketMessage, TicketStatus


def _save_attachments(ticket, uploaded_by, files, message=None):
    for f in files or []:
        TicketAttachment.objects.create(
            ticket=ticket,
            message=message,
            uploaded_by=uploaded_by,
            file=f,
            original_filename=f.name,
            mime_type=f.content_type or "application/octet-stream",
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

    # A user reply means the ball is back in support's court — reopen a
    # ticket that was parked waiting on the user. Anything already
    # in-progress/open/resolved/closed is left as staff set it.
    if ticket.status == TicketStatus.WAITING_FOR_YOU:
        ticket.status = TicketStatus.IN_PROGRESS
        ticket.save()

    return message
