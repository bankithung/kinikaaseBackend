import base64
import json

from asgiref.sync import async_to_sync
from channels.generic.websocket import WebsocketConsumer
from django.core.files.base import  ContentFile
from django.db.models import Q, Exists, OuterRef
from django.db.models.functions import Coalesce
import os
from .models import User, Connection, Message
from django.conf import settings
from asgiref.sync import sync_to_async
from .serializers import (
	UserSerializer, 
	SearchSerializer, 
	RequestSerializer, 
	FriendSerializer,
	MessageSerializer
)
import logging
import datetime
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache  # Using Django cache (can be backed by Redis)

# Set up logging
logger = logging.getLogger(__name__)

class SignalingMusicConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """
        Called when the WebSocket is handshaking as part of the connection process.
        """
        self.group_name = None
        await self.accept()

    async def disconnect(self, close_code):
        """
        Called when the WebSocket closes for any reason.
        """
        if self.group_name:
            # Remove the user from the group
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)
            await self.notify_user_left()

    async def notify_user_left(self):
        """
        Notify other users in the group that this user has left.
        """
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "user.left",
                "payload": self.channel_name
            }
        )

    async def receive(self, text_data):
        """
        Called when a message is received from the WebSocket.
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            print("\n"+message_type+"\n")

            if message_type == 'JOIN':
                await self.handle_join(data)
                await self.handle_media_control(data)
            elif message_type in ['OFFER', 'ANSWER', 'ICE_CANDIDATE']:
                await self.handle_webrtc_signal(data)
            elif message_type in ['PLAY', 'PAUSE', 'SEEK', 'TRACK_CHANGE', 'PLAYLIST_ADD', 'PLAYLIST_SYNC']:
                await self.handle_media_control(data)
        except json.JSONDecodeError:
            print("Failed to decode WebSocket message as JSON")
        except Exception as e:
            print(f"Error processing WebSocket message: {e}")

    async def handle_join(self, data):
        """
        Handle the JOIN message when a user joins a room.
        """
        self.group_name = data.get('payload')
        print(f"User joining group: {self.group_name}")

        # Add the user to the group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.add_user_to_group(self.group_name, self.channel_name)

        # Get all other users in the room
        other_users = await self.get_other_users(self.group_name)
        for user in other_users:
            print(f"Sending OTHER_USER message to client: {user}")
            await self.send(json.dumps({
                "type": "OTHER_USER",
                "payload": user
            }))
            print(f"Notifying other user about new join: {self.channel_name}")
            await self.channel_layer.send(user, {
                "type": "user.joined",
                "payload": self.channel_name
            })

    async def handle_media_control(self, data):
        """
        Handle media control messages (PLAY, PAUSE, SEEK, etc.).
        """
        print(f"Broadcasting media control message: {data}")
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "media.control",
                "payload": data
            }
        )

    async def user_joined(self, event):
        """
        Handle USER_JOINED message when a new user joins the room.
        """
        print(f"New user joined: {event['payload']}")
        await self.send(json.dumps({
            "type": "USER_JOINED",
            "payload": event['payload']
        }))

    async def user_left(self, event):
        """
        Handle USER_LEFT message when a user leaves the room.
        """
        print(f"User left: {event['payload']}")
        await self.send(json.dumps({
            "type": "USER_LEFT",
            "payload": event['payload']
        }))

    async def media_control(self, event):
        """
        Handle media control messages (PLAY, PAUSE, SEEK, etc.).
        """
        print(f"Sending media control message to client: {event['payload']}")
        await self.send(json.dumps(event['payload']))

    # Redis operations
    @sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        """
        Add a user to the group in Redis cache.
        """
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        if channel_name not in users:
            users.append(channel_name)
            cache.set(cache_key, users, timeout=86400)
        print(f"Users in group {group_name}: {users}")

    @sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        """
        Remove a user from the group in Redis cache.
        """
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        if channel_name in users:
            users.remove(channel_name)
            cache.set(cache_key, users, timeout=86400)
        print(f"Users in group {group_name}: {users}")

    @sync_to_async
    def get_other_users(self, group_name):
        """
        Get all other users in the group from Redis cache.
        """
        cache_key = f"group_{group_name}"
        users = cache.get(cache_key, [])
        print(f"All users in group {group_name}: {users}")
        return [user for user in users if user != self.channel_name]


# class SignalingConsumer(AsyncWebsocketConsumer):
#     async def connect(self):
#         self.group_name = None
#         self.group_name = None
#         await self.accept()

#     async def disconnect(self, close_code):
#         if self.group_name:
#             await self.channel_layer.group_discard(self.group_name, self.channel_name)
#             await self.remove_user_from_group(self.group_name, self.channel_name)

#     async def receive(self, text_data):
#         data = json.loads(text_data)
#         type = data.get('type')
#         print("Data : ", data)
        
#         if type == 'JOIN':
#             self.group_name = data.get('payload')

#             # Add user to the group
#             await self.channel_layer.group_add(
#                 self.group_name,
#                 self.channel_name
#             )

#             print("Channel Name : ", self.channel_name)
            
#             # Add user to the group in cache
#             await self.add_user_to_group(self.group_name, self.channel_name)

#             # Get other user in the room
#             other_user = await self.get_other_user(self.group_name)
#             print("Other User : ", other_user)

#             if other_user:
#                 await self.send(text_data=json.dumps({"type": "OTHER_USER", "payload": other_user}))
#                 # Send to the other user that a new user joined
#                 await self.channel_layer.send(other_user, {
#                     "type": "user_joined",
#                     "payload": self.channel_name
#                 })
        
#         elif type == 'OFFER':
#             # Send offer to the target user
#             await self.channel_layer.send(data['target'], {
#                 "type": "offer",
#                 "sdp": data['sdp']
#             })
        
#         elif type == 'ANSWER':
#             # Send answer to the target user
#             await self.channel_layer.send(data['target'], {
#                 "type": "answer",
#                 "sdp": data['sdp']
#             })
        
#         elif type == 'ICE_CANDIDATE':
#             # Send ICE candidate to the target user
#             await self.channel_layer.send(data['target'], {
#                 "type": "ice_candidate",
#                 "candidate": data['candidate']
#             })

#     async def user_joined(self, event):
#         # Handle USER_JOINED message
#         await self.send(text_data=json.dumps({
#             "type": "USER_JOINED",
#             "payload": event['payload']
#         }))

#     async def offer(self, event):
#         # Handle OFFER message
#         await self.send(text_data=json.dumps({
#             "type": "OFFER",
#             "sdp": event['sdp']
#         }))

#     async def answer(self, event):
#         # Handle ANSWER message
#         await self.send(text_data=json.dumps({
#             "type": "ANSWER",
#             "sdp": event['sdp']
#         }))

#     async def ice_candidate(self, event):
#         # Handle ICE_CANDIDATE message
#         await self.send(text_data=json.dumps({
#             "type": "ICE_CANDIDATE",
#             "candidate": event['candidate']
#         }))

#     async def signal_message(self, event):
#         # Send event data to WebSocket
#         await self.send(text_data=json.dumps(event))

#     # Get other user in the group
#     async def get_other_user(self, group_name):
#         users = await self.get_users_in_group(group_name)
#         for user in users:
#             if user != self.channel_name:
#                 return user
#         return None

#     # Add user to a group (stored in cache)
#     @database_sync_to_async
#     def add_user_to_group(self, group_name, channel_name):
#         print(f"Added user {channel_name} to group {group_name}")
#         group_users = cache.get(group_name, [])
#         group_users.append(channel_name)
#         cache.set(group_name, group_users)

#     # Remove user from a group (stored in cache)
#     @database_sync_to_async
#     def remove_user_from_group(self, group_name, channel_name):
#         print(f"Removing user {channel_name} from group {group_name}")
#         group_users = cache.get(group_name, [])
#         if channel_name in group_users:
#             group_users.remove(channel_name)
#         cache.set(group_name, group_users)

#     # Get all users in the group from cache
#     @database_sync_to_async
#     def get_users_in_group(self, group_name):
#         return cache.get(group_name, [])


class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.remove_user_from_group(self.group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        type = data.get('type')
        print("Data : ", data)
        
        if type == 'JOIN':
            self.group_name = data.get('payload')

            # Add user to the group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            print("Channel Name : ", self.channel_name)
            
            # Add user to the group in cache
            await self.add_user_to_group(self.group_name, self.channel_name)

            # Get other user in the room
            other_user = await self.get_other_user(self.group_name)
            print("Other User : ", other_user)

            if other_user:
                await self.send(text_data=json.dumps({"type": "OTHER_USER", "payload": other_user}))
                # Send to the other user that a new user joined
                await self.channel_layer.send(other_user, {
                    "type": "user_joined",
                    "payload": self.channel_name
                })
        
        elif type == 'OFFER':
            # Send offer to the target user
            await self.channel_layer.send(data['target'], {
                "type": "offer",
                "sdp": data['sdp']
            })
        
        elif type == 'ANSWER':
            # Send answer to the target user
            await self.channel_layer.send(data['target'], {
                "type": "answer",
                "sdp": data['sdp']
            })
        
        elif type == 'ICE_CANDIDATE':
            # Send ICE candidate to the target user
            await self.channel_layer.send(data['target'], {
                "type": "ice_candidate",
                "candidate": data['candidate']
            })

        # Handle custom messages for playlist and media control
        elif type in ['PLAY', 'PAUSE', 'SEEK', 'TRACK_CHANGE', 'PLAYLIST_ADD', 'PLAYLIST_SYNC']:
            # Broadcast the message to all users in the group except the sender
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type": "signal_message",
                    "message": data
                }
            )

    async def user_joined(self, event):
        # Handle USER_JOINED message
        await self.send(text_data=json.dumps({
            "type": "USER_JOINED",
            "payload": event['payload']
        }))

    async def offer(self, event):
        # Handle OFFER message
        await self.send(text_data=json.dumps({
            "type": "OFFER",
            "sdp": event['sdp']
        }))

    async def answer(self, event):
        # Handle ANSWER message
        await self.send(text_data=json.dumps({
            "type": "ANSWER",
            "sdp": event['sdp']
        }))

    async def ice_candidate(self, event):
        # Handle ICE_CANDIDATE message
        await self.send(text_data=json.dumps({
            "type": "ICE_CANDIDATE",
            "candidate": event['candidate']
        }))

    async def signal_message(self, event):
        # Send custom messages (PLAY, PAUSE, SEEK, etc.) to WebSocket
        await self.send(text_data=json.dumps(event['message']))

    # Get other user in the group
    async def get_other_user(self, group_name):
        users = await self.get_users_in_group(group_name)
        for user in users:
            if user != self.channel_name:
                return user
        return None

    # Add user to a group (stored in cache)
    @database_sync_to_async
    def add_user_to_group(self, group_name, channel_name):
        print(f"Added user {channel_name} to group {group_name}")
        group_users = cache.get(group_name, [])
        group_users.append(channel_name)
        cache.set(group_name, group_users)

    # Remove user from a group (stored in cache)
    @database_sync_to_async
    def remove_user_from_group(self, group_name, channel_name):
        print(f"Removing user {channel_name} from group {group_name}")
        group_users = cache.get(group_name, [])
        if channel_name in group_users:
            group_users.remove(channel_name)
        cache.set(group_name, group_users)

    # Get all users in the group from cache
    @database_sync_to_async
    def get_users_in_group(self, group_name):
        return cache.get(group_name, [])
    
class ChatConsumer(WebsocketConsumer):

	def connect(self):
		user = self.scope['user']
		print(user, user.is_authenticated)

		if not user.is_authenticated:
			return
		# Save username to use as a group name for this user
		self.username = user.username
		# Join this user to a group with their username
		async_to_sync(self.channel_layer.group_add)(
			self.username, self.channel_name
		)
		self.accept()

	def disconnect(self, close_code):
		# Leave room/group
		async_to_sync(self.channel_layer.group_discard)(
			self.username, self.channel_name
		)

	#-----------------------
	#    Handle requests
	#-----------------------

	def receive(self, text_data):
		# Receive message from websocket
		data = json.loads(text_data)
		data_source = data.get('source')

		# Pretty print  python dict
		print('receive', json.dumps(data, indent=2))

		# Get friend list
		if data_source == 'friend.list':
			self.receive_friend_list(data)

		# Message List
		elif data_source == 'message.list':
			self.receive_message_list(data)

		# Message has been sent
		elif data_source == 'message.send':
			self.receive_message_send(data)

		# User is typing message
		elif data_source == 'message.type':
			self.receive_message_type(data)

		# Accept friend request
		elif data_source == 'request.accept':
			self.receive_request_accept(data)

		# Make friend request
		elif data_source == 'request.connect':
			self.receive_request_connect(data)

		# Get request list
		elif data_source == 'request.list':
			self.receive_request_list(data)

		# Search / filter users
		elif data_source == 'search':
			self.receive_search(data)

		# Thumbnail upload
		elif data_source == 'thumbnail':
			self.receive_thumbnail(data)

		elif data_source == 'image':
			self.receive_image(data)


	def receive_friend_list(self, data):
		user = self.scope['user']
		# Latest message subquery
		latest_message = Message.objects.filter(
			connection=OuterRef('id')
		).order_by('-created')[:1]
		# Get connections for user
		connections = Connection.objects.filter(
			Q(sender=user) | Q(receiver=user),
			accepted=True
		).annotate(
			latest_text   =latest_message.values('text'),
			latest_created=latest_message.values('created')
		).order_by(
			Coalesce('latest_created', 'updated').desc()
		)
		serialized = FriendSerializer(
			connections, 
			context={ 
				'user': user 
			}, 
			many=True)
		# Send data back to requesting user
		self.send_group(user.username, 'friend.list', serialized.data)



	def receive_message_list(self, data):
		user = self.scope['user']
		connectionId = data.get('connectionId')
		page = data.get('page')
		page_size = 15
		try:
			connection = Connection.objects.get(id=connectionId)
		except Connection.DoesNotExist:
			print('Error: couldnt find connection')
			return
		# Get messages
		messages = Message.objects.filter(
			connection=connection
		).order_by('-created')[page * page_size:(page + 1) * page_size]
		# Serialized message
		serialized_messages = MessageSerializer(
			messages,
			context={ 
				'user': user 
			}, 
			many=True
		)
		# Get recipient friend
		recipient = connection.sender
		if connection.sender == user:
			recipient = connection.receiver
		
		# Serialize friend
		serialized_friend = UserSerializer(recipient)

		# Count the total number of messages for this connection
		messages_count = Message.objects.filter(
			connection=connection
		).count()

		next_page = page + 1 if messages_count > (page + 1 ) * page_size else None

		data = {
			'messages': serialized_messages.data,
			'next': next_page,
			'friend': serialized_friend.data
		}
		# Send back to the requestor
		self.send_group(user.username, 'message.list', data)

	def serialize_datetime(self,data):
		"""Helper function to convert datetime objects to ISO 8601 strings."""
		for key, value in data.items():
			if isinstance(value, dict):
				self.serialize_datetime(value)
			elif isinstance(value, list):
				for item in value:
					if isinstance(item, dict):
						self.serialize_datetime(item)
			elif isinstance(value, datetime.datetime):
				data[key] = value.isoformat()  # Convert datetime to ISO string
		return data

	def receive_message_send(self, data):
		user = self.scope['user']
		connectionId = data.get('connectionId')
		message_text = data.get('message')
		type = data.get('type')
		replied_to_id = data.get('replied_to')  # Get replied_to ID from the data
		print("TYPE OF TEXT: ", type)

		# Retrieve the connection
		try:
			connection = Connection.objects.get(id=connectionId)
		except Connection.DoesNotExist:
			print('Error: Connection not found')
			return

		# Retrieve the replied_to message if provided
		replied_to = None
		if replied_to_id:
			try:
				replied_to = Message.objects.get(id=replied_to_id)
			except Message.DoesNotExist:
				print(f'Error: Replied-to message with ID {replied_to_id} does not exist')
				return

		# Create the new message
		message = Message.objects.create(
			connection=connection,
			user=user,
			text=message_text,
			type=type,
			replied_to=replied_to  # Assign the Message instance or None
		)

		# Get the recipient friend
		recipient = connection.sender if connection.sender != user else connection.receiver

		# Serialize and format the message data for the sender
		serialized_message = MessageSerializer(
			message,
			context={'user': user}
		).data
		serialized_message = self.serialize_datetime(serialized_message)  # Apply datetime serialization
		serialized_friend = UserSerializer(recipient).data
		data = {
			'message': serialized_message,
			'friend': serialized_friend
		}
		self.send_group(user.username, 'message.send', data)

		# Serialize and format the message data for the recipient
		serialized_message = MessageSerializer(
			message,
			context={'user': recipient}
		).data
		serialized_message =self.serialize_datetime(serialized_message)  # Apply datetime serialization
		serialized_friend = UserSerializer(user).data
		data = {
			'message': serialized_message,
			'friend': serialized_friend
		}
		self.send_group(recipient.username, 'message.send', data)

	def receive_message_type(self, data):
		user = self.scope['user']
		recipient_username = data.get('username')
		data = {
			'username': user.username
		}
		self.send_group(recipient_username, 'message.type', data)


	def receive_request_accept(self, data):
		username = data.get('username')
		# Fetch connection object
		try:
			connection = Connection.objects.get(
				sender__username=username,
				receiver=self.scope['user']
			)
		except Connection.DoesNotExist:
			print('Error: connection  doesnt exists')
			return
		# Update the connection
		connection.accepted = True
		connection.save()
		
		serialized = RequestSerializer(connection)
		# Send accepted request to sender
		self.send_group(
			connection.sender.username, 'request.accept', serialized.data
		)
		# Send accepted request to receiver
		self.send_group(
			connection.receiver.username, 'request.accept', serialized.data
		)

		# Send new friend object to sender
		serialized_friend = FriendSerializer(
			connection,
			context={
				'user': connection.sender
			}
		)
		self.send_group(
			connection.sender.username, 'friend.new', serialized_friend.data)

		# Send new friend object to receiver
		serialized_friend = FriendSerializer(
			connection,
			context={
				'user': connection.receiver
			}
		)
		self.send_group(
			connection.receiver.username, 'friend.new', serialized_friend.data)



	def receive_request_connect(self, data):
		username = data.get('username')
		# Attempt to fetch the receiving user
		try:
			receiver = User.objects.get(username=username)
		except User.DoesNotExist:
			print('Error: User not found')
			return
		# Create connection
		connection, _ = Connection.objects.get_or_create(
			sender=self.scope['user'],
			receiver=receiver
		)
		# Serialized connection
		serialized = RequestSerializer(connection)
		# Send back to sender
		self.send_group(
			connection.sender.username, 'request.connect', serialized.data
		)
		# Send to receiver
		self.send_group(
			connection.receiver.username, 'request.connect', serialized.data
		)



	def receive_request_list(self, data):
		user = self.scope['user']
		# Get connection made to this  user
		connections = Connection.objects.filter(
			receiver=user,
			accepted=False
		)
		serialized = RequestSerializer(connections, many=True)
		# Send requests lit back to this userr
		self.send_group(user.username, 'request.list', serialized.data)


		
	def receive_search(self, data):
		query = data.get('query')
		# Get users from query search term
		users = User.objects.filter(
			Q(username__istartswith=query)   |
			Q(first_name__istartswith=query) |
			Q(last_name__istartswith=query)
		).exclude(
			username=self.username
		).annotate(
			pending_them=Exists(
				Connection.objects.filter(
					sender=self.scope['user'],
					receiver=OuterRef('id'),
					accepted=False
				)
			),
			pending_me=Exists(
				Connection.objects.filter(
					sender=OuterRef('id'),
					receiver=self.scope['user'],
					accepted=False
				)
			),
			connected=Exists(
				Connection.objects.filter(
					Q(sender=self.scope['user'], receiver=OuterRef('id')) |
					Q(receiver=self.scope['user'], sender=OuterRef('id')),
					accepted=True
				)
			)
		)
		# serialize results
		serialized = SearchSerializer(users, many=True)
		# Send search results back to this user
		self.send_group(self.username, 'search', serialized.data)

	
	def receive_thumbnail(self, data):
		user = self.scope['user']
		# Convert base64 data  to django content file
		image_str = data.get('base64')
		image = ContentFile(base64.b64decode(image_str))
		# Update thumbnail field
		filename = data.get('filename')
		user.thumbnail.save(filename, image, save=True)
		# Serialize user
		serialized = UserSerializer(user)
		# Send updated user data including new thumbnail 
		self.send_group(self.username, 'thumbnail', serialized.data)


	def receive_image(self, data):
			user = self.scope['user']
			# Convert base64 data to Django content file
			image_str = data.get('base64')
			image = ContentFile(base64.b64decode(image_str))

			# Generate a unique filename or use the provided one
			filename = data.get('filename')
			if not filename:
				filename = f"{user.username}_uploaded_image.jpg"  # Default filename

			# Define the path where the image will be saved
			file_path = os.path.join(settings.MEDIA_ROOT, 'uploads', filename)

			# Ensure the directory exists
			os.makedirs(os.path.dirname(file_path), exist_ok=True)

			# Save the file
			with open(file_path, 'wb') as f:
				f.write(image.read())

			# Prepare the response data
			response_data = {
				'message': 'Image uploaded successfully',
				'file_path': file_path
			}

			# Send back the response to the user
			self.send_group(self.username, 'image', response_data)
		


	#--------------------------------------------
	#   Catch/all broadcast to client helpers
	#--------------------------------------------

	def send_group(self, group, source, data):
		response = {
			'type': 'broadcast_group',
			'source': source,
			'data': data
		}
		async_to_sync(self.channel_layer.group_send)(
			group, response
		)

	def broadcast_group(self, data):
		'''
		data:
			- type: 'broadcast_group'
			- source: where it originated from
			- data: what ever you want to send as a dict
		'''
		data.pop('type')
		'''
		return data:
			- source: where it originated from
			- data: what ever you want to send as a dict
		'''
		self.send(text_data=json.dumps(data))
		
