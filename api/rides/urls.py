from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('rider-profile/', views.RiderProfileView.as_view(), name='rider-profile'),
    path('rider-profile/create/', views.RiderProfileCreateView.as_view(), name='rider-profile-create'),
    path('places/search/', views.PlaceSearchView.as_view(), name='place-search'),
    path('route/', views.RouteView.as_view(), name='route'),
    path('trips/', views.TripCreateView.as_view(), name='trip-create'),
    path('trips/<int:pk>/', views.TripDetailView.as_view(), name='trip-detail'),
    path('trips/<int:pk>/accept/', views.TripAcceptView.as_view(), name='trip-accept'),
    path('trips/<int:pk>/start/', views.TripStartView.as_view(), name='trip-start'),
    path('trips/<int:pk>/complete/', views.TripCompleteView.as_view(), name='trip-complete'),
    path('trips/<int:pk>/cancel/', views.TripCancelView.as_view(), name='trip-cancel'),
    path('refresh-token/', views.RefreshTokenView.as_view(), name='refresh-token'),
]