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

  // 地圖初始化
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

  //建立地圖
  async createMap(container, options = {}) {
    const google = await this.initialize();
    const defaultOptions = {
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: true,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      ...options
    };
    
    const map = new google.maps.Map(container, defaultOptions);
    //console.log('✅ Google Maps created successfully');
    
    return map;
  }

  // 建立地圖標記
  async createStandardMarker(map, position, options = {}) {
    const google = await this.initialize();
    //console.log('🔍 Creating enhanced standard marker with position:', position);
    
    // Ensure position is in the correct format
    let markerPosition;
    if (position instanceof google.maps.LatLng) {
      markerPosition = position;
    } else if (typeof position === 'object' && 'lat' in position && 'lng' in position) {
      markerPosition = new google.maps.LatLng(position.lat, position.lng);
    } else {
      console.error('❌ Invalid position format:', position);
      throw new Error('Invalid position format for marker');
    }

    const isSelected = options.isSelected || false;
    const availableBikes = options.availableBikes || 0;
    const distance = options.distance;
    
    // 調整被選中跟鄰近的站點 Marker icon 大小跟顏色
    const size = isSelected ? 46 : 38;
    let backgroundColor, borderColor;
    
    if (isSelected) {
      backgroundColor = '#ff4444';
      borderColor = '#ffffff';
    } else {
      backgroundColor = '#007bff';
      if (availableBikes === 0) {
        borderColor = '#dc3545'; // Red border for no bikes
      } else if (availableBikes <= 4) {
        borderColor = '#ffc107'; // Orange border for low bikes
      } else {
        borderColor = '#28a745'; // Green border for good availability
      }
    }
    
    // 設定SVG繪製標記圖示，包含自行車符號和距離
    const svgIcon = `
      <svg width="${size}" height="${size + (isSelected ? 20 : 0)}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
        </defs>
        
        <!-- Main circle -->
        <circle cx="${size/2}" cy="${size/2}" r="${(size-6)/2}" 
                fill="${backgroundColor}" 
                stroke="${borderColor}" 
                stroke-width="${isSelected ? 3 : 2}" 
                filter="url(#shadow)"/>
        
        <!-- Bike icon -->
        <text x="${size/2}" y="${size/2 + 6}" 
              text-anchor="middle" 
              font-size="${isSelected ? 20 : 16}" 
              fill="white" 
              font-weight="bold">🚴</text>
        
        ${!isSelected && distance !== undefined ? `
          <!-- Distance badge -->
          <circle cx="${size - 10}" cy="${size - 10}" r="8" fill="white" stroke="#dee2e6"/>
          <text x="${size - 10}" y="${size - 6}" 
                text-anchor="middle" 
                font-size="8" 
                fill="#2c3e50" 
                font-weight="bold">${distance < 1000 ? Math.round(distance) + 'm' : (distance/1000).toFixed(1) + 'k'}</text>
        ` : ''}
        
        ${isSelected ? `
          <!-- Station name label -->
          <rect x="2" y="${size + 2}" width="${size - 4}" height="16" 
                rx="4" fill="rgba(0,0,0,0.8)"/>
          <text x="${size/2}" y="${size + 12}" 
                text-anchor="middle" 
                font-size="10" 
                fill="white" 
                font-weight="500">${options.title ? options.title.substring(0, 8) + (options.title.length > 8 ? '...' : '') : ''}</text>
        ` : ''}
      </svg>
    `;

    // 初始化Marker icon
    const marker = new google.maps.Marker({
      position: markerPosition,
      map: map,
      title: options.title,
      zIndex: isSelected ? 1000 : 100,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgIcon),
        scaledSize: new google.maps.Size(size, size + (isSelected ? 20 : 0)),
        anchor: new google.maps.Point(size/2, size/2)
      }
    });

    return marker;
  }

  createMarkerContent(title, isSelected = false, options = {}) {
    const size = isSelected ? 46 : 38;
    const distance = options.distance;
    const availableBikes = options.availableBikes || 0;
    
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    `;

    // Create the main marker circle with enhanced styling
    const markerDiv = document.createElement('div');
    
    if (isSelected) {
      // 被選中的站點樣式 Focused station styling
      markerDiv.style.cssText = `
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
      `;
    } else {
      // 鄰近站點樣式並標示可用數量顏色
      let borderColor = '#ffffff';
      if (availableBikes === 0) {
        borderColor = '#dc3545'; // Red for no bikes
      } else if (availableBikes <= 4) {
        borderColor = '#ffc107'; // Orange for low bikes
      } else {
        borderColor = '#28a745'; // Green for good availability
      }
      
      markerDiv.style.cssText = `
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
      `;
      
      // Add hover effect
      markerDiv.addEventListener('mouseenter', () => {
        markerDiv.style.transform = 'scale(1.1)';
        markerDiv.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.5)';
      });
      
      markerDiv.addEventListener('mouseleave', () => {
        markerDiv.style.transform = 'scale(1)';
        markerDiv.style.boxShadow = '0 3px 8px rgba(0, 123, 255, 0.3)';
      });
    }
    
    markerDiv.textContent = '🚴';
    markerDiv.title = title;
    container.appendChild(markerDiv);

    // 標示鄰近站點距離樣式
    if (!isSelected && distance !== undefined) {
      const distanceBadge = document.createElement('div');
      const distanceText = distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`;
      
      distanceBadge.style.cssText = `
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
      `;
      distanceBadge.textContent = distanceText;
      container.appendChild(distanceBadge);
    }

    // Add station name label for focused station
    if (isSelected) {
      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = `
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
      `;
      //nameLabel.textContent = title;
      
      //刪除站名前綴字
      nameLabel.textContent = title.replace(/^YouBike2\.0_/, '');
      container.appendChild(nameLabel);
    }

    // Add CSS animations
    if (!document.getElementById('marker-animations')) {
      const style = document.createElement('style');
      style.id = 'marker-animations';
      style.textContent = `
        @keyframes focusedPulse {
          0% { box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4); }
          50% { box-shadow: 0 4px 20px rgba(255, 68, 68, 0.6); }
          100% { box-shadow: 0 4px 12px rgba(255, 68, 68, 0.4); }
        }
      `;
      document.head.appendChild(style);
    }

    return container;
  }
  

  async createInfoWindow(content, options = {}) {
    const google = await this.initialize();
    
    try {
      console.log('🔍 Creating info window with content length:', content.length);
      
      const infoWindow = new google.maps.InfoWindow({
        content,
        ...options,
        disableAutoPan: options.disableAutoPan !== undefined ? options.disableAutoPan : false
      });
      
      console.log('✅ Info window created successfully');
      return infoWindow;
    } catch (error) {
      console.error('❌ Error creating info window:', error);
      throw error;
    }
  }
  
  // Helper method to open an info window with retry logic
  async openInfoWindow(infoWindow, marker, map) {
    if (!infoWindow || !map) {
      console.error('❌ Cannot open info window: missing infoWindow or map');
      return false;
    }
    
    try {
      console.log('🔍 Opening info window...');
      
      // First attempt
      infoWindow.open({
        map: map,
        anchor: marker,
        shouldFocus: false
      });
      
      // Wait a moment and check if it's visible
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Second attempt with different approach if needed
      infoWindow.open(map, marker);
      
      console.log('✅ Info window opened successfully');
      return true;
    } catch (error) {
      console.error('❌ Error opening info window:', error);
      return false;
    }
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

  async createStreetViewPanorama(container, position, options = {}) {
    const google = await this.initialize();
    
    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    loadingDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 10px; font-family: Arial, sans-serif;">Loading Street View...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    // Clear any existing panorama in the container
    if (container) {
      container.innerHTML = '';
      container.appendChild(loadingDiv);
    }
    
    // Force container to be visible with explicit dimensions
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.minHeight = '400px';
    
    // Force a reflow
    void container.offsetHeight;
    
    const defaultOptions = {
      position,
      pov: { heading: 0, pitch: 0 },
      zoom: 1,
      addressControl: false,
      fullscreenControl: true,
      // Force desktop-like experience on all devices
      motionTracking: false,
      motionTrackingControl: false,
      showRoadLabels: true,
      linksControl: true,
      panControl: true,
      zoomControl: true,
      visible: true,
      enableCloseButton: true,
      ...options
    };
    
    // Create the panorama
    const panorama = new google.maps.StreetViewPanorama(container, defaultOptions);
    
    // Add event listeners for loading and errors
    google.maps.event.addListenerOnce(panorama, 'status_changed', () => {
      const status = panorama.getStatus();
      console.log('🔍 Street View status:', status);
      
      if (status !== google.maps.StreetViewStatus.OK) {
        console.error('❌ Street View not available at this location');
      }
      
      // Remove loading indicator after a delay
      setTimeout(() => {
        try {
          container.removeChild(loadingDiv);
        } catch (e) {
          console.warn('Could not remove loading indicator:', e);
        }
      }, 500);
    });
    
    // Add event listener for when the user exits Street View
    google.maps.event.addListener(panorama, 'visible_changed', () => {
      console.log('🔍 Street View visibility changed:', panorama.getVisible());
    });
    
    // Add event listener for pano_changed to ensure it's loaded
    google.maps.event.addListenerOnce(panorama, 'pano_changed', () => {
      console.log('✅ Street View panorama loaded successfully');
    });
    
    return panorama;
  }
  
  // Method to completely recreate a map instance with enhanced loading
  async recreateMap(container, options = {}, markers = []) {
    console.log('🔄 Recreating map instance...');
    
    if (!container) {
      throw new Error('Container element is required to recreate map');
    }
    
    // Clear the container
    container.innerHTML = '';
    
    // Force a reflow
    void container.offsetHeight;
    
    // Add a loading indicator to the container
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    loadingDiv.innerHTML = `
      <div style="text-align: center;">
        <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 10px; font-family: Arial, sans-serif;">Loading map...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    container.appendChild(loadingDiv);
    
    // Force another reflow
    void container.offsetHeight;
    
    // Create a new map instance with WebGL forcing options
    const mapOptions = {
      ...options,
      // Force WebGL rendering
      mapTypeControl: true,
      mapTypeControlOptions: {
        mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain'],
        style: 2 // DROPDOWN_MENU
      },
      // Force hardware acceleration
      gestureHandling: 'greedy',
      // Ensure tiles load
      tilt: 0,
      heading: 0
    };
    
    // Create the map
    const map = await this.createMap(container, mapOptions);
    
    // Force map to render completely by triggering multiple events
    const google = await this.initialize();
    
    // Trigger initial resize
    google.maps.event.trigger(map, 'resize');
    
    // Force map to load tiles by slightly changing zoom levels
    const currentZoom = map.getZoom();
    map.setZoom(currentZoom - 1);
    await new Promise(resolve => setTimeout(resolve, 100));
    map.setZoom(currentZoom);
    
    // Force tiles to load by panning slightly
    const center = map.getCenter();
    const lat = center.lat();
    const lng = center.lng();
    map.panTo({lat: lat + 0.0001, lng: lng + 0.0001});
    await new Promise(resolve => setTimeout(resolve, 100));
    map.panTo({lat, lng});
    
    // Add markers back to the map
    for (const markerInfo of markers) {
      if (markerInfo && markerInfo.position) {
        const marker = await this.createStandardMarker(
          map,
          markerInfo.position,
          {
            title: markerInfo.title || '',
            isSelected: markerInfo.isSelected || false
          }
        );
        
        if (markerInfo.onClick && typeof markerInfo.onClick === 'function') {
          marker.addEventListener('click', markerInfo.onClick);
        }
      }
    }
    
    // Wait for map to be fully rendered before removing loading indicator
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Remove loading indicator
    try {
      container.removeChild(loadingDiv);
    } catch (e) {
      console.warn('Could not remove loading indicator:', e);
    }
    
    // Final resize trigger
    google.maps.event.trigger(map, 'resize');
    
    console.log('✅ Map recreated successfully');
    return map;
  }
  
  // Method to force a map refresh with enhanced tile loading
  async forceMapRefresh(map, container) {
    if (!map || !container) {
      throw new Error('Map and container are required for refresh');
    }
    
    console.log('🔄 Forcing map refresh...');
    
    try {
      // Store current state
      const center = map.getCenter();
      const zoom = map.getZoom();
      const mapTypeId = map.getMapTypeId();
      
      // Add a temporary loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        pointer-events: none;
      `;
      loadingDiv.innerHTML = `
        <div style="text-align: center;">
          <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 10px; font-family: Arial, sans-serif;">Refreshing map...</p>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      container.appendChild(loadingDiv);
      
      // Force container refresh with multiple techniques
      
      // 1. Hide and show container
      const originalDisplay = container.style.display;
      container.style.display = 'none';
      void container.offsetHeight;
      container.style.display = originalDisplay || 'block';
      void container.offsetHeight;
      
      // 2. Force WebGL context refresh by changing map type
      const alternateMapType = mapTypeId === 'roadmap' ? 'satellite' : 'roadmap';
      map.setMapTypeId(alternateMapType);
      await new Promise(resolve => setTimeout(resolve, 300));
      map.setMapTypeId(mapTypeId);
      
      // 3. Trigger multiple resize events
      this.google.maps.event.trigger(map, 'resize');
      await new Promise(resolve => setTimeout(resolve, 200));
      this.google.maps.event.trigger(map, 'resize');
      
      // 4. Force tile loading by changing zoom levels
      map.setZoom(zoom - 1);
      await new Promise(resolve => setTimeout(resolve, 200));
      map.setZoom(zoom);
      
      // 5. Force tile loading by panning slightly
      const lat = center.lat();
      const lng = center.lng();
      map.panTo({lat: lat + 0.0002, lng: lng + 0.0002});
      await new Promise(resolve => setTimeout(resolve, 200));
      map.panTo({lat, lng});
      
      // 6. Final resize trigger
      this.google.maps.event.trigger(map, 'resize');
      
      // Wait for map to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove loading indicator
      try {
        container.removeChild(loadingDiv);
      } catch (e) {
        console.warn('Could not remove loading indicator:', e);
      }
      
      console.log('✅ Map refresh forced successfully');
      return true;
    } catch (error) {
      console.error('❌ Error forcing map refresh:', error);
      return false;
    }
  }
}

export default new GoogleMapsService();
