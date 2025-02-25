from django.db import models
from django.conf import settings

class RiderProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rider_profile'
    )
    aadhaar_number = models.CharField(max_length=12, unique=True)
    vehicle_number = models.CharField(max_length=20)
    vehicle_plate_image = models.ImageField(upload_to='vehicle_plates/')
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Rider Profile: {self.user.username}"

class Trip(models.Model):
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('accepted', 'Accepted'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    passenger = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='passenger_trips',
        on_delete=models.CASCADE
    )
    rider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='rider_trips',
        on_delete=models.SET_NULL,
        null=True
    )
    pickup_latitude = models.FloatField()
    pickup_longitude = models.FloatField()
    destination_latitude = models.FloatField()
    destination_longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    otp = models.CharField(max_length=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Trip {self.id}: {self.passenger.username} -> {self.status}"

class RiderLocation(models.Model):
    rider = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rider_location'
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Location of {self.rider.username}: ({self.latitude}, {self.longitude})"