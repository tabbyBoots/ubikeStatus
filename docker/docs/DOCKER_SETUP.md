# Docker Setup Guide for uBike Status App

## Prerequisites

1. **Docker Desktop** installed and running
2. **Google Maps API Key** (required for Street View functionality)

## Setting up Google Maps API Key

### Option 1: Environment Variable (Recommended)

```bash
# Set the environment variable in your terminal
export VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here

# Verify it's set
echo $VITE_GOOGLE_MAPS_API_KEY
```

### Option 2: Add to your shell profile (Persistent)

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
echo 'export VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here' >> ~/.bashrc
source ~/.bashrc
```

## Building and Running with Docker

### Using the test script (Recommended)

```bash
# Make sure the API key is set first
export VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here

# Run the test script
./test-docker.sh
```

### Using Docker Compose

```bash
# Make sure the API key is set first
export VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here

# Build and run
docker-compose up --build
```

### Manual Docker Build

```bash
# Build with API key
docker build --build-arg VITE_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY" -t ubike-app .

# Run the container
docker run -d -p 8080:8080 -p 8443:8443 \
    -e ASPNETCORE_ENVIRONMENT=Production \
    -e "ASPNETCORE_URLS=https://+:8443;http://+:8080" \
    -e ASPNETCORE_Kestrel__Certificates__Default__Password=REDACTED_PASSWORD \
    -e ASPNETCORE_Kestrel__Certificates__Default__Path=/https/aspnetapp.pfx \
    --name ubike-app ubike-app
```

## Accessing the Application

After successful build and run:

- **HTTP**: http://localhost:8080
- **HTTPS**: https://localhost:8443 (will show security warning for dev certificate)

## Troubleshooting

### Street View not working in Docker

1. **Check API key**: Make sure `VITE_GOOGLE_MAPS_API_KEY` is set before building
2. **Rebuild**: If you added the API key after building, rebuild the image:
   ```bash
   docker-compose down
   docker-compose up --build
   ```
3. **Check browser console**: Open developer tools to see any API errors

### Common Issues

- **"API key not set" warning**: Set the environment variable before building
- **Blank Street View**: Usually means the API key wasn't available during build time
- **HTTPS certificate warnings**: Normal for development certificates, click "Advanced" → "Proceed"

## Security Notes

- Never commit API keys to version control
- Use environment variables or secure secret management in production
- The development certificate is only for testing - use proper SSL certificates in production
