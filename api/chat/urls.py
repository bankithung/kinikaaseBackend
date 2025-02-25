from django.urls import path
from .views import (
    SignInView, SignUpView, ImageUploadView, AudioUploadView, UploadBgThumbnailView,
    DeleteMessageView, EditMessageView, PinMessageView, AddReactionView,
    CreateGroupView, GroupSettingsView, BlockUserView, ReportUserView,
    PostListCreateView, PostInteractView, CommentCreateView, MarkMessagesSeenView,
    VideoUploadView, DocumentUploadView, UserProfileUpdateView, UpdateFCMTokenView,UnblockUserView
)

urlpatterns = [
    path('signin/', SignInView.as_view(), name='signin'),
    path('signup/', SignUpView.as_view(), name='signup'),
    path('upload/', ImageUploadView.as_view(), name='image-upload'),
    path('video/', VideoUploadView.as_view(), name='video-upload'),
    path('document/', DocumentUploadView.as_view(), name='document-upload'),
    path('audio/', AudioUploadView.as_view(), name='audio-upload'),
    path('messages/delete/<int:pk>/', DeleteMessageView.as_view(), name='delete-message'),
    path('messages/edit/<int:pk>/', EditMessageView.as_view(), name='edit-message'),
    path('messages/pin/<int:pk>/', PinMessageView.as_view(), name='pin-message'),
    path('messages/react/<int:message_id>/', AddReactionView.as_view(), name='react-message'),
    path('groups/create/', CreateGroupView.as_view(), name='create-group'),
    path('block/<str:username>/', BlockUserView.as_view(), name='block-user'),
    path('unblock/<str:username>/', UnblockUserView.as_view(), name='unblock-user'),    path('block/<str:username>/', BlockUserView.as_view(), name='block-user'),
    path('report/<str:username>/', ReportUserView.as_view(), name='report-user'),
    path('upload-bg-thumbnail/', UploadBgThumbnailView.as_view(), name='upload-bg-thumbnail'),
    path('posts/<int:post_id>/comments/', CommentCreateView.as_view(), name='comment-create'),
    path('posts/', PostListCreateView.as_view(), name='post-list'),
    path('posts/<int:pk>/<str:action>/', PostInteractView.as_view(), name='post-interact'),
    path('messages/mark-seen/<int:connection_id>/', MarkMessagesSeenView.as_view(), name='mark-seen'),
    path('profile/update/', UserProfileUpdateView.as_view(), name='profile-update'),
    path('update-fcm-token/', UpdateFCMTokenView.as_view(), name='update-fcm-token'),
]