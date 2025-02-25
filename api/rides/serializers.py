from rest_framework import serializers
from django.contrib.auth.models import User
from .models import RiderProfile, Trip, RiderLocation

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class RiderProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiderProfile
        fields = ['aadhaar_number', 'vehicle_number', 'vehicle_plate_image', 'is_verified']

class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = ['id', 'pickup_latitude', 'pickup_longitude', 'destination_latitude', 'destination_longitude', 'status', 'price', 'otp', 'rider', 'passenger']
        read_only_fields = ['status', 'price', 'otp', 'rider', 'passenger']