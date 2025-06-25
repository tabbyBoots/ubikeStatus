# Railway Deployment Guide

This guide covers deploying the uBike Status application to Railway with proper security configuration.

## 🚀 Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

## 🔧 Required Environment Variables

Set these environment variables in your Railway project:

### Security Configuration

```bash
# SSL Certificate Password (CRITICAL - Generate a strong password)
SSL_CERT_PASSWORD=your_strong_password_here_min_12_chars

# Allowed Hosts (Replace with your Railway domain)
ALLOWED_HOSTS=your-app-name.railway.app,your-custom-domain.com

# CORS Origins (Replace with your Railway domain)
ALLOWED_ORIGINS=https://your-app-name.railway.app,https://your-custom-domain.com
```

### Optional Configuration

```bash
# ASP.NET Core Environment
ASPNETCORE_ENVIRONMENT=Production

# Custom URLs (Railway handles this automatically)
ASPNETCORE_URLS=https://+:443;http://+:80
```

## 🔒 Security Best Practices for Railway

### 1. SSL Certificate Password
- **Generate a strong password** (minimum 12 characters)
- Use a mix of uppercase, lowercase, numbers, and special characters
- Example: `MySecure2024Pass!@#`
- **Never commit this to version control**

### 2. Domain Configuration
- Replace `your-app-name.railway.app` with your actual Railway domain
- Add any custom domains you're using
- Use HTTPS URLs only in production

### 3. CORS Configuration
- Only include domains that need access to your API
- Use HTTPS URLs for production
- Separate multiple domains with commas

## 📋 Deployment Steps

### 1. Fork/Clone Repository
```bash
git clone <your-repository-url>
cd ubikeStatus
```

### 2. Create Railway Project
1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your forked repository

### 3. Configure Environment Variables
In Railway dashboard:
1. Go to your project
2. Click on "Variables" tab
3. Add the required environment variables listed above

### 4. Deploy
Railway will automatically deploy your application when you push to the main branch.

## 🌐 Accessing Your Application

After deployment:
- Your app will be available at: `https://your-app-name.railway.app`
- API endpoints: `https://your-app-name.railway.app/api/ubike`
- API documentation: `https://your-app-name.railway.app/scalar/v1` (if enabled)

## 🔍 Troubleshooting

### Common Issues

1. **SSL Certificate Error**
   - Check that `SSL_CERT_PASSWORD` is set correctly
   - Ensure the password meets minimum requirements

2. **CORS Errors**
   - Verify `ALLOWED_ORIGINS` includes your Railway domain
   - Make sure to use HTTPS URLs

3. **Host Header Attacks Prevention**
   - Ensure `ALLOWED_HOSTS` is set to your specific domains
   - Don't use `*` in production

### Logs
Check Railway logs for detailed error information:
1. Go to Railway dashboard
2. Select your project
3. Click on "Deployments" tab
4. View logs for the latest deployment

## 🔄 Updates and Maintenance

### Updating Environment Variables
1. Go to Railway dashboard
2. Navigate to Variables tab
3. Update the required variables
4. Railway will automatically redeploy

### Security Updates
- Regularly rotate the `SSL_CERT_PASSWORD`
- Review and update `ALLOWED_HOSTS` and `ALLOWED_ORIGINS` as needed
- Monitor Railway logs for suspicious activity

## 📊 Monitoring

### Health Checks
The application includes basic health monitoring:
- API endpoint: `GET /api/ubike` should return station data
- Frontend: Should load at your Railway domain

### Performance
- Monitor Railway metrics in the dashboard
- Check response times for API endpoints
- Monitor memory and CPU usage

## 🆘 Support

If you encounter issues:
1. Check Railway documentation
2. Review application logs
3. Verify environment variables are set correctly
4. Check GitHub issues for known problems

---

**Security Note**: This configuration addresses critical and high-priority security concerns identified in the security audit. The application now uses environment variables for sensitive configuration and implements proper CORS and host validation.
