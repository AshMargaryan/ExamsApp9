from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import DocumentAttachment


@receiver(post_delete, sender=DocumentAttachment)
def delete_attachment_file(sender, instance, **kwargs):
    """Purging a document/attachment must not leave orphaned bytes in
    storage — Django's cascade delete removes the DB row but not the file."""
    if instance.file:
        instance.file.delete(save=False)
