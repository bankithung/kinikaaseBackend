from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Chef, FoodItem, Cart, CartItem, Order, OrderItem
from .serializers import ChefSerializer, FoodItemSerializer, CartSerializer, CartItemSerializer, OrderSerializer
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated

class ChefViewSet(viewsets.ModelViewSet):
    queryset = Chef.objects.all()  # Changed from none()
    serializer_class = ChefSerializer
    
    @action(detail=False, methods=['get'])
    def my_profile(self, request):
        try:
            # No authentication required
            return Response({'is_chef': False}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
             
class FoodItemViewSet(viewsets.ModelViewSet):
    queryset = FoodItem.objects.all()
    serializer_class = FoodItemSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(chef=self.request.user.chef_profile)

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        food_item_id = request.data.get('food_item_id')
        quantity = int(request.data.get('quantity', 1))
        cart, created = Cart.objects.get_or_create(user=request.user)
        food_item = FoodItem.objects.get(id=food_item_id)
        cart_item, item_created = CartItem.objects.get_or_create(cart=cart, food_item=food_item)
        if not item_created:
            cart_item.quantity += quantity
            cart_item.save()
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def place_order(self, request):
        cart = Cart.objects.get(user=request.user)
        if not cart.items.exists():
            return Response({'error': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)
        chef = cart.items.first().food_item.chef
        order = Order.objects.create(user=request.user, chef=chef, total_price=0)
        total = 0
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                food_item=item.food_item,
                quantity=item.quantity,
                price=item.food_item.price
            )
            total += item.food_item.price * item.quantity
        order.total_price = total
        order.payment_method = request.data.get('payment_method', 'Card')
        order.save()
        cart.items.all().delete()  # Clear cart after order
        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)