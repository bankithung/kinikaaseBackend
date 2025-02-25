import base64
import json
import re
import os
import logging
from django.conf import settings
from django.core.files.base import ContentFile
from django.db.models import Q, Exists, OuterRef
from django.db.models.functions import Coalesce
from django.utils import timezone
from asgiref.sync import async_to_sync, sync_to_async
from channels.generic.websocket import WebsocketConsumer, AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from .models import User, Connection, Message, Group, Reaction, BlockedUser
from .serializers import (
    UserSerializer, SearchSerializer, RequestSerializer, FriendSerializer,
    MessageSerializer, GroupSerializer
)
from datetime import datetime
from .views import send_fcm_notification

# Helper function to convert datetime objects to strings
def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj

# Set up logging
logger = logging.getLogger(__name__)

class SignalingMusicConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        self.user = self.scope['user']  # May be AnonymousUser if not authenticated
        self.channel_name = self.channel_name
        await self.accept()

    async def handle_join(self, data):
        self.group_name = data.get('payload')
        logger.info(f"User {'Anonymous' if not self.user.is_authenticated else self.user.username} joining group: {self.group_name}")
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.add_user_to_group(self.group_name, self.channel_name)
        other_users = await self.get_other_users(self.group_name)
        for user in other_users:
            await self.send(json.dumps({"type": "OTHER_USER", "payload": user}))
            await self.channel_layer.send(user, {"type": "user.joined", "payload": self.channel_name})
        await self.broadcast_participants()

    @sync_to_async
    def get_username_from_channel(self, channel):
        return self.user.username if self.user.is_authenticated and channel == self.channel_name else "Anonymous"

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)
            await self.notify_user_left()
            await self.broadcast_participants()

    async def notify_user_left(self):
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "user.left", "payload": self.channel_name}
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            logger.info(f"Received message type: {message_type}")
            if message_type == 'JOIN':
                await self.handle_join(data)
            elif message_type in ['OFFER', 'ANSWER', 'ICE_CANDIDATE']:
                await self.handle_webrtc_signal(data)
            elif message_type in ['PLAY', 'PAUSE', 'SEEK', 'TRACK_CHANGE', 'PLAYLIST_ADD', 'PLAYLIST_SYNC']:
                await self.handle_media_control(data)
        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message as JSON")
        except Exception as e:
            logger.error(f"Error in SignalingMusicConsumer: {e}")

    async def handle_webrtc_signal(self, data):
        message_type = data['type'].lower()
        target = data.get('target')
        if target:
            await self.channel_layer.send(target, {
                "type": message_type,
                "sdp": data.get('sdp'),
                "candidate": data.get('candidate')
            })

    async def handle_media_control(self, data):
        await self.channel_layer.group_send(self.group_name, {"type": "media.control", "payload": data})

    async def broadcast_participants(self):
        users = await self.get_all_users(self.group_name)
        participants = [
            {
                "channel": user,
                "username": await self.get_username_from_channel(user),
                "isSpeaking": False  # Simplified; could track audio activity if needed
            } for user in users
        ]
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "media.control",
                "payload": {"type": "PARTICIPANTS_UPDATE", "participants": participants}
            }
        )

    async def user_joined(self, event):
        await self.send(json.dumps({"type": "USER_JOINED", "payload": event['payload']}))
        await self.broadcast_participants()

    async def user_left(self, event):
        await self.send(json.dumps({"type": "USER_LEFT", "payload": event['payload']}))
        await self.broadcast_participants()

    async def media_control(self, event):
        await self.send(json.dumps(event['payload']))

    @sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        if channel_name not in users:
            users.append(channel_name)
            cache.set(cache_key, users, timeout=86400)
        logger.info(f"Users in group {group_name}: {users}")

    @sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        if channel_name in users:
            users.remove(channel_name)
            cache.set(cache_key, users, timeout=86400)
        logger.info(f"Users in group {group_name}: {users}")

    @sync_to_async
    def get_all_users(self, group_name):
        cache_key = f"group_{group_name}"
        return cache.get(cache_key, [])

    @sync_to_async
    def get_other_users(self, group_name):
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        return [user for user in users if user != self.channel_name]

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            type_ = data.get('type')
            logger.info(f"Received message type: {type_}")
            if type_ == 'JOIN':
                self.group_name = data.get('payload')
                await self.channel_layer.group_add(self.group_name, self.channel_name)
                await self.add_user_to_group(self.group_name, self.channel_name)
                other_user = await self.get_other_user(self.group_name)
                if other_user:
                    await self.send(json.dumps({"type": "OTHER_USER", "payload": other_user}))
                    await self.channel_layer.send(other_user, {"type": "user_joined", "payload": self.channel_name})
            elif type_ == 'OFFER':
                await self.channel_layer.send(data['target'], {"type": "offer", "sdp": data['sdp']})
            elif type_ == 'ANSWER':
                await self.channel_layer.send(data['target'], {"type": "answer", "sdp": data['sdp']})
            elif type_ == 'ICE_CANDIDATE':
                await self.channel_layer.send(data['target'], {"type": "ice_candidate", "candidate": data['candidate']})
            elif type_ in ['PLAY', 'PAUSE', 'SEEK', 'TRACK_CHANGE', 'PLAYLIST_ADD', 'PLAYLIST_SYNC']:
                await self.channel_layer.group_send(self.group_name, {"type": "signal_message", "message": data})
        except json.JSONDecodeError:
            logger.error("Failed to decode WebSocket message as JSON")
        except Exception as e:
            logger.error(f"Error in SignalingConsumer: {e}")

    async def user_joined(self, event):
        await self.send(json.dumps({"type": "USER_JOINED", "payload": event['payload']}))

    async def offer(self, event):
        await self.send(json.dumps({"type": "OFFER", "sdp": event['sdp']}))

    async def answer(self, event):
        await self.send(json.dumps({"type": "ANSWER", "sdp": event['sdp']}))

    async def ice_candidate(self, event):
        await self.send(json.dumps({"type": "ICE_CANDIDATE", "candidate": event['candidate']}))

    async def signal_message(self, event):
        await self.send(json.dumps(event['message']))

    @database_sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        group_users = cache.get(group_name, [])
        if channel_name not in group_users:
            group_users.append(channel_name)
            cache.set(group_name, group_users, timeout=86400)
        logger.info(f"Added {channel_name} to group {group_name}")

    @database_sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        group_users = cache.get(group_name, [])
        if channel_name in group_users:
            group_users.remove(channel_name)
            cache.set(group_name, group_users, timeout=86400)
        logger.info(f"Removed {channel_name} from group {group_name}")

    @database_sync_to_async
    def get_other_user(self, group_name):
        users = cache.get(group_name, [])
        return next((user for user in users if user != self.channel_name), None)

