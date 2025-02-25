from django.urls import path, re_path
from chat import consumers

websocket_urlpatterns = [
    path('chat/', consumers.ChatConsumer.as_asgi()),
    path('video/', consumers.SignalingConsumer.as_asgi()),
    path('music/', consumers.SignalingMusicConsumer.as_asgi()),
    re_path(r'ws/feed/$', consumers.FeedConsumer.as_asgi()),
]