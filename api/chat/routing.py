from django.urls import path

from . import consumers

websocket_urlpatterns = [
	path('chat/', consumers.ChatConsumer.as_asgi()),
 	path('video/',consumers.SignalingConsumer.as_asgi()),
    path('music/',consumers.SignalingMusicConsumer.as_asgi()),

]