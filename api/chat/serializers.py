from rest_framework import serializers
from .models import User, Connection, Message, ImageUpload, Group, Reaction, Post, PostMedia, Comment
from django.core.files.storage import default_storage
import re
from django.utils import timezone
import datetime

class UserBgThumbnailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['user_Bg_thumbnail']

class ImageUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImageUpload
        fields = ['image']

class AudioUploadSerializer(serializers.Serializer):
    audio = serializers.FileField()

    def create(self, validated_data):
        try:
            return default_storage.save(f'uploads/audio/{validated_data["audio"].name}', validated_data["audio"])
        except Exception as e:
            raise serializers.ValidationError(f"Failed to save audio file: {str(e)}")

class SignUpSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        username = validated_data['username'].lower()
        first_name = validated_data['first_name'].lower()
        last_name = validated_data['last_name'].lower()
        user = User.objects.create(username=username, first_name=first_name, last_name=last_name)
        user.set_password(validated_data['password'])
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    online = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'name', 'thumbnail', 'user_Bg_thumbnail', 'following', 'followers', 'online']

    def get_name(self, obj):
        return f"{obj.first_name.capitalize()} {obj.last_name.capitalize()}"

    def get_online(self, obj):
        return obj.is_online and (timezone.now() - obj.last_online).total_seconds() < 300

class SearchSerializer(UserSerializer):
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['username', 'name', 'thumbnail', 'status']

    def get_status(self, obj):
        if obj.pending_them:
            return 'pending-them'
        elif obj.pending_me:
            return 'pending-me'
        elif obj.connected:
            return 'connected'
        return 'no-connection'

class RequestSerializer(serializers.ModelSerializer):
    sender = UserSerializer()
    receiver = UserSerializer()

    class Meta:
        model = Connection
        fields = ['id', 'sender', 'receiver', 'created']

class GroupSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True)
    admins = UserSerializer(many=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'creator', 'members', 'admins', 'created']

class ReactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reaction
        fields = ['id', 'message', 'user', 'emoji', 'created']

class FriendSerializer(serializers.ModelSerializer):
    friend = serializers.SerializerMethodField()
    preview = serializers.SerializerMethodField()
    updated = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Connection
        fields = ['id', 'friend', 'preview', 'updated', 'unread_count']

    def get_friend(self, obj):
        user = self.context['user']
        return UserSerializer(obj.receiver if user == obj.sender else obj.sender).data

    def get_preview(self, obj):
        return getattr(obj, 'latest_text', 'New connection') or 'New connection'

    def get_updated(self, obj):
        date = getattr(obj, 'latest_created', obj.updated) or obj.updated
        return date.isoformat()

    def get_unread_count(self, obj):
        user = self.context['user']
        other_user = obj.sender if user == obj.receiver else obj.receiver
        return Message.objects.filter(connection=obj, user=other_user, seen=False).count()

class MessageSerializer(serializers.ModelSerializer):
    is_me = serializers.SerializerMethodField()
    replied_to_message = serializers.SerializerMethodField()
    reactions = ReactionSerializer(many=True, read_only=True)
    mentions = serializers.SerializerMethodField()
    seen = serializers.BooleanField(read_only=True)
    seen_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'is_me', 'text', 'created', 'type', 'replied_to', 'replied_to_message',
            'reactions', 'mentions', 'is_deleted', 'pinned', 'disappearing', 'incognito',
            'seen', 'seen_at', 'media_file'
        ]

    def get_is_me(self, obj):
        # Try to get the user directly from the context (used in WebSocket consumer)
        user = self.context.get('user')
        if user is None:
            # If 'user' is not present, get it from the request (used in API views)
            request = self.context.get('request')
            if request and hasattr(request, 'user'):
                user = request.user
        # Compare the user with the message's user if user is available
        return user == obj.user if user else False

    # Other methods (unchanged)
    def get_replied_to_message(self, obj):
        if obj.replied_to:
            return {
                'id': obj.replied_to.id,
                'text': obj.replied_to.text,
                'type': obj.replied_to.type,
                'user': obj.replied_to.user.username,
                'created': obj.replied_to.created.isoformat(),
            }
        return None

    def get_mentions(self, obj):
        if obj.type == 'text':
            return re.findall(r'@(\w+)', obj.text)
        return []

    def update(self, instance, validated_data):
        instance.is_deleted = validated_data.get('is_deleted', instance.is_deleted)
        instance.text = validated_data.get('text', instance.text)
        instance.save()
        return instance
class PostMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostMedia
        fields = ['media_type', 'file']

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'content', 'user', 'post', 'created']
        read_only_fields = ['user', 'post', 'created']

    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Comment content cannot be empty.")
        return value

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    media = PostMediaSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    retweets_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_retweeted = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'content', 'created', 'media', 'comments',
            'likes_count', 'retweets_count', 'is_liked', 'is_retweeted'
        ]

    def get_likes_count(self, obj):
        return obj.likes.count()

    def get_retweets_count(self, obj):
        return obj.retweets.count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        return request.user.is_authenticated and obj.likes.filter(id=request.user.id).exists()

    def get_is_retweeted(self, obj):
        request = self.context.get('request')
        return request.user.is_authenticated and obj.retweets.filter(id=request.user.id).exists()

class CreatePostSerializer(serializers.ModelSerializer):
    media = serializers.ListField(
        child=serializers.FileField(max_length=100000, allow_empty_file=False),
        write_only=True,
        required=False
    )

    class Meta:
        model = Post
        fields = ['content', 'media']

    def create(self, validated_data):
        media_files = validated_data.pop('media', [])
        post = Post.objects.create(user=self.context['request'].user, **validated_data)
        for file in media_files:
            media_type = 'image' if 'image' in file.content_type else 'video'
            PostMedia.objects.create(post=post, file=file, media_type=media_type)
        return post