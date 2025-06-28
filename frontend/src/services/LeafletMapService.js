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
      title: this.formatStationName(options.title) || ''
    }).addTo(map);

    // Create enhanced icon styles based on selection state
    const isSelected = options.isSelected || false;
    const distance = options.distance;
    const availableBikes = options.availableBikes || 0;
    const size = isSelected ? 48 : 36;

    // Create enhanced marker HTML
    let markerHTML = '';
    
    if (isSelected) {
      // Focused station styling
      markerHTML = `
        <div class="marker-container" style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <div class="marker-main focused" style="
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #ff4444, #ff6b35);
            border: 3px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4);
            transition: all 0.3s ease;
            animation: focusedPulse 2s infinite;
            z-index: 1000;
          ">🚴</div>
          <div class="marker-label" style="
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            margin-top: 8px;
            max-width: 150px;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">${this.formatStationName(options.title || '')}</div>
        </div>
      `;
    } else {
      // Nearby station styling with availability color coding
      let borderColor = '#ffffff';
      if (availableBikes === 0) {
        borderColor = '#dc3545'; // Red for no bikes
      } else if (availableBikes <= 4) {
        borderColor = '#ffc107'; // Orange for low bikes
      } else {
        borderColor = '#28a745'; // Green for good availability
      }

      const distanceBadge = distance !== undefined ? `
        <div class="distance-badge" style="
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: #ffffff;
          color: #2c3e50;
          border: 1px solid #dee2e6;
          border-radius: 10px;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: bold;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          z-index: 101;
        ">${distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`}</div>
      ` : '';
      
      markerHTML = `
        <div class="marker-container" style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
        ">
          <div class="marker-main nearby" style="
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(135deg, #007bff, #0056b3);
            border: 2px solid ${borderColor};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            box-shadow: 0 3px 8px rgba(0, 123, 255, 0.3);
            transition: all 0.3s ease;
            z-index: 100;
          ">🚴</div>
          ${distanceBadge}
        </div>
      `;
    }

    // Custom enhanced bike station icon
    const bikeIcon = L.divIcon({
      className: 'enhanced-bike-station-marker',
      html: markerHTML,
      iconSize: [size + 20, size + 30], // Extra space for labels and badges
      iconAnchor: [(size + 20)/2, size + 15] // Adjust anchor for labels
    });

    marker.setIcon(bikeIcon);
    
    // Set z-index for selected markers
    if (isSelected) {
      marker.setZIndexOffset(1000);
    } else {
      marker.setZIndexOffset(100);
    }

    // Add CSS animations if not already added
    if (!document.getElementById('leaflet-marker-animations')) {
      const style = document.createElement('style');
      style.id = 'leaflet-marker-animations';
      style.textContent = `
        @keyframes focusedPulse {
          0% { box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4); }
          50% { box-shadow: 0 4px 20px rgba(255, 68, 68, 0.6); }
          100% { box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4); }
        }
        
        .enhanced-bike-station-marker .marker-main.nearby:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.5) !important;
        }
        
        .enhanced-bike-station-marker {
          background: transparent !important;
          border: none !important;
        }
      `;
      document.head.appendChild(style);
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

  formatStationName(name) {
    const prefix = 'YouBike2.0_';
    if (name.startsWith(prefix)) {
      return name.substring(prefix.length);
    }
    return name;
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
