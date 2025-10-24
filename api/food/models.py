from django.db import models
from django.conf import settings

class Chef(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chef_profile')
    bio = models.TextField(blank=True)
    rating = models.FloatField(default=0.0)

    def __str__(self):
        return f"Chef {self.user.username}"

class FoodItem(models.Model):
    chef = models.ForeignKey(Chef, on_delete=models.CASCADE, related_name='food_items')
    name = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='food_images/', null=True, blank=True)
    category = models.CharField(max_length=50, blank=True)  # e.g., "Veg", "Non-Veg"

    def __str__(self):
        return self.name

class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity} x {self.food_item.name}"

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    chef = models.ForeignKey(Chef, on_delete=models.CASCADE)
    items = models.ManyToManyField(FoodItem, through='OrderItem')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50, blank=True)  # e.g., "Card", "UPI"

    def __str__(self):
        return f"Order {self.id} by {self.user.username}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE)
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Price at time of order

    def __str__(self):
        return f"{self.quantity} x {self.food_item.name} in Order {self.order.id}"