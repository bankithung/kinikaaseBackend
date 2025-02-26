from django.contrib.auth import authenticate
from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import json

import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from django.conf import settings
from .models import (
    Message, User, Connection, Group, Reaction, BlockedUser, ReportedUser, Post, Comment, ImageUpload
)
from .serializers import (
    UserSerializer, SignUpSerializer, ImageUploadSerializer, AudioUploadSerializer,
    UserBgThumbnailSerializer, MessageSerializer, GroupSerializer, ReactionSerializer,
    PostSerializer, CreatePostSerializer, CommentSerializer
)

logger = logging.getLogger(__name__)

# chat/views.py
import logging
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from django.conf import settings
import json

logger = logging.getLogger(__name__)

def send_fcm_notification(fcm_token, title, body, custom_payload=None):
    """
    Send an FCM notification to a specific device.
    
    Args:
        fcm_token (str): The FCM token of the recipient device.
        title (str): Notification title.
        body (str): Notification body.
        custom_payload (dict): Optional custom payload for the notification.
    
    Returns:
        dict: FCM response or None if failed.
    """
    if not fcm_token:
        logger.error("FCM token is missing")
        return None

    project_id = "kinikaasenotification"
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"

    try:
        credentials = service_account.Credentials.from_service_account_file(
            settings.GOOGLE_APPLICATION_CREDENTIALS,
            scopes=["https://www.googleapis.com/auth/firebase.messaging"]
        )
        credentials.refresh(Request())
        access_token = credentials.token
    except Exception as e:
        logger.error(f"Failed to generate FCM access token: {str(e)}")
        return None

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    # Use custom payload if provided, otherwise create a default one
    payload = custom_payload or {
        "message": {
            "token": fcm_token,
            "notification": {
                "title": title,
                "body": body
            },
            "data": {
                "click_action": "OPEN_CHAT"
            },
            "android": {
                "priority": "high"
            },
            "apns": {
                "headers": {
                    "apns-priority": "10"
                }
            }
        }
    }

    try:
        logger.debug(f"Sending FCM notification to {fcm_token}: {json.dumps(payload, indent=2)}")
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"FCM notification sent successfully: {response.json()}")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"FCM request failed: {str(e)} - Response: {e.response.text if e.response else 'No response'}")
        return None

def get_auth_for_user(user):
    """
    Generate authentication tokens and serialized user data for a given user.
    """
    tokens = RefreshToken.for_user(user)
    return {
        'user': UserSerializer(user).data,
        'tokens': {'access': str(tokens.access_token), 'refresh': str(tokens)},
    }

class UpdateFCMTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        fcm_token = request.data.get('fcm_token')
        if not fcm_token:
            return Response({'error': 'FCM token is required'}, status=status.HTTP_400_BAD_REQUEST)
        user.fcm_token = fcm_token
        user.save()
        return Response({'success': 'FCM token updated'}, status=status.HTTP_200_OK)

