from django.urls import path
from .views import SignInView, SignUpView,ImageUploadView,AudioUploadView,UploadBgThumbnailView
from .views import DeleteMessageView

urlpatterns = [
	path('signin/', SignInView.as_view()),
	path('signup/', SignUpView.as_view()),
    path('upload/', ImageUploadView.as_view(), name='image-upload'),
    path('audio/', AudioUploadView.as_view(), name='upload_audio'),
    path('messages/delete/<int:pk>/', DeleteMessageView.as_view(), name='delete-message'),
    path('upload-bg-thumbnail/', UploadBgThumbnailView.as_view(), name='upload-bg-thumbnail'),
]