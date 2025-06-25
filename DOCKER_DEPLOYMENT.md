# Docker Deployment Guide

This project now supports full-stack Docker deployment with automated CI/CD via GitHub Actions.

## Architecture

- **Frontend**: Vue.js 3 with Vite (built as static files)
- **Backend**: .NET 9 WebAPI (serves both API and static frontend files)
- **Deployment**: Single Docker container with multi-stage build

## Local Development

### Option 1: Traditional Development (Recommended for development)
```bash
# Terminal 1 - Backend
cd backend
dotnet run

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev
```

### Option 2: Docker Development
```bash
# Build and run production container locally
docker-compose up --build

# Access the app at http://localhost:8080
```

## Production Deployment

### GitHub Actions CI/CD

The workflow automatically:

1. **Build & Test**: 
   - Builds frontend (Vue.js with Vite)
   - Builds backend (.NET 9)
   - Runs tests (if available)

2. **Docker Build & Push** (on main branch):
   - Creates multi-stage Docker image
   - Pushes to GitHub Container Registry (ghcr.io)
   - Supports both AMD64 and ARM64 architectures

### Manual Docker Build

```bash
# Build the image
docker build -t ubike-app .

# Run the container
docker run -p 8080:8080 ubike-app

# Access at http://localhost:8080
```

### Docker Compose

```bash
# Production build with HTTPS support
docker-compose up --build

# Access the application:
# HTTP:  http://localhost:8080
# HTTPS: https://localhost:8443 (development certificate - browser will warn)

# Development mode (if Dockerfile.dev exists)
docker-compose --profile dev up --build
```

## Container Registry

Images are automatically pushed to:
- `ghcr.io/[your-username]/[your-repo]:latest`
- `ghcr.io/[your-username]/[your-repo]:main-[commit-sha]`

## Environment Configuration

### Production Environment Variables

- `ASPNETCORE_ENVIRONMENT=Production`
- `ASPNETCORE_URLS=https://+:8443;http://+:8080`
- `SSL_CERT_PASSWORD=your_secure_password_here` (Set via environment variable)
- `ASPNETCORE_Kestrel__Certificates__Default__Password=${SSL_CERT_PASSWORD}`
- `ASPNETCORE_Kestrel__Certificates__Default__Path=/https/aspnetapp.pfx`

### HTTPS Configuration

The Docker setup now includes proper HTTPS support:

- **Development Certificate**: Automatically generated in the container
- **HTTP Port**: 8080 (for compatibility and health checks)
- **HTTPS Port**: 8443 (primary secure endpoint)
- **Certificate Location**: `/https/aspnetapp.pfx` inside container
- **Certificate Password**: Set via `SSL_CERT_PASSWORD` environment variable (secure)

#### For Production Deployment:
1. Replace development certificate with proper SSL certificate
2. Update certificate path and password environment variables
3. Consider using certificate management services (Let's Encrypt, etc.)
4. Mount certificate volumes from host or use orchestration secrets

### Development vs Production

- **Development**: Frontend and backend run separately with proxy
- **Production**: Backend serves both API and static frontend files

## File Structure Changes

```
├── .github/workflows/deploy.yml    # Moved from frontend/.github/
├── Dockerfile                      # Multi-stage build
├── .dockerignore                   # Docker build optimization
├── docker-compose.yml              # Local container orchestration
├── frontend/                       # Vue.js app
└── backend/                        # .NET WebAPI
```

## Key Changes Made

1. **GitHub Actions Workflow**:
   - Moved to repository root (`.github/workflows/deploy.yml`)
   - Updated to build both frontend and backend
   - Added Docker build and push steps
   - Updated Node.js version to 18

2. **Backend Configuration**:
   - Added static file serving (`UseDefaultFiles()`, `UseStaticFiles()`)
   - Added SPA fallback routing (`MapFallbackToFile()`)

3. **Frontend Configuration**:
   - Updated Vite config with explicit build settings
   - Maintained development proxy configuration

4. **Docker Setup**:
   - Multi-stage Dockerfile for optimized builds
   - Comprehensive .dockerignore for faster builds
   - Docker Compose for local testing

## Deployment Workflow

1. **Push to main branch**
2. **GitHub Actions triggers**:
   - Builds frontend and backend
   - Runs tests
   - Creates Docker image
   - Pushes to container registry
3. **Deploy the container** to your hosting platform

## Next Steps

1. Configure your hosting platform to pull from `ghcr.io`
2. Set up environment variables on your hosting platform
3. Configure domain and SSL certificates
4. Set up monitoring and logging

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js and .NET versions in workflow
2. **Container won't start**: Verify port 8080 is available
3. **API calls fail**: Check CORS configuration in backend
4. **Static files not served**: Verify frontend build output in `dist/`

### Logs

```bash
# View container logs
docker logs [container-id]

# Follow logs in real-time
docker logs -f [container-id]
