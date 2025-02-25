from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import RiderLocation, Trip

class RideConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_authenticated:
            await self.channel_layer.group_add(f"user_{self.user.id}", self.channel_name)
            await self.accept()
        else:
            await self.close(code=1006, reason="User not authenticated")

    async def disconnect(self, close_code):
        if self.user.is_authenticated:
            await self.channel_layer.group_discard(f"user_{self.user.id}", self.channel_name)

    async def receive_json(self, content):
        if content['type'] == 'location_update':
            latitude = float(content['latitude'])
            longitude = float(content['longitude'])
            await self.update_location(latitude, longitude)

    @database_sync_to_async
    def update_location(self, latitude, longitude):
        RiderLocation.objects.update_or_create(
            rider=self.user,
            defaults={'latitude': latitude, 'longitude': longitude}
        )
        try:
            trip = Trip.objects.get(rider=self.user, status__in=['accepted', 'ongoing'])
            async_to_sync(self.channel_layer.group_send)(
                f"user_{trip.passenger.id}",
                {"type": "rider_location", "latitude": latitude, "longitude": longitude, "trip_id": trip.id}
            )
        except Trip.DoesNotExist:
            pass

    async def trip_request(self, event):
        await self.send_json({'type': 'trip_request', 'trip_id': event['trip_id'], 'pickup_lat': event['pickup_lat'], 'pickup_lon': event['pickup_lon']})

    async def trip_accepted(self, event):
        await self.send_json({'type': 'trip_accepted', 'trip_id': event['trip_id'], 'rider_id': event['rider_id'], 'otp': event['otp']})

    async def trip_started(self, event):
        await self.send_json({'type': 'trip_started', 'trip_id': event['trip_id']})

    async def trip_completed(self, event):
        await self.send_json({'type': 'trip_completed', 'trip_id': event['trip_id']})

    async def trip_cancelled(self, event):
        await self.send_json({'type': 'trip_cancelled', 'trip_id': event['trip_id']})

    async def rider_location(self, event):
        await self.send_json({'type': 'rider_location', 'latitude': event['latitude'], 'longitude': event['longitude'], 'trip_id': event['trip_id']})