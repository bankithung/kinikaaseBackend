#!/bin/bash
set -o errexit

# Navigate to the application directory
cd "$(dirname "$0")"

# Run database migrations
python manage.py migrate

# Create superuser (only run once)
if [[ -z "${SUPERUSER_CREATED}" ]]; then
  # Create a superuser with the provided details
  python -c "
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='banki33').exists():
    User.objects.create_superuser('banki33', 'banki33@gmail.com', 'banki33@kikon')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
  "
  export SUPERUSER_CREATED=true
fi 