class UploadBgThumbnailView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        user = request.user
        serializer = UserBgThumbnailSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Background thumbnail uploaded for user: {user.username}")
            return Response({'message': 'Background thumbnail uploaded successfully!'}, status=status.HTTP_200_OK)
        logger.error(f"Error uploading background thumbnail: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ImageUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        serializer = ImageUploadSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Image uploaded: {serializer.data['image']}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Error uploading image: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VideoUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        if 'video' not in request.FILES:
            logger.warning(f"Video file missing for user {request.user.username}")
            return Response({'error': 'Video file is required'}, status=status.HTTP_400_BAD_REQUEST)
        file = request.FILES['video']
        file_name = default_storage.save(f'uploads/videos/{file.name}', file)
        file_url = default_storage.url(file_name)
        logger.info(f"Video uploaded: {file_url}")
        return Response({'message': 'Video uploaded successfully', 'video': file_url}, status=status.HTTP_201_CREATED)

class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        if 'document' not in request.FILES:
            logger.warning(f"Document file missing for user {request.user.username}")
            return Response({'error': 'Document file is required'}, status=status.HTTP_400_BAD_REQUEST)
        file = request.FILES['document']
        file_name = default_storage.save(f'uploads/documents/{file.name}', file)
        file_url = default_storage.url(file_name)
        logger.info(f"Document uploaded: {file_url}")
        return Response({'message': 'Document uploaded successfully', 'document': file_url}, status=status.HTTP_201_CREATED)

class AudioUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        serializer = AudioUploadSerializer(data=request.data)
        if serializer.is_valid():
            file_name = serializer.save()
            file_url = default_storage.url(file_name)
            logger.info(f"Audio uploaded: {file_url}")
            return Response({'message': 'Audio uploaded successfully', 'audio': file_url}, status=status.HTTP_201_CREATED)
        logger.error(f"Error uploading audio: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SignInView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        if not username or not password:
            logger.warning("Sign-in attempt with missing credentials")
            return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)
        user = authenticate(username=username, password=password)
        if not user:
            logger.warning(f"Failed sign-in attempt for {username}")
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        user_data = get_auth_for_user(user)
        logger.info(f"User {username} signed in successfully")
        return Response(user_data)

class SignUpView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignUpSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            user_data = get_auth_for_user(user)
            logger.info(f"User {user.username} signed up successfully")
            return Response(user_data, status=status.HTTP_201_CREATED)
        logger.error(f"Signup error: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DeleteMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            message = Message.objects.get(pk=pk, user=request.user)
            serializer = MessageSerializer(message, data={'is_deleted': True}, partial=True)
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Message {pk} deleted by {request.user.username}")

                # Determine connectionId and recipients
                connection_id = None
                if message.connection:
                    connection_id = str(message.connection.id)
                    recipient = message.connection.sender if message.connection.sender != request.user else message.connection.receiver
                    recipients = [request.user, recipient]
                elif message.group:
                    connection_id = f"group_{message.group.id}"
                    recipients = message.group.members.all()
                else:
                    recipients = []

                # Broadcast the deletion via WebSocket
                channel_layer = get_channel_layer()
                for recipient in recipients:
                    logger.info(f"Broadcasting message.delete to {recipient.username} for message {pk}")
                    async_to_sync(channel_layer.group_send)(
                        recipient.username,
                        {
                            "type": "broadcast_group",
                            "message": {
                                "source": "message.delete",
                                "data": {
                                    "messageId": pk,
                                    "connectionId": connection_id
                                }
                            }
                        }
                    )
                return Response({"success": "Message deleted successfully"}, status=status.HTTP_200_OK)
            logger.error(f"Error deleting message {pk}: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Message.DoesNotExist:
            logger.warning(f"Message {pk} not found for deletion by {request.user.username}")
            return Response({"error": "Message not found"}, status=status.HTTP_404_NOT_FOUND)
        
class EditMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        message = get_object_or_404(Message, pk=pk, user=request.user)
        # Check edit window (5 minutes)
        if (timezone.now() - message.created).total_seconds() > 300:
            logger.warning(f"Edit time expired for message {pk} by {request.user.username}")
            return Response({"error": "Edit time expired"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = MessageSerializer(message, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Message {pk} edited by {request.user.username}")

            # Broadcast the edited message via WebSocket
            channel_layer = get_channel_layer()
            serialized_message = MessageSerializer(message, context={'request': request}).data
            
            # Determine recipients
            if message.connection:
                recipient = message.connection.sender if message.connection.sender != request.user else message.connection.receiver
                recipients = [request.user, recipient]
            elif message.group:
                recipients = message.group.members.all()
            else:
                recipients = []

            # Broadcast to all recipients
            for recipient in recipients:
                async_to_sync(channel_layer.group_send)(
                    recipient.username,
                    {
                        "type": "broadcast_group",
                        "message": {
                            "source": "message.update",
                            "data": {"message": serialized_message}
                        }
                    }
                )
            return Response(serializer.data)
        logger.error(f"Error editing message {pk}: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)  

class PinMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        message = get_object_or_404(Message, pk=pk)
        message.pinned = not message.pinned
        message.save()
        action = "pinned" if message.pinned else "unpinned"
        logger.info(f"Message {pk} {action} by {request.user.username}")
        return Response({"success": f"Message {action}"}, status=status.HTTP_200_OK)

class AddReactionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(Message, id=message_id)
        emoji_data = request.data.get('emoji')
        if not emoji_data:
            return Response({"error": "Emoji is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        emoji = emoji_data.strip() if isinstance(emoji_data, str) else emoji_data.get('emoji', '').strip()
        if not emoji:
            return Response({"error": "Invalid emoji format"}, status=status.HTTP_400_BAD_REQUEST)
        
        max_length = 255
        if len(emoji) > max_length:
            emoji = emoji[:max_length]
        
        reaction, created = Reaction.objects.get_or_create(message=message, user=request.user, emoji=emoji)
        if created:
            # Serialize the reaction
            reaction_data = ReactionSerializer(reaction).data
            
            # Determine recipients based on message context
            channel_layer = get_channel_layer()
            if message.connection:
                # One-to-one chat
                recipients = [message.connection.sender, message.connection.receiver]
            elif message.group:
                # Group chat
                recipients = message.group.members.all()
            else:
                recipients = []
            
            # Broadcast the reaction to all recipients
            for recipient in recipients:
                async_to_sync(channel_layer.group_send)(
                    recipient.username,
                    {
                        "type": "broadcast_group",
                        "message": {
                            "source": "reaction.add",
                            "data": {
                                "message_id": message.id,
                                "reaction": reaction_data
                            }
                        }
                    }
                )
            
            logger.info(f"Reaction added to message {message_id} by {request.user.username}: {emoji}")
            return Response({"success": "Reaction added"}, status=status.HTTP_201_CREATED)
        return Response({"error": "Reaction already exists"}, status=status.HTTP_400_BAD_REQUEST)

class CreateGroupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get('name')
        if not name:
            logger.warning(f"Group creation attempt without name by {request.user.username}")
            return Response({"error": "Group name is required"}, status=status.HTTP_400_BAD_REQUEST)
        serializer = GroupSerializer(data={'name': name})
        if serializer.is_valid():
            group = serializer.save(creator=request.user)
            group.admins.add(request.user)
            group.members.add(request.user)
            group.save()
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                request.user.username,
                {"type": "broadcast_group", "message": {"source": "group.created", "data": serializer.data}}
            )
            logger.info(f"Group {group.name} created by {request.user.username}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Error creating group: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GroupSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, group_id):
        group = get_object_or_404(Group, id=group_id)
        if request.user not in group.admins.all():
            logger.warning(f"User {request.user.username} not authorized to modify group {group_id}")
            return Response({"error": "Only admins can modify group settings"}, status=status.HTTP_403_FORBIDDEN)
        serializer = GroupSerializer(group, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"Group {group_id} settings updated by {request.user.username}")
            return Response(serializer.data)
        logger.error(f"Error updating group {group_id}: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        target_user = get_object_or_404(User, username=username)
        blocked, created = BlockedUser.objects.get_or_create(user=request.user, blocked_user=target_user)
        if created:
            logger.info(f"User {request.user.username} blocked {username}")
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                target_user.username,
                {
                    "type": "broadcast_group",
                    "message": {
                        "source": "block.status",
                        "data": {"blocked_by": request.user.username, "blocked": True}
                    }
                }
            )
            return Response({"success": "User blocked"}, status=status.HTTP_201_CREATED)
        logger.info(f"User {username} already blocked by {request.user.username}")
        return Response({"error": "User already blocked"}, status=status.HTTP_400_BAD_REQUEST)
class UnblockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, username):
        target_user = get_object_or_404(User, username=username)
        try:
            blocked = BlockedUser.objects.get(user=request.user, blocked_user=target_user)
            blocked.delete()
            logger.info(f"User {request.user.username} unblocked {username}")
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                target_user.username,
                {
                    "type": "broadcast_group",
                    "message": {
                        "source": "block.status",
                        "data": {"blocked_by": request.user.username, "blocked": False}
                    }
                }
            )
            return Response({"success": "User unblocked"}, status=status.HTTP_200_OK)
        except BlockedUser.DoesNotExist:
            logger.info(f"User {username} was not blocked by {request.user.username}")
            return Response({"error": "User was not blocked"}, status=status.HTTP_400_BAD_REQUEST)

class ReportUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, username):
        target_user = get_object_or_404(User, username=username)
        reported, created = ReportedUser.objects.get_or_create(user=request.user, reported_user=target_user)
        if created:
            logger.info(f"User {request.user.username} reported {username}")
            return Response({"success": "User reported"}, status=status.HTTP_201_CREATED)
        logger.info(f"User {username} already reported by {request.user.username}")
        return Response({"error": "User already reported"}, status=status.HTTP_400_BAD_REQUEST)

class PostListCreateView(generics.ListCreateAPIView):
    queryset = Post.objects.all()
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        return CreatePostSerializer if self.request.method == 'POST' else PostSerializer

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            logger.warning("Unauthenticated user attempted to create a post")
            raise serializers.ValidationError("Authentication required to create a post")
        post = serializer.save(user=self.request.user)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "feed_updates",
            {"type": "new_post", "post": PostSerializer(post, context={'request': self.request}).data}
        )
        logger.info(f"Post {post.id} created by {self.request.user.username}")

class PostInteractView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, pk, action):
        post = get_object_or_404(Post, pk=pk)
        if action == 'like':
            if request.user.is_authenticated:
                if request.user in post.likes.all():
                    post.likes.remove(request.user)
                    logger.info(f"User {request.user.username} unliked post {pk}")
                else:
                    post.likes.add(request.user)
                    logger.info(f"User {request.user.username} liked post {pk}")
            else:
                logger.info(f"Anonymous user attempted to like/unlike post {pk} (no change)")
        elif action == 'retweet':
            if request.user.is_authenticated:
                if request.user in post.retweets.all():
                    post.retweets.remove(request.user)
                    logger.info(f"User {request.user.username} unretweeted post {pk}")
                else:
                    post.retweets.add(request.user)
                    logger.info(f"User {request.user.username} retweeted post {pk}")
            else:
                logger.info(f"Anonymous user attempted to retweet/unretweet post {pk} (no change)")
        else:
            logger.warning(f"Invalid action '{action}' on post {pk}")
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"success": True}, status=status.HTTP_200_OK)

class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        post_id = self.kwargs['post_id']
        post = get_object_or_404(Post, id=post_id)
        user = self.request.user if self.request.user.is_authenticated else None
        comment = serializer.save(user=user, post=post)
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"post_{post_id}",
            {"type": "new_comment", "comment": CommentSerializer(comment).data}
        )
        logger.info(f"Comment {comment.id} created on post {post_id} by {'Anonymous' if not user else user.username}")

class MarkMessagesSeenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, connection_id):
        messages = Message.objects.filter(connection_id=connection_id, seen=False)
        count = messages.update(seen=True, seen_at=timezone.now())
        logger.info(f"{count} messages marked as seen for connection {connection_id} by {request.user.username}")
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            request.user.username,
            {
                "type": "broadcast_group",
                "message": {
                    "source": "message.seen",
                    "data": {"connection_id": connection_id, "count": count}
                }
            }
        )
        return Response({"marked_count": count}, status=status.HTTP_200_OK)

class UserProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            logger.info(f"User profile updated for {user.username}")
            return Response(serializer.data, status=status.HTTP_200_OK)
        logger.error(f"Error updating user profile: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)