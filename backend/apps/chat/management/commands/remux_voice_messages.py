from django.core.management.base import BaseCommand

from apps.chat.models import Attachment, AttachmentType
from apps.chat.validators import _finalize_webm_container


class Command(BaseCommand):
    """
    One-time repair for chat voice messages uploaded before the WebM-remux
    fix landed (see apps.chat.validators._finalize_webm_container): a
    Firefox-recorded voice message downloads fine but silently fails to
    play in Chrome, because Firefox's MediaRecorder leaves the Matroska
    Segment size unfinalized (a live-stream marker Chrome's own recorder
    always resolves before returning the Blob). Re-runs the same lossless
    ffmpeg remux against every stored audio/webm attachment so existing
    messages don't need to be resent. Safe to run more than once —
    remuxing an already-finalized (Chrome-recorded) file just rewrites the
    container again with no functional change.
    """

    help = "Remux existing chat voice messages so Firefox-recorded ones play in Chrome without resending."

    def handle(self, *args, **options):
        qs = Attachment.objects.filter(file_type=AttachmentType.AUDIO, mime_type="audio/webm")
        total = qs.count()
        fixed = 0
        for attachment in qs:
            with attachment.file.open("rb") as f:
                remuxed = _finalize_webm_container(f)
            if remuxed is f:
                continue
            filename = attachment.file.name.rsplit("/", 1)[-1]
            attachment.file.save(filename, remuxed, save=False)
            attachment.file_size = remuxed.size
            attachment.save(update_fields=["file", "file_size"])
            fixed += 1
        self.stdout.write(f"Remuxed {fixed}/{total} voice message(s).")
