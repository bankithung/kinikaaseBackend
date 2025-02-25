from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

# Custom upload function for user thumbnails
def upload_thumbnail(instance, filename):
    path = f'thumbnails/{instance.username}'
    extension = filename.split('.')[-1]
    return f'{path}.{extension}' if extension else path

# User model extending AbstractUser
class User(AbstractUser):
    thumbnail = models.ImageField(upload_to='uploads/thumbnails/', null=True, blank=True)
    user_Bg_thumbnail = models.ImageField(upload_to='uploads/backgrounds/', null=True, blank=True)
    following = models.ManyToManyField('self', symmetrical=False, related_name='followers', blank=True)
    phone_number = models.CharField(max_length=15, unique=True, null=True, blank=True)
    last_online = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)
    fcm_token = models.CharField(max_length=255, null=True, blank=True)  # For push notifications

    def __str__(self):
        return self.username

class Connection(models.Model):
    sender = models.ForeignKey(User, related_name='sent_connections', on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_connections', on_delete=models.CASCADE)
    accepted = models.BooleanField(default=False)
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username}"

class Group(models.Model):
    name = models.CharField(max_length=255)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_groups')
    members = models.ManyToManyField(User, related_name='chat_groups')
    admins = models.ManyToManyField(User, related_name='admin_chat_groups')
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Message(models.Model):
    TEXT = 'text'
    IMAGE = 'image'
    VIDEO = 'video'
    DOCUMENT = 'document'
    AUDIO = 'audio'
    LOCATION = 'location'
    VIDEOCALL = 'videocall'
    VOICECALL = 'voicecall'
    LISTEN = 'listen'
    WATCH = 'watch'
    MESSAGE_TYPES = [
        (TEXT, 'Text'), (IMAGE, 'Image'), (VIDEO, 'Video'), (DOCUMENT, 'Document'),
        (AUDIO, 'Audio'), (LOCATION, 'Location'), (VIDEOCALL, 'Video Call'),
        (VOICECALL, 'Voice Call'), (LISTEN, 'Listen Together'), (WATCH, 'Watch Together'),
    ]
    connection = models.ForeignKey(Connection, related_name='messages', on_delete=models.CASCADE, null=True, blank=True)
    group = models.ForeignKey(Group, related_name='messages', on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(User, related_name='my_messages', on_delete=models.CASCADE)
    text = models.TextField()
    type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default=TEXT)
    created = models.DateTimeField(auto_now_add=True)
    replied_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_deleted = models.BooleanField(default=False)
    pinned = models.BooleanField(default=False)
    disappearing = models.IntegerField(null=True, blank=True)  # Seconds after which message disappears
    incognito = models.BooleanField(default=False)
    media_file = models.FileField(upload_to='uploads/messages/', null=True, blank=True)
    seen = models.BooleanField(default=False)
    seen_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.type}): {self.text}"

class Reaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} to message {self.message.id}"

class BlockedUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_users')
    blocked_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'blocked_user')

class ReportedUser(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_users')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reported_by')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'reported_user')

class ImageUpload(models.Model):
    image = models.ImageField(upload_to='uploads/images/')

    def __str__(self):
        return f"Image {self.id}"

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name='liked_posts', blank=True)
    retweets = models.ManyToManyField(User, related_name='retweeted_posts', blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='reposts')

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return f"Post {self.id} by {self.user.username}"

class PostMedia(models.Model):
    MEDIA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
    ]
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='media')
    file = models.FileField(upload_to='posts/media/')
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.media_type} for Post {self.post.id}"

# class Comment(models.Model):
#     user = models.ForeignKey(User, on_delete=models.CASCADE)
#     post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
#     content = models.TextField()
#     created = models.DateTimeField(auto_now_add=True)
#     likes = models.ManyToManyField(User, related_name='liked_comments', blank=True)
#     parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

#     class Meta:
#         ordering = ['-created']

#     def __str__(self):
#         return f"Comment {self.id} on Post {self.post.id}"


class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)  # Allow null for anonymous comments
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    likes = models.ManyToManyField(User, related_name='liked_comments', blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return f"Comment {self.id} on Post {self.post.id}"