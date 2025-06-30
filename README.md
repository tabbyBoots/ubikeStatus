# uBike Status Application

A real-time Taipei uBike station monitoring application that provides live availability data for YouBike stations across Taipei City.

## 📚 Table of Contents

- [🚴‍♂️ Features](#%EF%B8%8F-features)
- [🛠️ Technology Stack](#%EF%B8%8F-technology-stack)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [DevOps & Deployment](#devops--deployment)
- [📋 Prerequisites](#%EF%B8%8F-prerequisites)
- [🚀 Quick Start](#-quick-start)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [📁 Project Structure](#-project-structure)
- [🔌 API Endpoints](#-api-endpoints)
  - [Base URL](#base-url)
  - [Get All Stations](#get-all-stations)
  - [Get Stations by Area](#get-stations-by-area)
- [🔧 Development](#-development)
  - [Running in Development Mode](#running-in-development-mode)
  - [API Documentation](#api-documentation)
  - [Building for Production](#building-for-production)
- [🚀 Deployment](#-deployment)
  - [Docker Deployment (Recommended)](#docker-deployment-recommended)
  - [Railway Deployment (Recommended for Production)](#railway-deployment-recommended-for-production)
  - [GitHub Actions CI/CD](#github-actions-cicd)
  - [Local Testing](#local-testing)
- [📊 Data Source](#-data-source)
- [🔧 Configuration](#-configuration)
  - [Environment Variables](#environment-variables)
  - [Google Maps API Setup (Optional)](#google-maps-api-setup-optional)
- [Troubleshooting](#troubleshooting)
- [📸 Screenshots](#-screenshots)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)
- [🙏 Acknowledgments](#-acknowledgments)

## 🚴‍♂️ Features

- **Real-time Data**: Live uBike station availability from Taipei City's official API
- **Interactive Maps**: Integrated Google Maps with station locations and detailed information
  - **Smart Marker Management**: Dynamic station markers that properly appear/disappear based on map location
  - **Location-Based Filtering**: Automatic 1km radius filtering around map center with proper cleanup
- **Favorites System**: Save and manage your favorite stations with persistent storage
- **Advanced Filtering & Search**:
  - Filter by area/district with default "所有區域" (All Areas) selection
  - Filter by availability (bikes available, parking spaces available, favorites)
  - Real-time search by station name, address, or English name
  - Sorting by station name, area, or availability counts
  - One-click reset filters functionality
  - Clear visual indicators for active filters
- **Station Details**: View comprehensive information including:
  - Available bikes for rent
  - Available parking spaces
  - Station location and address
  - Last update time
  - Station operational status
  - Interactive map location
- **Multiple View Modes**: Switch between table and card views with persistent preference storage
- **Export Functionality**: Export filtered station data for analysis
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Auto-refresh**: Automatic data updates every 60 seconds
- **Statistics Dashboard**: Real-time stats showing total stations, active stations, available bikes, and parking slots
- **Geolocation Support**: Find nearby stations based on current location
- **Dual Map Support**: Google Maps as primary with Leaflet/OpenStreetMap as fallback

## 🛠️ Technology Stack

### Frontend
- **Vue.js 3.x** - Progressive JavaScript framework with Composition API
- **Vite 6.x** - Fast build tool and development server
- **Pinia 3.x** - State management for Vue.js
- **Vue Router 4.x** - Client-side routing
- **Axios 1.x** - HTTP client for API requests
- **Google Maps JavaScript API** - Interactive map integration for station locations
- **Leaflet** - Alternative fallback map service with OpenStreetMap tiles

### Backend
- **.NET 9** - Modern web API framework
- **ASP.NET Core Web API** - RESTful API development
- **OpenAPI/Swagger** - API documentation with Scalar UI
- **HttpClient** - External API integration for real-time data fetching

### DevOps & Deployment
- **Docker** - Containerized deployment with multi-stage builds
- **GitHub Actions** - Automated CI/CD pipeline with Docker image publishing
- **HTTPS Support** - Built-in SSL/TLS encryption for secure communication
- **GitHub Container Registry** - Automated image storage and distribution
- **Multi-Architecture Support** - AMD64 and ARM64 container images
- **Production Optimization** - Separate development and production Docker configurations

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher) - Required for frontend development
- **.NET 9 SDK** - Required for backend development
- **Git** - Version control
- **Docker** (optional) - For containerized deployment
- **Google Maps API Key** (optional) - For enhanced map features

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ubikeStatus
```

### 2. Backend Setup

```bash
cd backend
dotnet restore
dotnet build
dotnet run
```

The backend API will be available at `http://localhost:5001`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 📁 Project Structure

```
ubikeStatus/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline
├── backend/                    # .NET Web API
│   ├── Controllers/           # API controllers
│   │   └── uBikeController.cs # uBike endpoints
│   ├── Models/               # Data models
│   │   └── uBikeStation.cs   # Station model
│   ├── AppCode/
│   │   └── AppService/       # Business logic
│   │       └── uBikeService.cs # uBike service
│   ├── Properties/           # Launch settings
│   ├── Program.cs           # Application entry point
│   └── backend.csproj       # Project file
├── frontend/                 # Vue.js application
│   ├── src/
│   │   ├── components/      # Vue components
│   │   │   ├── UbikeStations.vue    # Main stations display component
│   │   │   ├── stationsList.vue     # Stations list view
│   │   │   ├── stationsDetail.vue   # Station detail view
│   │   │   ├── ViewToggle.vue       # Table/Card view switcher
│   │   │   ├── ExportButton.vue     # Data export functionality
│   │   │   ├── FavoritesButton.vue  # Favorites management
│   │   │   └── maps/               # Map-related components
│   │   │       └── MapModal.vue    # Interactive map modal
│   │   ├── services/       # Service layer
│   │   │   ├── GoogleMapsService.js # Google Maps integration
│   │   │   └── LeafletMapService.js # Leaflet maps integration
│   │   ├── views/          # Page components
│   │   │   └── uBikeView.vue
│   │   ├── stores/         # Pinia stores
│   │   │   ├── ubike.js           # Main application state
│   │   │   └── favorites.js       # Favorites management
│   │   ├── api/           # API integration
│   │   │   └── ubike.js
│   │   ├── App.vue        # Root component
│   │   └── main.js        # Application entry
│   ├── package.json       # Dependencies
│   └── vite.config.js     # Vite configuration
├── docker/
│   └── docs/
│       ├── DOCKER_DEPLOYMENT.md   # Detailed Docker deployment guide
│       ├── DOCKER_SETUP.md        # Docker setup instructions
│       └── QUICK_DEPLOY.md        # Quick Docker deployment guide
├── Dockerfile              # Multi-stage Docker build for production
├── Dockerfile.dev          # Dockerfile for development environment
├── .dockerignore          # Docker build optimization
├── docker-compose.yml     # Container orchestration
├── exec_proj.sh           # Script to execute the project
├── test-docker.sh         # Docker testing script
├── RAILWAY_DEPLOYMENT.md  # Detailed Railway deployment guide
├── SECURITY_FIXES.md      # Document for security fixes
└── README.md             # This file
```

## 🔌 API Endpoints

### Base URL: `http://localhost:5001/api/ubike`

#### Get All Stations
```http
GET /api/ubike
```
Returns all uBike stations with current availability data.

**Response:**
```json
[
  {
    "sno": "500101001",
    "sna": "YouBike2.0_捷運市政府站(3號出口)",
    "total": 180,
    "available_rent_bikes": 23,
    "sarea": "信義區",
    "mday": "2025-06-25 15:30:15",
    "lat": 25.0408578889,
    "lng": 121.567904444,
    "ar": "11049臺北市信義區忠孝東路五段6號前方",
    "available_return_bikes": 157,
    "act": 1
  }
]
```

**Field Descriptions:**
- `sno`: Station unique identifier
- `sna`: Station name (Chinese)
- `total`: Total bike slots at station
- `available_rent_bikes`: Available bikes for rent
- `available_return_bikes`: Available parking spaces
- `sarea`: District/Area name
- `mday`: Last update timestamp
- `lat`/`lng`: GPS coordinates
- `ar`: Full address
- `act`: Station status (1=active, 0=inactive)

#### Get Stations by Area
```http
GET /api/ubike/area/{area}
```
Returns stations filtered by specific area.

**Parameters:**
- `area` (string): Area name (e.g., "信義區", "大安區")

## 🔧 Development

### Running in Development Mode

1. **Start Backend:**
   ```bash
   cd backend
   dotnet run
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

### API Documentation

When running in development mode, visit `http://localhost:5001/scalar/v1` to access the interactive API documentation.

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
cd backend
dotnet publish -c Release
```

## 🚀 Deployment

### Docker Deployment (Recommended)

This project supports full-stack Docker deployment with HTTPS support:

#### Quick Docker Start
```bash
# Using Docker Compose (recommended)
docker-compose up --build

# Access the application:
# - HTTPS: https://localhost:8443
# - HTTP: http://localhost:8080
```

#### Manual Docker Build
```bash
# Note: Ensure VITE_GOOGLE_MAPS_API_KEY and SSL_CERT_PASSWORD are set in your environment
export SSL_CERT_PASSWORD="your_secure_password"

# Build the image
docker build \
  --build-arg VITE_GOOGLE_MAPS_API_KEY="$VITE_GOOGLE_MAPS_API_KEY" \
  --build-arg SSL_CERT_PASSWORD="$SSL_CERT_PASSWORD" \
  -t ubike-app .

# Run with HTTPS support
docker run -p 8080:8080 -p 8443:8443 \
  -e ALLOWED_HOSTS=localhost \
  -e ASPNETCORE_URLS="https://+:8443;http://+:8080" \
  -e SSL_CERT_PASSWORD="$SSL_CERT_PASSWORD" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Password="${SSL_CERT_PASSWORD}" \
  -e ASPNETCORE_Kestrel__Certificates__Default__Path="/https/aspnetapp.pfx" \
  ubike-app
```

#### Docker Features
- **Multi-stage Build**: Optimized image size with separate build and runtime stages
- **HTTPS Support**: Built-in SSL certificate for secure communication
- **Static File Serving**: Backend serves both API and frontend files
- **Production Ready**: Configured for production deployment
- **Development Mode**: Optional development container with hot-reload support
- **Health Checks**: Container health monitoring capabilities

For detailed Docker deployment instructions, see [docker/docs/DOCKER_DEPLOYMENT.md](docker/docs/DOCKER_DEPLOYMENT.md).

### Railway Deployment (Recommended for Production)

For easy production deployment with proper security configuration:

📖 **See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for detailed Railway deployment instructions**

Key features:
- **Environment Variable Configuration**: Secure SSL certificate and CORS management
- **Automatic HTTPS**: Railway handles SSL certificates automatically
- **Easy Scaling**: Built-in scaling and monitoring
- **Custom Domains**: Support for custom domain configuration

### GitHub Actions CI/CD

Automated deployment pipeline with comprehensive testing:

- **Triggers**: Push to `main` branch and pull requests
- **Build Process**:
  1. **Frontend Pipeline**: Install dependencies → Build with Vite → Upload artifacts
  2. **Backend Pipeline**: Restore packages → Build with .NET 9 → Run tests → Upload artifacts
  3. **Docker Pipeline**: Multi-architecture build → Push to GitHub Container Registry
- **Multi-Architecture Support**: AMD64 and ARM64 container images
- **Caching**: Optimized build times with GitHub Actions cache
- **Artifact Management**: Build artifacts stored for deployment

**Container Images**: Available at `ghcr.io/[username]/[repository]`

The workflow configuration is located at `.github/workflows/deploy.yml`.

### Local Testing

Use the provided test script to build and run the application in a local Docker container. It automates environment variable and certificate password management.
```bash
# Make executable and run
chmod +x test-docker.sh
./test-docker.sh
```

## 📊 Data Source

This application uses the official Taipei City uBike API:
- **API URL**: `https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json`
- **Data Provider**: Taipei City Government
- **Update Frequency**: Real-time updates
- **Official Dataset**: [Taipei Open Data Portal](https://data.taipei/dataset/detail?id=c6bc8aed-557d-41d5-bfb1-8da24f78f2fb)

## 🔧 Configuration

### Environment Variables

**Frontend** (optional):
```bash
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Backend** (Docker deployment):
```bash
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=https://+:8443;http://+:8080
ALLOWED_HOSTS=localhost
SSL_CERT_PASSWORD=your_secure_password_here
ASPNETCORE_Kestrel__Certificates__Default__Password=${SSL_CERT_PASSWORD}
ASPNETCORE_Kestrel__Certificates__Default__Path=/https/aspnetapp.pfx
```

### Google Maps API Setup (Optional)

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Maps JavaScript API** and the **Directions API**.
4. Create an API key with appropriate restrictions.
5. Add the key to your environment variables.

**Note**: The application includes Leaflet/OpenStreetMap as a fallback if Google Maps API is not configured.

## Troubleshooting

Here are some common issues and their solutions:

### 1. Google Maps `RefererNotAllowedMapError`

**Issue**: The map appears blank, and the console shows `RefererNotAllowedMapError`. This means your Google Maps API key is not authorized for the domain you are accessing the application from.

**Solution**:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to "APIs & Services" > "Credentials".
3. Select the API key you are using.
4. Under "Application restrictions", ensure "HTTP referrers (web sites)" is selected.
5. Add `https://localhost:8443/*` (or the specific URL you are using) to the list of "Website restrictions". The `*` is crucial to allow all paths under that origin.
6. **If running in Docker**: After updating the API key restrictions, you must rebuild your Docker image to ensure the frontend picks up the latest configuration.
   ```bash
   docker stop ubike-test && docker rm ubike-test # Stop and remove old container
   docker rmi ubike-app-test # Remove old image
   ./test-docker.sh # Rebuild and run
   ```

### 2. Docker Container Fails with `CryptographicException`
**Issue**: The Docker container fails to start, and logs show `System.Security.Cryptography.CryptographicException: The certificate data cannot be read with the provided password, the password may be incorrect.`
**Solution**: This error occurs when the password used to create the SSL certificate during the Docker build does not match the password provided at runtime.
- The `test-docker.sh` script handles this automatically by using the same password for both build and run.
- If building manually, ensure you pass the `SSL_CERT_PASSWORD` as a build argument and as an environment variable:
  ```bash
  # Use the same password for both build-arg and env var
  export SSL_PASS="your_secure_password"
  docker build --build-arg SSL_CERT_PASSWORD="$SSL_PASS" -t ubike-app .
  docker run -e SSL_CERT_PASSWORD="$SSL_PASS" ... ubike-app
  ```

### 3. Backend Fails with `ArgumentException: Decoded string is not a valid IDN name`
**Issue**: The application fails to start, particularly in a Docker environment, with an error related to an invalid IDN name.
**Solution**: This is caused by an invalid value in the `AllowedHosts` configuration. For Docker, the host needs to be explicitly defined.
- The `test-docker.sh` script sets `ALLOWED_HOSTS=localhost` automatically.
- If running manually, add `-e ALLOWED_HOSTS=localhost` to your `docker run` command.
- For non-Docker environments, check the `AllowedHosts` setting in `appsettings.json` or any `ASPNETCORE_ALLOWED_HOSTS` environment variable.

### 4. Map Appears Blank with `TypeError: IntersectionObserver.observe: Argument 1 is not an object.`

**Issue**: When opening the map modal or switching back from Street View, the map area is blank, and the console shows an `IntersectionObserver` error. This indicates a timing issue where the Google Maps API tries to initialize on a DOM element that is not yet fully rendered or available.

**Solution**: This issue has been addressed in the application code by implementing a robust waiting mechanism that ensures the map container element is fully ready before the map initialization proceeds. If you encounter this after pulling the latest changes, ensure your local repository is up-to-date.

### 5. Map Markers Not Disappearing When Moving Map (FIXED)

**Issue**: When switching to map mode and moving the map center, some station markers (especially those from the default MRT Taipei City Hall location) would not disappear even when they were far from the current map center. Some nearby stations would also persist incorrectly.

**Solution**: This issue has been completely resolved in the latest version with comprehensive map marker management improvements:
- **Fixed Race Conditions**: Added concurrency control to prevent multiple marker updates from interfering with each other
- **Enhanced State Tracking**: Improved tracking of which stations are currently displayed on the map
- **Robust Cleanup Process**: Better marker removal logic with proper error handling and comprehensive logging
- **Force Clear Functionality**: Added ability to completely clear all markers when switching between different location sources
- **Improved Event Handling**: Enhanced guards to prevent unnecessary updates during ongoing operations

**What's Fixed**:
- Default location (MRT Taipei City Hall) stations now properly disappear when moving the map
- All markers outside the 1km radius are correctly removed
- No more duplicate or persistent markers from previous locations
- Consistent behavior across all location sources (GPS, default, selected station)
- Better performance with reduced redundant operations

If you encounter any marker-related issues, check the browser console for detailed logging that shows which stations are being added/removed during map interactions.

## 📸 Screenshots

<!-- Add screenshots here -->
*Screenshots will be added to showcase the application interface and features.*

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Taipei City Government for providing the open data API
- Vue.js and .NET communities for excellent documentation
- All contributors who help improve this project

---

**Made with ❤️ for the Taipei cycling community**