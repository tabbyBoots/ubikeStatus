# Complete Docker Deployment Guide

This guide explains how to use the three key deployment features already implemented in your project:

## 🏗️ 1. Multi-Stage Docker Build (Optimized)

### How It Works
Your `Dockerfile` uses a 3-stage build process for maximum optimization:

```dockerfile
# Stage 1: Frontend Build (Node.js)
FROM node:18-alpine AS frontend-build
# Builds Vue.js app with Vite

# Stage 2: Backend Build (.NET SDK)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS backend-build
# Builds .NET API and generates HTTPS certificate

# Stage 3: Runtime (ASP.NET Core Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:9.0
# Final lightweight image with only runtime dependencies
```

### Benefits
- **Small Final Image**: Only runtime dependencies, no build tools
- **Security**: No source code or build tools in production image
- **Performance**: Faster deployment and startup times
- **Efficiency**: Separate caching for frontend and backend builds

### Test Multi-Stage Build Locally
```bash
# Build the optimized image
docker build -t ubike-app .

# Check image size (should be much smaller than if built in single stage)
docker images ubike-app

# Run the container
docker run -p 8080:8080 -p 8443:8443 \
  -e ASPNETCORE_URLS="https://+:8443;http://+:8080" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Password="REDACTED_PASSWORD" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Path="/https/aspnetapp.pfx" \
  ubike-app
```

## 📦 2. GitHub Container Registry (GHCR) Push

### How It Works
Your GitHub Actions workflow automatically pushes to GHCR when you push to the `main` branch:

```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
```

### Automatic Process
1. **Trigger**: Push to `main` branch
2. **Authentication**: Uses `GITHUB_TOKEN` (automatically provided)
3. **Build**: Creates multi-architecture image (AMD64 + ARM64)
4. **Push**: Uploads to `ghcr.io/[username]/[repository]`
5. **Tagging**: Creates multiple tags:
   - `latest` (for main branch)
   - `main-[commit-sha]` (specific version)

### Manual Push (if needed)
```bash
# Login to GHCR
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build and tag
docker build -t ghcr.io/[username]/[repository]:latest .

# Push
docker push ghcr.io/[username]/[repository]:latest
```

### View Your Images
1. Go to your GitHub repository
2. Click "Packages" tab
3. See your published container images

## 🚀 3. Deploy to Any Docker-Compatible Platform

### Platform Options

#### A. **Docker Compose (Local/VPS)**
```bash
# Create docker-compose.prod.yml
version: '3.8'
services:
  ubike-app:
    image: ghcr.io/[username]/[repository]:latest
    ports:
      - "80:8080"
      - "443:8443"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ASPNETCORE_URLS=https://+:8443;http://+:8080
    restart: unless-stopped

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

#### B. **AWS ECS (Elastic Container Service)**
```json
{
  "family": "ubike-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "ubike-app",
      "image": "ghcr.io/[username]/[repository]:latest",
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ASPNETCORE_ENVIRONMENT",
          "value": "Production"
        }
      ]
    }
  ]
}
```

#### C. **Azure Container Instances**
```bash
az container create \
  --resource-group myResourceGroup \
  --name ubike-app \
  --image ghcr.io/[username]/[repository]:latest \
  --ports 8080 \
  --environment-variables ASPNETCORE_ENVIRONMENT=Production
```

#### D. **Google Cloud Run**
```bash
gcloud run deploy ubike-app \
  --image ghcr.io/[username]/[repository]:latest \
  --platform managed \
  --port 8080 \
  --set-env-vars ASPNETCORE_ENVIRONMENT=Production
```

#### E. **Kubernetes**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ubike-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ubike-app
  template:
    metadata:
      labels:
        app: ubike-app
    spec:
      containers:
      - name: ubike-app
        image: ghcr.io/[username]/[repository]:latest
        ports:
        - containerPort: 8080
        env:
        - name: ASPNETCORE_ENVIRONMENT
          value: "Production"
---
apiVersion: v1
kind: Service
metadata:
  name: ubike-app-service
spec:
  selector:
    app: ubike-app
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

#### F. **Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link [project-id]
railway up --detach
```

#### G. **Render**
1. Connect your GitHub repository
2. Choose "Web Service"
3. Set Docker image: `ghcr.io/[username]/[repository]:latest`
4. Set port: `8080`

## 🔄 Complete Deployment Workflow

### Step 1: Development
```bash
# Work on your code locally
cd frontend && npm run dev  # Terminal 1
cd backend && dotnet run    # Terminal 2
```

### Step 2: Test Docker Build
```bash
# Test the multi-stage build
./test-docker.sh
```

### Step 3: Push to GitHub
```bash
git add .
git commit -m "Your changes"
git push origin main
```

### Step 4: Automatic CI/CD
- GitHub Actions automatically:
  - Builds frontend and backend
  - Creates optimized Docker image
  - Pushes to GHCR
  - Supports multiple architectures

### Step 5: Deploy to Production
Choose any platform and pull your image:
```bash
docker pull ghcr.io/[username]/[repository]:latest
```

## 🔧 Environment Variables for Production

### Required
```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080  # or https://+:8443 for HTTPS
```

### Optional (for HTTPS)
```bash
ASPNETCORE_Kestrel__Certificates__Default__Password=YourCertPassword
ASPNETCORE_Kestrel__Certificates__Default__Path=/path/to/cert.pfx
```

## 📊 Monitoring Your Deployment

### Health Check Endpoint
Your app automatically provides:
- `GET /` - Frontend (HTML)
- `GET /api/ubike` - API health check

### Container Logs
```bash
# View logs
docker logs [container-name]

# Follow logs
docker logs -f [container-name]
```

### Resource Usage
```bash
# Check container stats
docker stats [container-name]
```

## 🔒 Security Considerations

### Production Checklist
- [ ] Use proper SSL certificates (not development certs)
- [ ] Set secure environment variables
- [ ] Configure firewall rules
- [ ] Enable container security scanning
- [ ] Use secrets management for sensitive data
- [ ] Regular security updates

### HTTPS in Production
Replace development certificate with proper SSL:
```bash
# Mount real certificate
docker run -v /path/to/real/cert.pfx:/https/cert.pfx \
  -e ASPNETCORE_Kestrel__Certificates__Default__Path=/https/cert.pfx \
  -e ASPNETCORE_Kestrel__Certificates__Default__Password=RealPassword \
  ghcr.io/[username]/[repository]:latest
```

## 🚨 Troubleshooting

### Common Issues
1. **Image not found**: Check GHCR permissions and image name
2. **Container won't start**: Check environment variables and ports
3. **HTTPS issues**: Verify certificate path and password
4. **API not responding**: Check CORS settings and network configuration

### Debug Commands
```bash
# Check if image exists
docker pull ghcr.io/[username]/[repository]:latest

# Run with debug output
docker run --rm -it ghcr.io/[username]/[repository]:latest /bin/bash

# Check container health
docker exec [container-id] curl http://localhost:8080/api/ubike
```

## 📈 Scaling and Performance

### Horizontal Scaling
Most platforms support auto-scaling:
- **AWS ECS**: Auto Scaling Groups
- **Google Cloud Run**: Automatic scaling
- **Kubernetes**: Horizontal Pod Autoscaler
- **Azure Container Instances**: Container Groups

### Performance Optimization
- Use CDN for static assets
- Enable gzip compression
- Configure caching headers
- Monitor resource usage
- Use health checks for load balancing

---

**Your deployment pipeline is ready! 🎉**

Just push to `main` branch and your optimized Docker image will be automatically built and published to GHCR, ready for deployment anywhere.
