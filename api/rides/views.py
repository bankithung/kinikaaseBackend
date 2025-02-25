from django.core.cache import cache
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model  # Import get_user_model
from .models import RiderProfile, Trip, RiderLocation
from .serializers import UserSerializer, RiderProfileSerializer, TripSerializer
from django.conf import settings
import requests
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from math import radians, cos, sin, sqrt, atan2
import random

User = get_user_model()  # Get the custom User model dynamically

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        Token.objects.create(user=user)
        return Response({'token': user.auth_token.key, 'user_id': user.id})

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = User.objects.filter(username=username).first()
        if user and user.check_password(password):
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user_id': user.id})
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

class RiderProfileCreateView(generics.CreateAPIView):
    serializer_class = RiderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class RiderProfileView(generics.RetrieveAPIView):
    serializer_class = RiderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(RiderProfile, user=self.request.user)

class PlaceSearchView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.GET.get('query', '')
        cache_key = f"places_{query}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        url = f"https://atlas.mapmyindia.com/api/places/search/json?query={query}&access_token={settings.MAPPLS_ACCESS_TOKEN}"
        response = requests.get(url, timeout=10)
        data = response.json()
        cache.set(cache_key, data, timeout=3600)
        return Response(data)

class RouteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        origin_lat = float(request.data.get('origin_lat'))
        origin_lon = float(request.data.get('origin_lon'))
        dest_lat = float(request.data.get('dest_lat'))
        dest_lon = float(request.data.get('dest_lon'))
        cache_key = f"route_{origin_lat}_{origin_lon}_{dest_lat}_{dest_lon}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)
        url = f"https://apis.mapmyindia.com/advancedmaps/v1/{settings.MAPPLS_API_KEY}/route_adv/driving?start={origin_lon},{origin_lat}&destination={dest_lon},{dest_lat}"
        response = requests.get(url, timeout=10)
        data = response.json()
        route = data['results']['trips'][0]['pts']
        distance = data['results']['trips'][0]['dist'] / 1000
        price = distance * 10
        result = {'route': route, 'distance': distance, 'price': price}
        cache.set(cache_key, result, timeout=3600)
        return Response(result)

class TripCreateView(generics.CreateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        trip = serializer.save(passenger=self.request.user)
        nearby_riders = self.get_nearby_riders(trip.pickup_latitude, trip.pickup_longitude)
        channel_layer = get_channel_layer()
        for rider in nearby_riders:
            async_to_sync(channel_layer.group_send)(
                f"user_{rider.id}",
                {"type": "trip_request", "trip_id": trip.id, "pickup_lat": trip.pickup_latitude, "pickup_lon": trip.pickup_longitude}
            )
        return Response({'id': trip.id}, status=status.HTTP_201_CREATED)

    def get_nearby_riders(self, lat, lon, max_distance=5):
        riders = User.objects.filter(rider_profile__is_verified=True).prefetch_related('rider_location')
        nearby = []
        R = 6371
        for rider in riders:
            try:
                location = rider.rider_location
                dlat = radians(location.latitude - lat)
                dlon = radians(location.longitude - lon)
                a = sin(dlat / 2) ** 2 + cos(radians(lat)) * cos(radians(location.latitude)) * sin(dlon / 2) ** 2
                c = 2 * atan2(sqrt(a), sqrt(1 - a))
                distance = R * c
                if distance <= max_distance:
                    nearby.append(rider)
            except RiderLocation.DoesNotExist:
                continue
        return nearby

class TripDetailView(generics.RetrieveAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        trip = get_object_or_404(Trip, pk=self.kwargs['pk'])
        if self.request.user not in [trip.passenger, trip.rider]:
            self.permission_denied(self.request)
        return trip

class TripAcceptView(generics.UpdateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        trip = self.get_object()
        if trip.status != 'requested':
            return Response({'detail': 'Trip not available'}, status=status.HTTP_400_BAD_REQUEST)
        trip.rider = request.user
        trip.status = 'accepted'
        trip.otp = str(random.randint(100000, 999999))
        trip.save()
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{trip.passenger.id}",
            {"type": "trip_accepted", "trip_id": trip.id, "rider_id": request.user.id, "otp": trip.otp}
        )
        return Response({'status': 'accepted'})

class TripStartView(generics.UpdateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        trip = self.get_object()
        if trip.rider != request.user or trip.status != 'accepted':
            return Response({'detail': 'Cannot start trip'}, status=status.HTTP_400_BAD_REQUEST)
        otp = request.data.get('otp')
        if otp != trip.otp:
            return Response({'detail': 'Invalid OTP'}, status=status.HTTP_400_BAD_REQUEST)
        trip.status = 'ongoing'
        trip.save()
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{trip.passenger.id}",
            {"type": "trip_started", "trip_id": trip.id}
        )
        return Response({'status': 'ongoing'})

class TripCompleteView(generics.UpdateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        trip = self.get_object()
        if trip.rider != request.user or trip.status != 'ongoing':
            return Response({'detail': 'Cannot complete trip'}, status=status.HTTP_400_BAD_REQUEST)
        trip.status = 'completed'
        trip.save()
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{trip.passenger.id}",
            {"type": "trip_completed", "trip_id": trip.id}
        )
        return Response({'status': 'completed'})

class TripCancelView(generics.UpdateAPIView):
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        trip = self.get_object()
        if request.user not in [trip.passenger, trip.rider] or trip.status not in ['requested', 'accepted']:
            return Response({'detail': 'Cannot cancel trip'}, status=status.HTTP_400_BAD_REQUEST)
        trip.status = 'cancelled'
        trip.save()
        channel_layer = get_channel_layer()
        if trip.rider:
            async_to_sync(channel_layer.group_send)(
                f"user_{trip.rider.id}",
                {"type": "trip_cancelled", "trip_id": trip.id}
            )
        async_to_sync(channel_layer.group_send)(
            f"user_{trip.passenger.id}",
            {"type": "trip_cancelled", "trip_id": trip.id}
        )
        return Response({'status': 'cancelled'})

class RefreshTokenView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_token = request.data.get('token')
        user = request.user
        try:
            token = Token.objects.get(user=user, key=old_token)
            token.delete()
            new_token = Token.objects.create(user=user)
            return Response({'token': new_token.key})
        except Token.DoesNotExist:
            return Response({'detail': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)