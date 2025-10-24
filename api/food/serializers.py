from rest_framework import serializers
from .models import Chef, FoodItem, Cart, CartItem, Order, OrderItem

class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = ['id', 'name', 'description', 'price', 'image', 'category']

class ChefSerializer(serializers.ModelSerializer):
    food_items = FoodItemSerializer(many=True, read_only=True)

    class Meta:
        model = Chef
        fields = ['id', 'user', 'bio', 'rating', 'food_items']

class CartItemSerializer(serializers.ModelSerializer):
    food_item = FoodItemSerializer()

    class Meta:
        model = CartItem
        fields = ['id', 'food_item', 'quantity']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True)

    class Meta:
        model = Cart
        fields = ['id', 'user', 'created_at', 'items']

class OrderItemSerializer(serializers.ModelSerializer):
    food_item = FoodItemSerializer()

    class Meta:
        model = OrderItem
        fields = ['id', 'food_item', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'user', 'chef', 'items', 'total_price', 'status', 'created_at', 'payment_method']