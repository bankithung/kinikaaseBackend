from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChefViewSet, FoodItemViewSet, CartViewSet, OrderViewSet

router = DefaultRouter()

# Register viewsets with static querysets (no basename needed)
router.register(r'chefs', ChefViewSet)
router.register(r'food-items', FoodItemViewSet)

# Register viewsets without querysets, specifying basename
router.register(r'cart', CartViewSet, basename='cart')
router.register(r'orders', OrderViewSet, basename='order')

urlpatterns = [
    path('', include(router.urls)),
]