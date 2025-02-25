from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Post
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .serializers import PostSerializer

@receiver(post_save, sender=Post)
def announce_new_post(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "feed_updates",
            {
                "type": "new_post",
                "post": PostSerializer(instance).data
            }
        )