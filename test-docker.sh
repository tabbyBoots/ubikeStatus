#!/bin/bash

echo "🚀 Testing Docker Build for uBike Full-Stack App"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if Google Maps API key is set
if [ -z "$VITE_GOOGLE_MAPS_API_KEY" ]; then
    echo "⚠️  Warning: VITE_GOOGLE_MAPS_API_KEY environment variable is not set"
    echo "   Street View functionality may not work in the Docker container"
    echo "   To fix this, run: export VITE_GOOGLE_MAPS_API_KEY=your_api_key_here"
    echo ""
    echo "   Continuing build without API key..."
    GOOGLE_MAPS_API_KEY=""
else
    GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY"
    echo "🗝️  Using Google Maps API Key: ${GOOGLE_MAPS_API_KEY:0:10}..."
fi

# Set SSL certificate password (use environment variable or default)
SSL_CERT_PASSWORD=${SSL_CERT_PASSWORD:-"TestPassword123!"}
echo "🔑 Using SSL Certificate Password..."

# Build the image with Google Maps API key and SSL password
echo "🔨 Building Docker image..."
if docker build \
    --build-arg VITE_GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" \
    --build-arg SSL_CERT_PASSWORD="$SSL_CERT_PASSWORD" \
    -t ubike-app-test .; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed"
    exit 1
fi

# Run the container with both HTTP and HTTPS ports
echo "🏃 Starting container on ports 8080 (HTTP) and 8443 (HTTPS)..."
CONTAINER_ID=$(docker run -d -p 8080:8080 -p 8443:8443 \
    -e ALLOWED_HOSTS=localhost \
    -e ASPNETCORE_ENVIRONMENT=Production \
    -e "ASPNETCORE_URLS=https://+:8443;http://+:8080" \
    -e SSL_CERT_PASSWORD="$SSL_CERT_PASSWORD" \
    -e ASPNETCORE_Kestrel__Certificates__Default__Password="$SSL_CERT_PASSWORD" \
    -e ASPNETCORE_Kestrel__Certificates__Default__Path=/https/aspnetapp.pfx \
    --name ubike-test ubike-app-test)

if [ $? -eq 0 ]; then
    echo "✅ Container started successfully"
    echo "📱 App available at:"
    echo "   🔓 HTTP:  http://localhost:8080"
    echo "   🔒 HTTPS: https://localhost:8443"
    echo "🆔 Container ID: $CONTAINER_ID"
    
    # Wait a moment for the app to start
    echo "⏳ Waiting 15 seconds for app to initialize..."
    sleep 15
    
    # Test HTTP endpoint
    echo "🧪 Testing HTTP endpoint..."
    if curl -f http://localhost:8080 > /dev/null 2>&1; then
        echo "✅ HTTP endpoint responding on port 8080"
    else
        echo "⚠️  HTTP endpoint may still be starting up"
    fi
    
    # Test HTTPS endpoint (ignore certificate warnings for dev cert)
    echo "🧪 Testing HTTPS endpoint..."
    if curl -k -f https://localhost:8443 > /dev/null 2>&1; then
        echo "✅ HTTPS endpoint responding on port 8443"
    else
        echo "⚠️  HTTPS endpoint may still be starting up"
    fi
    
    echo ""
    echo "🔍 To view logs: docker logs ubike-test"
    echo "🛑 To stop: docker stop ubike-test"
    echo "🗑️  To remove: docker rm ubike-test"
    echo "🖼️  To remove image: docker rmi ubike-app-test"
    echo ""
    echo "⚠️  Note: HTTPS uses a development certificate, so browsers will show security warnings."
    echo "   This is normal for local testing. In production, use proper SSL certificates."
else
    echo "❌ Failed to start container"
    exit 1
fi
