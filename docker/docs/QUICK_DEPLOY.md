# Quick Deployment Reference

## 🚀 Ready-to-Use Commands

### 1. Test Locally
```bash
# Test the multi-stage Docker build
./test-docker.sh

# Or manually:
docker build -t ubike-app .
docker run -p 8080:8080 -p 8443:8443 \
  -e ASPNETCORE_URLS="https://+:8443;http://+:8080" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Password="REDACTED_PASSWORD" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Path="/https/aspnetapp.pfx" \
  ubike-app
```

### 2. Deploy to GitHub Container Registry
```bash
# Just push to main branch - automatic!
git add .
git commit -m "Deploy to production"
git push origin main

# Your image will be available at:
# ghcr.io/[your-username]/[your-repo]:latest
```

### 3. Deploy to Popular Platforms

#### Docker Compose (VPS/Local)
```bash
# Create docker-compose.prod.yml
cat > docker-compose.prod.yml << EOF
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
EOF

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

#### Railway
```bash
npm install -g @railway/cli
railway login
railway link
railway up --detach
```

#### Google Cloud Run
```bash
gcloud run deploy ubike-app \
  --image ghcr.io/[username]/[repository]:latest \
  --platform managed \
  --port 8080 \
  --allow-unauthenticated
```

#### Azure Container Instances
```bash
az container create \
  --resource-group myResourceGroup \
  --name ubike-app \
  --image ghcr.io/[username]/[repository]:latest \
  --ports 8080 \
  --dns-name-label ubike-app-unique
```

## 🔧 Environment Variables

### Minimal (HTTP only)
```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
```

### With HTTPS
```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=https://+:8443;http://+:8080
ASPNETCORE_Kestrel__Certificates__Default__Password=REDACTED_PASSWORD
ASPNETCORE_Kestrel__Certificates__Default__Path=/https/aspnetapp.pfx
```

## 📋 Deployment Checklist

- [ ] Code pushed to `main` branch
- [ ] GitHub Actions workflow completed successfully
- [ ] Container image available in GHCR
- [ ] Environment variables configured
- [ ] Ports exposed correctly (8080 for HTTP, 8443 for HTTPS)
- [ ] Health check endpoint responding (`/api/ubike`)

## 🔍 Quick Troubleshooting

### Container won't start?
```bash
# Check logs
docker logs [container-name]

# Test image locally
docker run --rm -it ghcr.io/[username]/[repository]:latest /bin/bash
```

### API not responding?
```bash
# Test health endpoint
curl http://localhost:8080/api/ubike

# Check if container is running
docker ps
```

### HTTPS issues?
```bash
# Test with curl (ignore cert warnings)
curl -k https://localhost:8443/api/ubike

# Check certificate
openssl s_client -connect localhost:8443 -servername localhost
```

## 📊 Your Image Info

After pushing to main, your image will be:
- **Registry**: `ghcr.io`
- **Image**: `ghcr.io/[your-username]/[your-repo]:latest`
- **Tags**: `latest`, `main-[commit-sha]`
- **Architectures**: `linux/amd64`, `linux/arm64`
- **Size**: Optimized with multi-stage build

## 🎯 One-Command Deploy Examples

### Render.com
1. Go to render.com
2. "New Web Service"
3. Docker Image: `ghcr.io/[username]/[repository]:latest`
4. Port: `8080`

### Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch --image ghcr.io/[username]/[repository]:latest
```

### DigitalOcean App Platform
```yaml
# app.yaml
name: ubike-app
services:
- name: web
  image:
    registry_type: GHCR
    registry: ghcr.io
    repository: [username]/[repository]
    tag: latest
  http_port: 8080
  instance_count: 1
  instance_size_slug: basic-xxs
```

---

**🎉 Your app is production-ready!**

Just replace `[username]` and `[repository]` with your actual GitHub username and repository name.
