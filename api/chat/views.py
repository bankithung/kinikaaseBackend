from django.contrib.auth import authenticate
from django.shortcuts import render
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer, SignUpSerializer,ImageUploadSerializer,AudioUploadSerializer
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.core.files.base import ContentFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Message
from .serializers import MessageSerializer


from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import User
from .serializers import UserBgThumbnailSerializer

class UploadBgThumbnailView(APIView):
    permission_classes = [IsAuthenticated]  # Ensures the user is authenticated
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        if not request.user.is_authenticated:  # Check if the user is authenticated
            return Response({'message': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        user = request.user  # Assumes user is authenticated
        serializer = UserBgThumbnailSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({'message': 'Background thumbnail uploaded successfully!'}, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
def get_auth_for_user(user):
	tokens = RefreshToken.for_user(user)
	return {
		'user': UserSerializer(user).data,
		'tokens': {
			'access': str(tokens.access_token),
			'refresh': str(tokens),
		}
	}


class ImageUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        serializer = ImageUploadSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            print("SAVED:     : ",serializer.data)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
    
    
    
class AudioUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        serializer = AudioUploadSerializer(data=request.data)
        if serializer.is_valid():
            file_name = serializer.save()
            file_url = default_storage.url(file_name)
            return Response({'message': 'Audio uploaded successfully', 'audio': file_url}, status=201)
        return Response(serializer.errors, status=400)


class SignInView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		username = request.data.get('username')
		password = request.data.get('password')
		if not username or not password:
			return Response(status=400)
		
		user = authenticate(username=username, password=password)
		if not user:
			return Response(status=401)

		user_data = get_auth_for_user(user)

		return Response(user_data)


class SignUpView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		new_user = SignUpSerializer(data=request.data)
		new_user.is_valid(raise_exception=True)
		user = new_user.save()

		user_data = get_auth_for_user(user)

		return Response(user_data)



class DeleteMessageView(APIView):
    def post(self, request, pk):
        try:
            message = Message.objects.get(pk=pk)
            # Check if the user is authorized to delete the message
            
            # Mark the message as deleted
            serializer = MessageSerializer(message, data={'is_deleted': True}, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({"success": "Message deleted successfully."}, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Message.DoesNotExist:
            return Response({"error": "Message not found."}, status=status.HTTP_404_NOT_FOUND)



