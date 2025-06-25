// Fallback map service using Leaflet and OpenStreetMap
class LeafletMapService {
  constructor() {
    this.leafletLoaded = false;
  }

  async loadLeaflet() {
    if (this.leafletLoaded) return;

    // Load Leaflet CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);

    // Load Leaflet JS
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      script.onload = () => {
        this.leafletLoaded = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Leaflet'));
      };
      document.head.appendChild(script);
    });
  }

  async createMap(container, options = {}) {
    await this.loadLeaflet();
    
    const defaultOptions = {
      center: [25.0330, 121.5654], // Default to Taipei
      zoom: 15,
      ...options
    };

    // Clear container
    container.innerHTML = '';

    const map = L.map(container, {
      center: defaultOptions.center,
      zoom: defaultOptions.zoom
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    return map;
  }

  async createMarker(map, position, options = {}) {
    await this.loadLeaflet();

    const marker = L.marker([position.lat, position.lng], {
      title: options.title || ''
    }).addTo(map);

    // Create different icon styles based on selection state
    const isSelected = options.isSelected || false;
    const iconColor = isSelected ? '#ff4444' : '#007bff';
    const size = isSelected ? 40 : 32;
    const fontSize = isSelected ? 20 : 16;

    // Custom bike station icon
    const bikeIcon = L.divIcon({
      className: 'bike-station-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${iconColor};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${fontSize}px;
          font-weight: bold;
          color: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        ">🚴</div>
      `,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });

    marker.setIcon(bikeIcon);
    
    // Set z-index for selected markers
    if (isSelected) {
      marker.setZIndexOffset(1000);
    }
    
    return marker;
  }

  async createInfoWindow(content, options = {}) {
    await this.loadLeaflet();
    return {
      content,
      open: (map, marker) => {
        marker.bindPopup(content, options).openPopup();
      }
    };
  }

  getStreetViewUrl(lat, lng) {
    // For Leaflet, we'll still use Google Street View API for the image
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      size: '300x150',
      fov: 90,
      heading: 0,
      pitch: 0,
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    });

    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
  }

  openStreetView(lat, lng) {
    // Open Google Maps street view in new tab
    const url = `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i13312!8i6656`;
    window.open(url, '_blank');
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  async findNearbyStations(center, radius = 500, stations = []) {
    const nearbyStations = stations
      .map(station => {
        const distance = this.calculateDistance(
          center.lat, center.lng,
          parseFloat(station.latitude), parseFloat(station.longitude)
        );
        return { ...station, distance };
      })
      .filter(station => station.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    return nearbyStations;
  }

  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        error => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    });
  }
}

export default new LeafletMapService();
