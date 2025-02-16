from django.contrib.auth.models import AbstractUser
from django.db import models

def upload_thumbnail(instance, filename):
    path = f'thumbnails/{instance.username}'
    extension = filename.split('.')[-1]
    if extension:
        path = path + '.' + extension
    return path

class ImageUpload(models.Model):
    image = models.ImageField(upload_to='uploads/images/')

    def __str__(self):
        return f"Image {self.id}"

class User(AbstractUser):
    thumbnail = models.ImageField(
        upload_to=upload_thumbnail,
        null=True,
        blank=True
    )
    user_Bg_thumbnail = models.ImageField(  # New field for background thumbnail
        upload_to='background_thumbnails/',
        null=True,
        blank=True
    )
    following = models.ManyToManyField(  # Many-to-Many relationship for following
        'self',
        symmetrical=False,
        related_name='followers',
        blank=True
    )

class Connection(models.Model):
    sender = models.ForeignKey(
        User,
        related_name='sent_connections',
        on_delete=models.CASCADE
    )
    receiver = models.ForeignKey(
        User,
        related_name='received_connections',
        on_delete=models.CASCADE
    )
    accepted = models.BooleanField(default=False)
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.sender.username + ' -> ' + self.receiver.username

class Message(models.Model):
    TEXT = 'text'
    IMAGE = 'image'
    FILE = 'file'

    MESSAGE_TYPES = [
        (TEXT, 'Text'),
        (IMAGE, 'Image'),
        (FILE, 'File'),
    ]

    connection = models.ForeignKey(
        Connection,
        related_name='messages',
        on_delete=models.CASCADE
    )
    user = models.ForeignKey(
        User,
        related_name='my_messages',
        on_delete=models.CASCADE
    )
    text = models.TextField()
    type = models.CharField(
        max_length=10,
        choices=MESSAGE_TYPES,
        default=TEXT  # Default to 'text'
    )
    created = models.DateTimeField(auto_now_add=True)
    replied_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    is_deleted = models.BooleanField(default=False)  # Field to mark deletion

    def __str__(self):
        return f"{self.user.username} ({self.type}): {self.text}"

    def delete_message(self):
        """Mark the message as deleted (soft delete)."""
        self.is_deleted = True
        self.save()

class AudioFile(models.Model):
    audio = models.FileField(upload_to='uploads/audio/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
