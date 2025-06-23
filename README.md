# uBike Status Application

A real-time Taipei uBike station monitoring application that provides live availability data for YouBike stations across Taipei City.

## 🚴‍♂️ Features

- **Real-time Data**: Live uBike station availability from Taipei City's official API
- **Area Filtering**: Filter stations by specific areas/districts
- **Station Details**: View detailed information including:
  - Available bikes for rent
  - Available parking spaces
  - Station location and address
  - Last update time
  - Station status
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Export Functionality**: Export station data for analysis
- **Multiple View Modes**: List and detailed view options

## 🛠️ Technology Stack

### Frontend
- **Vue.js 3** - Progressive JavaScript framework with Composition API
- **Vite** - Fast build tool and development server
- **Pinia** - State management for Vue.js
- **Vue Router** - Client-side routing
- **Axios** - HTTP client for API requests

### Backend
- **.NET 9** - Modern web API framework
- **ASP.NET Core Web API** - RESTful API development
- **OpenAPI/Swagger** - API documentation with Scalar UI
- **HttpClient** - External API integration

### DevOps
- **GitHub Actions** - Automated CI/CD pipeline
- **Vite Build** - Optimized production builds

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **.NET 9 SDK**
- **Git**
- **GitHub CLI** (optional, for repository management)

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

The backend API will be available at `https://localhost:7135`

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
│   │   │   ├── UbikeStations.vue
│   │   │   ├── stationsList.vue
│   │   │   ├── stationsDetail.vue
│   │   │   ├── ViewToggle.vue
│   │   │   └── ExportButton.vue
│   │   ├── views/          # Page components
│   │   │   └── uBikeView.vue
│   │   ├── stores/         # Pinia stores
│   │   │   └── ubike.js
│   │   ├── api/           # API integration
│   │   │   └── ubike.js
│   │   ├── App.vue        # Root component
│   │   └── main.js        # Application entry
│   ├── .github/
│   │   └── workflows/
│   │       └── deploy.yml  # CI/CD pipeline
│   ├── package.json       # Dependencies
│   └── vite.config.js     # Vite configuration
└── README.md             # This file
```

## 🔌 API Endpoints

### Base URL: `https://localhost:7135/api/ubike`

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
    "mday": "2025-06-23 15:30:15",
    "lat": 25.0408578889,
    "lng": 121.567904444,
    "ar": "11049臺北市信義區忠孝東路五段6號前方",
    "available_return_bikes": 157,
    "act": 1
  }
]
```

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

When running in development mode, visit `https://localhost:7135/scalar/v1` to access the interactive API documentation.

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

This project includes a GitHub Actions workflow for automated deployment:

- **Trigger**: Push to `main` branch
- **Process**: 
  1. Checkout code
  2. Setup Node.js environment
  3. Install dependencies
  4. Build project
  5. Upload build artifacts

The workflow file is located at `frontend/.github/workflows/deploy.yml`.

## 📊 Data Source

This application uses the official Taipei City uBike API:
- **API URL**: `https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json`
- **Data Provider**: Taipei City Government
- **Update Frequency**: Real-time updates
- **Official Dataset**: [Taipei Open Data Portal](https://data.taipei/dataset/detail?id=c6bc8aed-557d-41d5-bfb1-8da24f78f2fb)

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
