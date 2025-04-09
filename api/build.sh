#!/bin/bash
set -o errexit

# Navigate to the application directory
cd "$(dirname "$0")"

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Create logs directory
mkdir -p logs 