class ChatConsumer(WebsocketConsumer):
    def connect(self):
        user = self.scope['user']
        if not user.is_authenticated:
            self.close()
            return

        self.username = user.username
        async_to_sync(self.channel_layer.group_add)(self.username, self.channel_name)
        user.last_online = timezone.now()
        user.is_online = True
        user.save()
        self.broadcast_online_status(user.username, True)
        self.send_initial_friend_status(user)
        self.accept()

    def disconnect(self, close_code):
        if hasattr(self, 'username'):
            async_to_sync(self.channel_layer.group_discard)(self.username, self.channel_name)
            user = User.objects.get(username=self.username)
            user.last_online = timezone.now()
            user.is_online = False
            user.save()
            self.broadcast_online_status(self.username, False)

    def send_initial_friend_status(self, user):
        friends = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user), accepted=True
        )
        friend_usernames = [
            friend.receiver.username if friend.sender == user else friend.sender.username
            for friend in friends
        ]
        online_users = User.objects.filter(username__in=friend_usernames)
        for friend in online_users:
            is_online = friend.is_online and (timezone.now() - friend.last_online).total_seconds() < 300
            self.send_group(user.username, 'online.status', {
                'username': friend.username,
                'online': is_online
            })

    def broadcast_online_status(self, username, online):
        user = User.objects.get(username=username)
        friends = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user), accepted=True
        )
        for friend in friends:
            recipient = friend.receiver if friend.sender == user else friend.sender
            async_to_sync(self.channel_layer.group_send)(
                recipient.username,
                {
                    'type': 'broadcast_group',
                    'message': {'source': 'online.status', 'data': {'username': username, 'online': online}}
                }
            )

    def receive(self, text_data):
        try:
            data = json.loads(text_data)
            data_source = data.get('source')
            logger.info('receive: %s', json.dumps(data, indent=2))

            handlers = {
                'friend.list': self.receive_friend_list,
                'message.list': self.receive_message_list,
                'message.send': self.receive_message_send,
                'message.type': self.receive_message_type,
                'request.accept': self.receive_request_accept,
                'request.connect': self.receive_request_connect,
                'request.list': self.receive_request_list,
                'search': self.receive_search,
                'thumbnail': self.receive_thumbnail,
                'image': self.receive_image,
                'online.status': self.receive_online_status,
                'groups.create': self.receive_group_create,
                'call.reject': self.receive_call_reject,
                'message.edit': self.receive_message_edit,
                'message.delete': self.receive_message_delete,
            }

            handler = handlers.get(data_source)
            if handler:
                handler(data)
            else:
                logger.warning(f"Unknown source: {data_source}")
                self.send_error("Unknown source")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            self.send_error("Invalid JSON format")
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            self.send_error("Server error")

    def receive_message_edit(self, data):
        user = self.scope['user']
        message_id = data.get('messageId')
        new_text = data.get('newText')
        message = Message.objects.get(id=message_id, user=user)
        message.text = new_text
        message.save()
        serialized_message = MessageSerializer(message, context={'user': user}).data

        if message.connection:
            recipient = message.connection.sender if message.connection.sender != user else message.connection.receiver
            recipients = [user, recipient]
            connection_id = str(message.connection.id)
            latest_message = Message.objects.filter(connection=message.connection, is_deleted=False).order_by('-created').first()
        elif message.group:
            recipients = message.group.members.all()
            connection_id = f'group_{message.group.id}'
            latest_message = Message.objects.filter(group=message.group, is_deleted=False).order_by('-created').first()
        else:
            recipients = []
            connection_id = None

        # Send friend.preview.update if the edited message is the latest
        if latest_message and latest_message.id == message.id:
            new_preview = new_text
            new_updated = message.created.isoformat()
            logger.info(f"Sending friend.preview.update - connectionId: {connection_id}, preview: {new_preview}, messageId: {message.id}")
            for recipient in recipients:
                self.send_group(recipient.username, 'friend.preview.update', {
                    'connectionId': connection_id,
                    'preview': new_preview,
                    'updated': new_updated,
                    'messageId': message.id
                })

        # Always send message.update
        for recipient in recipients:
            self.send_group(recipient.username, 'message.update', {'message': serialized_message})
                

    def receive_message_delete(self, data):
        user = self.scope['user']
        message_id = data.get('messageId')
        message = Message.objects.get(id=message_id, user=user)
        message.is_deleted = True
        message.save()

        if message.connection:
            recipient = message.connection.sender if message.connection.sender != user else message.connection.receiver
            recipients = [user, recipient]
            connection_id = str(message.connection.id)
            latest_message = Message.objects.filter(connection=message.connection, is_deleted=False).order_by('-created').first()
            new_preview = latest_message.text if latest_message else 'No messages'
            new_updated = latest_message.created.isoformat() if latest_message else message.connection.updated.isoformat()
        elif message.group:
            recipients = message.group.members.all()
            connection_id = f'group_{message.group.id}'
            latest_message = Message.objects.filter(group=message.group, is_deleted=False).order_by('-created').first()
            new_preview = latest_message.text if latest_message else 'No messages'
            new_updated = latest_message.created.isoformat() if latest_message else message.group.created.isoformat()
        else:
            recipients = []
            connection_id = None

        # Update friend preview and broadcast deletion
        for recipient in recipients:
            self.send_group(recipient.username, 'friend.preview.update', {
                'connectionId': connection_id,
                'preview': new_preview,
                'updated': new_updated
            })
            self.send_group(recipient.username, 'message.delete', {
                'messageId': message.id,
                'connectionId': connection_id
            })

    def receive_call_reject(self, data):
        recipient_username = data.get('recipient')
        roomId = data.get('roomId')
        self.send_group(recipient_username, 'call.rejected', {'roomId': roomId})
        logger.info(f"Call rejection sent to {recipient_username} for room {roomId}")

    def send_group(self, group, source, data):
        serialized_data = serialize_datetime(data)
        response = {'source': source, 'data': serialized_data}
        try:
            async_to_sync(self.channel_layer.group_send)(
                group, {'type': 'broadcast_group', 'message': response}
            )
        except Exception as e:
            logger.error(f"Error sending group message: {e}")

    def send_error(self, message):
        self.send(text_data=json.dumps({'source': 'error', 'data': {'message': message}}))

    def broadcast_group(self, event):
        message = event['message']
        serialized_message = serialize_datetime(message)
        self.send(text_data=json.dumps(serialized_message))


    def receive_message_send(self, data):
        user = self.scope['user']
        connectionId = data.get('connectionId')
        message_text = data.get('message')
        type_ = data.get('type', 'text')
        replied_to_id = data.get('replied_to')
        is_group = data.get('isGroup', False)
        incognito = data.get('incognito', False)
        disappearing = data.get('disappearing', None)
        connectionId_str = str(connectionId)

        # Handle media file if present
        base64_media = data.get('base64')
        filename = data.get('filename')
        media_file = None
        if base64_media and filename:
            try:
                media_file = ContentFile(base64.b64decode(base64_media), name=filename)
            except Exception as e:
                logger.error(f"Error decoding media file: {e}")
                self.send_error("Invalid media file")
                return

        # Create the message
        if is_group:
            group_id = connectionId_str.replace('group_', '')
            group = Group.objects.get(id=group_id)
            message = Message.objects.create(
                group=group, user=user, text=message_text, type=type_,
                replied_to=Message.objects.get(id=replied_to_id) if replied_to_id else None,
                incognito=incognito, disappearing=disappearing, media_file=media_file
            )
            recipients = group.members.exclude(username=user.username)
            connection_id = connectionId_str
            friend_data = {'username': group.name}
            group_name = group.name
        else:
            connection = Connection.objects.get(id=int(connectionId))
            recipient = connection.sender if connection.sender != user else connection.receiver
            message = Message.objects.create(
                connection=connection, user=user, text=message_text, type=type_,
                replied_to=Message.objects.get(id=replied_to_id) if replied_to_id else None,
                incognito=incognito, disappearing=disappearing, media_file=media_file
            )
            recipients = [recipient]
            connection_id = connectionId_str
            friend_data = UserSerializer(recipient).data
            group_name = None

        # Prepare common data
        new_preview = message_text if type_ == 'text' else f"{type_.capitalize()} message"
        new_updated = message.created.isoformat()
        timestamp = timezone.now().strftime('%I:%M %p')  # e.g., "2:30 PM"

        # Prepare notification details
        sender_name = user.username
        notification_title = f"{sender_name} sent a {type_.capitalize()}"
        if is_group:
            notification_title = f"{sender_name} sent a {type_.capitalize()} in {group_name}"

        # Customize notification body based on message type
        if type_ == 'text':
            notification_body = f"{message_text} | {timestamp}"
        elif type_ in ['image', 'video', 'audio', 'document']:
            content_preview = f"[{type_.capitalize()}]" if not message.media_file else f"[{type_.capitalize()}]"
            notification_body = f"{content_preview} | {timestamp}"
        elif type_ == 'location':
            notification_body = f"Location shared | {timestamp}"
        elif type_ == 'videocall':
            notification_body = f"Tap to join | {timestamp}"
        elif type_ == 'voicecall':
            notification_body = f"Tap to join | {timestamp}"
        elif type_ == 'listen':
            notification_body = f"Join to listen together | {timestamp}"
        elif type_ == 'watch':
            notification_body = f"Join to watch together | {timestamp}"
        else:
            notification_body = f"{message_text} | {timestamp}"  # Fallback

        # Custom payload with additional message details
        custom_payload = {
            "message": {
                "token": None,  # Will be set per recipient
                "notification": {
                    "title": notification_title,
                    "body": notification_body
                },
                "data": {
                    "connectionId": connection_id,
                    "messageId": str(message.id),
                    "sender": sender_name,
                    "content": message_text,
                    "type": type_,
                    "timestamp": timestamp,
                    "isGroup": str(is_group),
                    "groupName": group_name if is_group else "",
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                }
            }
        }

        # Process all recipients
        for recipient in recipients:
            # Update friend preview
            self.send_group(recipient.username, 'friend.preview.update', {
                'connectionId': connection_id,
                'preview': new_preview,
                'updated': new_updated
            })

            # Send WebSocket message
            serialized_message = MessageSerializer(message, context={'user': recipient}).data
            self.send_group(recipient.username, 'message.send', {
                'message': serialized_message,
                'friend': UserSerializer(user).data
            })

            # Send FCM notification if token exists
            if recipient.fcm_token:
                custom_payload["message"]["token"] = recipient.fcm_token
                send_fcm_notification(
                    fcm_token=recipient.fcm_token,
                    title=notification_title,
                    body=notification_body,
                    custom_payload=custom_payload
                )
                logger.info(f"FCM notification sent to {recipient.username}: {notification_title} - {notification_body}")
            else:
                logger.warning(f"No FCM token for {recipient.username}, skipping notification")

        # Handle sender's updates
        self.send_group(user.username, 'friend.preview.update', {
            'connectionId': connection_id,
            'preview': new_preview,
            'updated': new_updated
        })
        serialized_message = MessageSerializer(message, context={'user': user}).data
        self.send_group(user.username, 'message.send', {
            'message': serialized_message,
            'friend': friend_data
        })
        
    def receive_friend_list(self, data):
        user = self.scope['user']
        latest_message = Message.objects.filter(connection=OuterRef('id')).order_by('-created')[:1]
        connections = Connection.objects.filter(
            Q(sender=user) | Q(receiver=user), accepted=True
        ).annotate(
            latest_text=latest_message.values('text'),
            latest_created=latest_message.values('created')
        ).order_by(Coalesce('latest_created', 'updated').desc())
        groups = Group.objects.filter(members=user)
        group_connections = [
            {
                'id': f'group_{group.id}',
                'friend': {'username': group.name, 'name': group.name, 'thumbnail': None, 'online': True},
                'preview': group.messages.order_by('-created').first().text if group.messages.exists() else 'Group created',
                'updated': group.created,
                'unread_count': group.messages.filter(seen=False).exclude(user=user).count()
            } for group in groups
        ]
        serialized = FriendSerializer(connections, context={'user': user}, many=True)
        friend_list = serialized.data + group_connections
        self.send_group(user.username, 'friend.list', friend_list)

    def receive_message_list(self, data):
        user = self.scope['user']
        connectionId = data.get('connectionId')
        page = data.get('page', 0)
        page_size = 15
        connectionId_str = str(connectionId)

        if connectionId_str.startswith('group_'):
            group_id = connectionId_str.replace('group_', '')
            try:
                group = Group.objects.get(id=group_id)
                messages = Message.objects.filter(group=group).order_by('-created')[page * page_size:(page + 1) * page_size]
                recipient = {'username': group.name, 'thumbnail': None}
                messages_count = Message.objects.filter(group=group).count()
                is_blocked = False
                i_blocked_friend = False
            except Group.DoesNotExist:
                self.send_error('Group not found')
                return
        else:
            try:
                connection = Connection.objects.get(id=int(connectionId))
                messages = Message.objects.filter(connection=connection).order_by('-created')[page * page_size:(page + 1) * page_size]
                recipient = connection.sender if connection.sender != user else connection.receiver
                messages_count = Message.objects.filter(connection=connection).count()
                is_blocked = BlockedUser.objects.filter(user=recipient, blocked_user=user).exists()
                i_blocked_friend = BlockedUser.objects.filter(user=user, blocked_user=recipient).exists()
            except Connection.DoesNotExist:
                self.send_error('Connection not found')
                return

        serialized_messages = MessageSerializer(messages, context={'user': user}, many=True)
        serialized_friend = UserSerializer(recipient) if not connectionId_str.startswith('group_') else {'username': recipient['username']}
        next_page = page + 1 if messages_count > (page + 1) * page_size else None
        data_response = {
            'messages': serialized_messages.data,
            'next': next_page,
            'friend': serialized_friend.data,
            'is_blocked': is_blocked,
            'i_blocked_friend': i_blocked_friend,
        }
        self.send_group(user.username, 'message.list', data_response)

    def receive_message_type(self, data):
        user = self.scope['user']
        recipient_username = data.get('username')
        data_response = {'username': user.username}
        self.send_group(recipient_username, 'message.type', data_response)

    def receive_request_accept(self, data):
        username = data.get('username')
        try:
            connection = Connection.objects.get(sender__username=username, receiver=self.scope['user'])
        except Connection.DoesNotExist:
            self.send_error('Connection not found')
            return

        connection.accepted = True
        connection.save()

        serialized = RequestSerializer(connection)
        self.send_group(connection.sender.username, 'request.accept', serialized.data)
        self.send_group(connection.receiver.username, 'request.accept', serialized.data)

        serialized_friend_sender = FriendSerializer(connection, context={'user': connection.sender}).data
        self.send_group(connection.sender.username, 'friend.new', serialized_friend_sender)

        serialized_friend_receiver = FriendSerializer(connection, context={'user': connection.receiver}).data
        self.send_group(connection.receiver.username, 'friend.new', serialized_friend_receiver)

    def receive_request_connect(self, data):
        username = data.get('username')
        try:
            receiver = User.objects.get(username=username)
        except User.DoesNotExist:
            self.send_error('User not found')
            return

        connection, _ = Connection.objects.get_or_create(sender=self.scope['user'], receiver=receiver)
        serialized = RequestSerializer(connection)
        self.send_group(connection.sender.username, 'request.connect', serialized.data)
        self.send_group(connection.receiver.username, 'request.connect', serialized.data)

    def receive_request_list(self, data):
        user = self.scope['user']
        connections = Connection.objects.filter(receiver=user, accepted=False)
        serialized = RequestSerializer(connections, many=True)
        self.send_group(user.username, 'request.list', serialized.data)

    def receive_search(self, data):
        query = data.get('query')
        users = User.objects.filter(
            Q(username__istartswith=query) | Q(first_name__istartswith=query) | Q(last_name__istartswith=query)
        ).exclude(username=self.username).annotate(
            pending_them=Exists(Connection.objects.filter(sender=self.scope['user'], receiver=OuterRef('id'), accepted=False)),
            pending_me=Exists(Connection.objects.filter(sender=OuterRef('id'), receiver=self.scope['user'], accepted=False)),
            connected=Exists(Connection.objects.filter(
                Q(sender=self.scope['user'], receiver=OuterRef('id')) | Q(receiver=self.scope['user'], sender=OuterRef('id')),
                accepted=True
            ))
        )
        serialized = SearchSerializer(users, many=True)
        self.send_group(self.username, 'search', serialized.data)

    def receive_thumbnail(self, data):
        user = self.scope['user']
        image_str = data.get('base64')
        try:
            image = ContentFile(base64.b64decode(image_str))
        except Exception as e:
            logger.error(f"Error decoding thumbnail: {e}")
            self.send_error("Invalid thumbnail image")
            return

        filename = data.get('filename')
        user.thumbnail.save(filename, image, save=True)
        serialized = UserSerializer(user)
        self.send_group(self.username, 'thumbnail', serialized.data)

    def receive_image(self, data):
        user = self.scope['user']
        image_str = data.get('base64')
        try:
            image = ContentFile(base64.b64decode(image_str))
        except Exception as e:
            logger.error(f"Error decoding image: {e}")
            self.send_error("Invalid image file")
            return

        filename = data.get('filename', f"{user.username}_uploaded_image.jpg")
        file_path = os.path.join(settings.MEDIA_ROOT, 'uploads', filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'wb') as f:
            f.write(image.read())
        response_data = {'message': 'Image uploaded successfully', 'file_path': file_path}
        self.send_group(self.username, 'image', response_data)

    def receive_online_status(self, data):
        user = self.scope['user']
        online_users = User.objects.filter(last_online__gte=timezone.now() - timezone.timedelta(minutes=5))
        for online_user in online_users:
            is_online = online_user.is_online and (timezone.now() - online_user.last_online).total_seconds() < 300
            self.send_group(user.username, 'online.status', {
                'username': online_user.username,
                'online': is_online
            })

    def receive_group_create(self, data):
        user = self.scope['user']
        name = data.get('name')
        if not name:
            self.send_error("Group name is required")
            return
        group = Group.objects.create(name=name, creator=user)
        group.admins.add(user)
        group.members.add(user)
        serialized = GroupSerializer(group)
        self.send_group(user.username, 'group.created', serialized.data)

class FeedConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add("feed_updates", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("feed_updates", self.channel_name)

    async def new_post(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_post',
            'post': event['post']
        }))

    async def new_comment(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_comment',
            'comment': event['comment']
        }))
