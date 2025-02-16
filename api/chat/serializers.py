from rest_framework import serializers
from .models import User, Connection, Message,ImageUpload
from datetime import datetime
from django.core.files.storage import default_storage
from rest_framework import serializers
from .models import User

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
        return default_storage.save(f'uploads/audio/{validated_data["audio"].name}', validated_data["audio"])

class SignUpSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = [
			'username',
			'first_name',
			'last_name',
			'password',
		]
		extra_kwargs = {
			'password': {
				# Ensures that when serializing, this field will be excluded
				'write_only': True
			}
		}

	def create(self, validated_data):
		# Clean all values, set as lowercase
		username   = validated_data['username'].lower()
		first_name = validated_data['first_name'].lower()
		last_name  = validated_data['last_name'].lower()
		
		# Create new user
		user = User.objects.create(
			username=username,
			first_name=first_name,
			last_name=last_name
		)
		password = validated_data['password']
		user.set_password(password)
		user.save()
		return user


class UserSerializer(serializers.ModelSerializer):
	name = serializers.SerializerMethodField()

	class Meta:
		model = User
		fields = [
			'username',
			'name',
			'thumbnail',
			'user_Bg_thumbnail',
   			'following',
      		'followers'
		]

	def get_name(self, obj):
		fname = obj.first_name.capitalize()
		lname = obj.last_name.capitalize()
		return fname + ' ' + lname


class SearchSerializer(UserSerializer):
	status = serializers.SerializerMethodField()

	class Meta:
		model = User
		fields = [
			'username',
			'name',
			'thumbnail',
			'status'
		]
	
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
		fields = [
			'id',
			'sender',
			'receiver',
			'created'
		]


class FriendSerializer(serializers.ModelSerializer):
	friend = serializers.SerializerMethodField()
	preview = serializers.SerializerMethodField()
	updated = serializers.SerializerMethodField()
	
	class Meta:
		model = Connection
		fields = [
			'id',
			'friend',
			'preview',
			'updated'
		]

	def get_friend(self, obj):
		# If Im the sender
		if self.context['user'] == obj.sender:
			return UserSerializer(obj.receiver).data
		# If Im the receiver
		elif self.context['user'] == obj.receiver:
			return UserSerializer(obj.sender).data
		else:
			print('Error: No user found in friendserializer')

	def get_preview(self, obj):
		default = 'New connection'
		if not hasattr(obj, 'latest_text'):
			return default
		return obj.latest_text or default

	def get_updated(self, obj):
		if not hasattr(obj, 'latest_created'):
			date = obj.updated
		else:
			date = obj.latest_created or obj.updated
		return date.isoformat()


class MessageSerializer(serializers.ModelSerializer):
    is_me = serializers.SerializerMethodField()
    replied_to_message = serializers.SerializerMethodField()  # New field

    class Meta:
        model = Message
        fields = [
            'id',
            'is_me',
            'text',
            'created',
            'type',
            'replied_to',  # ID of the replied-to message
            'replied_to_message',  # Details of the replied-to message
            'is_deleted',
        ]

    def get_is_me(self, obj):
        return self.context['user'] == obj.user
    
    def update(self, instance, validated_data):
        # Mark message as deleted
        instance.is_deleted = validated_data.get('is_deleted', instance.is_deleted)
        instance.save()
        return instance

    def get_replied_to_message(self, obj):
    # Check if the message has a replied_to reference
        if obj.replied_to:
            return {
				'id': obj.replied_to.id,
				'text': obj.replied_to.text,
				'type': obj.replied_to.type,
				'user': obj.replied_to.user.username,
				'created': obj.replied_to.created.isoformat() if isinstance(obj.replied_to.created, datetime) else obj.replied_to.created,
			}
        return None  # Return None if there's no replied_to reference

