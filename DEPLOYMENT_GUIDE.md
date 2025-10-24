# KinikaAse Backend Deployment Guide for Render

This guide will help you deploy your Django backend to Render with PostgreSQL database and static/media file storage.

## Prerequisites

1. GitHub account with your code repository
2. Render account (free tier available)
3. Google Cloud service account JSON file (for Firebase/Google services)

## Step 1: Prepare Your Repository

### 1.1 Push your code to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Files created for deployment:
- `render.yaml` - Render deployment configuration
- `api/core/production_settings.py` - Production Django settings
- `api/manage_production.py` - Production management script
- `api/core/wsgi_production.py` - Production WSGI configuration
- `env.example` - Environment variables template

## Step 2: Deploy to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your GitHub repository

### 2.2 Deploy Backend Service
1. In Render dashboard, click "New +"
2. Select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `kinikaase-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r api/requirements.txt && cd api && python manage.py collectstatic --noinput && python manage.py migrate`
   - **Start Command**: `cd api && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT`
   - **Plan**: Free

### 2.3 Create PostgreSQL Database
1. In Render dashboard, click "New +"
2. Select "PostgreSQL"
3. Configure the database:
   - **Name**: `kinikaase-db`
   - **Database Name**: `kinikaase_production`
   - **User**: `kinikaase_user`
   - **Plan**: Free

### 2.4 Set Environment Variables
In your Render service settings, add these environment variables:

```
DEBUG=False
SECRET_KEY=your-generated-secret-key-here
ALLOWED_HOSTS=kinikaase-backend.onrender.com
DATABASE_URL=postgresql://username:password@host:port/database_name
CORS_ALLOWED_ORIGINS=https://kinikaase-backend.onrender.com
STATIC_URL=/static/
MEDIA_URL=/media/
GOOGLE_APPLICATION_CREDENTIALS=/opt/render/project/src/api/core/service-account.json
```

**Note**: Replace `your-generated-secret-key-here` with a secure secret key. You can generate one using:
```python
from django.core.management.utils import get_random_secret_key
print(get_random_secret_key())
```

## Step 3: Configure Static and Media Files

### 3.1 Static Files
Static files are automatically handled by WhiteNoise middleware. CSS, JS, and other static assets will be served from `/static/`.

### 3.2 Media Files
For media files (user uploads), you have several options:

#### Option A: Use Render's Disk Storage (Free Tier)
- Files are stored on Render's disk
- Files persist between deployments
- Limited storage on free tier

#### Option B: Use Cloud Storage (Recommended for Production)
Configure cloud storage for media files:

1. **AWS S3** (recommended):
   ```bash
   pip install boto3 django-storages
   ```

2. **Google Cloud Storage**:
   ```bash
   pip install google-cloud-storage django-storages
   ```

3. **Cloudinary** (easy setup):
   ```bash
   pip install cloudinary django-cloudinary-storage
   ```

## Step 4: Deploy and Test

### 4.1 Deploy
1. Click "Deploy" in your Render service
2. Wait for the build to complete (5-10 minutes)
3. Check the logs for any errors

### 4.2 Test Your Deployment
1. Visit your service URL: `https://kinikaase-backend.onrender.com`
2. Test admin panel: `https://kinikaase-backend.onrender.com/admin/`
3. Test API endpoints: `https://kinikaase-backend.onrender.com/chat/`

### 4.3 Create Superuser
To access Django admin:
1. Go to your service shell in Render dashboard
2. Run: `python manage.py createsuperuser`
3. Follow the prompts

## Step 5: Update React Native App

### 5.1 Update API Base URL
In your React Native app, update the API base URL to point to your Render deployment:

```javascript
// In your API configuration
const API_BASE_URL = 'https://kinikaase-backend.onrender.com';
```

### 5.2 Update CORS Settings
Make sure your React Native app's domain is included in `CORS_ALLOWED_ORIGINS`.

## Step 6: Monitoring and Maintenance

### 6.1 Monitor Logs
- Check Render dashboard for service logs
- Monitor error rates and response times
- Set up alerts for service downtime

### 6.2 Database Backups
- Render automatically backs up PostgreSQL databases
- Consider additional backup strategies for production

### 6.3 Performance Optimization
- Monitor database queries
- Use Redis for caching (upgrade to paid plan)
- Optimize static file delivery

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check `requirements.txt` for missing dependencies
   - Verify Python version compatibility
   - Check build logs for specific errors

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` environment variable
   - Check database service status
   - Ensure migrations are running

3. **Static Files Not Loading**:
   - Verify WhiteNoise middleware is installed
   - Check `STATIC_ROOT` and `STATIC_URL` settings
   - Run `collectstatic` command

4. **CORS Issues**:
   - Verify `CORS_ALLOWED_ORIGINS` includes your frontend domain
   - Check middleware order in settings

### Getting Help:
- Check Render documentation: https://render.com/docs
- Django deployment guide: https://docs.djangoproject.com/en/4.2/howto/deployment/
- Render community forum: https://community.render.com

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **HTTPS**: Render provides HTTPS by default
3. **Database Security**: Use strong passwords
4. **CORS**: Restrict allowed origins to your domains only
5. **Secret Key**: Use a strong, unique secret key

## Cost Considerations

### Free Tier Limits:
- **Web Service**: 750 hours/month
- **PostgreSQL**: 1GB storage, 1GB RAM
- **Bandwidth**: 100GB/month

### Upgrade Options:
- **Starter Plan**: $7/month for always-on service
- **Pro Plan**: $25/month for higher limits
- **Team Plan**: $50/month for team collaboration

## Next Steps

1. Set up domain name (optional)
2. Configure SSL certificate (automatic with Render)
3. Set up monitoring and alerts
4. Implement backup strategies
5. Consider CDN for static files
6. Set up CI/CD pipeline

## Support

For issues specific to this deployment:
1. Check Render service logs
2. Verify environment variables
3. Test API endpoints manually
4. Check database connectivity

Remember to keep your local development environment separate from production and always test changes locally before deploying.
