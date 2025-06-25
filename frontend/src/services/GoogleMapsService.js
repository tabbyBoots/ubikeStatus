import { Loader } from '@googlemaps/js-api-loader';

class GoogleMapsService {
  constructor() {
    this.loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry', 'marker']
    });
    this.google = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.placesService = null;
  }

  async initialize() {
    if (!this.google) {
      // Check if API key exists
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        throw new Error('Google Maps API key is missing. Please check your .env file.');
      }
      
      try {
        this.google = await this.loader.load();
        
        this.directionsService = new this.google.maps.DirectionsService();
        this.directionsRenderer = new this.google.maps.DirectionsRenderer();
      } catch (error) {
        // Provide more specific error messages
        let errorMessage = 'Google Maps failed to load';
        if (error.message.includes('InvalidKeyMapError')) {
          errorMessage = 'Invalid Google Maps API key. Please check your API key configuration.';
        } else if (error.message.includes('RefererNotAllowedMapError')) {
          errorMessage = 'Domain not allowed. Please add your domain to the API key restrictions.';
        } else if (error.message.includes('RequestDeniedMapError')) {
          errorMessage = 'Request denied. Please check your API key permissions and billing.';
        } else if (error.message.includes('OverQuotaMapError')) {
          errorMessage = 'API quota exceeded. Please check your billing and usage limits.';
        } else {
          errorMessage = `Google Maps failed to load: ${error.message}`;
        }
        
        throw new Error(errorMessage);
      }
    }
    return this.google;
  }

  async createMap(container, options = {}) {
    const google = await this.initialize();
    const defaultOptions = {
      zoom: 15,
      mapId: '98295c154ca32e2abb77ac57', //可以在Google Cloud自定義地圖 
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: true,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      ...options
    };
    
    const map = new google.maps.Map(container, defaultOptions);
    
    // Debug map rendering mode
    setTimeout(() => {
      console.log('🔍 Map rendering type:', map.getRenderingType());
      console.log('🔍 Map capabilities:', {
        supportsAdvancedMarkers: map.getCapabilities?.()?.isAdvancedMarkersAvailable,
        mapId: map.getMapId?.(),
        renderingType: map.getRenderingType?.()
      });
    }, 2000);
    
    return map;
  }

  

  async createAdvancedMarker(map, position, options = {}) {
    const google = await this.initialize();

    // Import the new marker library
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

    // Create custom HTML content for the marker
    const isSelected = options.isSelected || false;
    const markerContent = this.createMarkerContent(options.title, isSelected);

    console.log('🔍 Creating AdvancedMarker:', { position, options });
    console.log('🔍 Marker library imported:', { AdvancedMarkerElement, PinElement });
    console.log('🔍 Marker content created:', markerContent);

    // Create the AdvancedMarkerElement
    const marker = new AdvancedMarkerElement({
      map,
      position: center, // 加上這個才能顯示在地圖上
      content: markerContent,
      title: options.title,
      zIndex: isSelected ? 1000 : 10
    });

    console.log('✅ Marker created successfully:', marker);



    return marker;
  }

  createMarkerContent(title, isSelected = false) {
    const size = isSelected ? 40 : 32;
    const backgroundColor = isSelected ? '#ff4444' : '#007bff';
    const fontSize = isSelected ? '20px' : '16px';

    // Create the main marker circle
    const markerDiv = document.createElement('div');
    markerDiv.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background-color: ${backgroundColor};
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${fontSize};
      font-weight: bold;
      color: white;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    `;
    markerDiv.textContent = '🚴';
    markerDiv.title = title;

    return markerDiv;
  }
  

  async createInfoWindow(content, options = {}) {
    const google = await this.initialize();
    return new google.maps.InfoWindow({
      content,
      ...options
    });
  }

  async getDirections(origin, destination, travelMode = 'WALKING') {
    const google = await this.initialize();
    
    return new Promise((resolve, reject) => {
      this.directionsService.route({
        origin,
        destination,
        travelMode: google.maps.TravelMode[travelMode],
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: travelMode === 'BICYCLING',
        avoidTolls: true
      }, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  async displayDirections(map, directionsResult) {
    const google = await this.initialize();
    this.directionsRenderer.setMap(map);
    this.directionsRenderer.setDirections(directionsResult);
  }

  async findNearbyStations(center, radius = 500, stations = []) {
    const google = await this.initialize();
    
    // Calculate distances using Haversine formula
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
      .slice(0, 5); // Limit to 5 nearest stations

    return nearbyStations;
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

  getStreetViewUrl(lat, lng, options = {}) {
    const defaultOptions = {
      size: '300x200',
      fov: 90,
      heading: 0,
      pitch: 0,
      ...options
    };

    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      size: defaultOptions.size,
      fov: defaultOptions.fov,
      heading: defaultOptions.heading,
      pitch: defaultOptions.pitch,
      key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    });

    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
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
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }
}

export default new GoogleMapsService();
