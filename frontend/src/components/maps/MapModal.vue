<template>
  <div v-if="isVisible" class="map-modal-overlay" @click="closeModal">
    <div class="map-modal" @click.stop>
      <div class="modal-header">
        <div class="station-info">
          <h3>{{ station.sna }}</h3>
          <p class="station-address">{{ station.ar }}</p>
        </div>
        <div class="modal-actions">
          <FavoritesButton :station-id="station.sno" />
          <button @click="closeModal" class="close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="modal-content">
        <div class="map-section">
          <div ref="mapContainer" class="map-container"></div>
          <div v-if="mapLoading" class="map-loading">
            <div class="loading-spinner"></div>
            <p>載入地圖中...</p>
          </div>
          <div v-if="mapError" class="map-error">
            <div class="error-icon">⚠️</div>
            <h4>地圖載入失敗</h4>
            <p>{{ mapError }}</p>
            <button @click="retryMapLoad" class="retry-btn">重新載入</button>
          </div>
        </div>

        <div class="info-section">
          <div class="station-stats">
            <div class="stat-item">
              <div class="stat-number" :class="getAvailabilityClass(station.available_rent_bikes)">
                {{ station.available_rent_bikes }}
              </div>
              <div class="stat-label">可借車輛</div>
            </div>
            <div class="stat-item">
              <div class="stat-number" :class="getAvailabilityClass(station.available_return_bikes)">
                {{ station.available_return_bikes }}
              </div>
              <div class="stat-label">可停車位</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">{{ station.total }}</div>
              <div class="stat-label">總車位</div>
            </div>
          </div>

          <div class="action-buttons">
            <button @click="getDirections" class="action-btn directions-btn" :disabled="directionsLoading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 5L5 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ directionsLoading ? '載入中...' : '取得路線' }}
            </button>
            
            <button @click="toggleStreetView" class="action-btn streetview-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              街景檢視
            </button>

            <button @click="findNearbyStations" class="action-btn nearby-btn" :disabled="nearbyLoading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              </svg>
              {{ nearbyLoading ? '搜尋中...' : '附近站點' }}
            </button>
          </div>


          <div v-if="nearbyStations.length > 0" class="nearby-section">
            <h4>附近站點 ({{ nearbyStations.length }})</h4>
            <div class="nearby-list">
              <div 
                v-for="nearbyStation in nearbyStations" 
                :key="nearbyStation.sno"
                class="nearby-item"
                @click="handleNearbyStationClick(nearbyStation.sno)"
              >
                <div class="nearby-info">
                  <div class="nearby-name">{{ nearbyStation.sna }}</div>
                  <div class="nearby-distance">{{ Math.round(nearbyStation.distance) }}m</div>
                </div>
                <div class="nearby-stats">
                  <span class="nearby-bikes" :class="getAvailabilityClass(nearbyStation.available_rent_bikes)">
                    🚴 {{ nearbyStation.available_rent_bikes }}
                  </span>
                  <span class="nearby-slots" :class="getAvailabilityClass(nearbyStation.available_return_bikes)">
                    🅿️ {{ nearbyStation.available_return_bikes }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="directionsResult" class="directions-section">
            <h4>路線資訊</h4>
            <div class="directions-summary">
              <div class="directions-item">
                <strong>距離:</strong> {{ directionsResult.routes[0].legs[0].distance.text }}
              </div>
              <div class="directions-item">
                <strong>時間:</strong> {{ directionsResult.routes[0].legs[0].duration.text }}
              </div>
              <div class="directions-modes">
                <button 
                  v-for="mode in travelModes" 
                  :key="mode.value"
                  @click="changeTravelMode(mode.value)"
                  class="mode-btn"
                  :class="{ active: currentTravelMode === mode.value }"
                >
                  {{ mode.icon }} {{ mode.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import GoogleMapsService from '@/services/GoogleMapsService';
import LeafletMapService from '@/services/LeafletMapService';
import FavoritesButton from '@/components/FavoritesButton.vue';

const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  allStations: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'station-selected']);

// Refs
const mapContainer = ref(null);
const map = ref(null);
const marker = ref(null);
const allMarkers = ref([]); // Track all markers for proper cleanup
const allInfoWindows = ref([]); // Track all info windows for proper cleanup
const currentSelectedMarker = ref(null); // Track currently selected marker
const mapLoading = ref(false);
const mapError = ref('');
const directionsLoading = ref(false);
const nearbyLoading = ref(false);
const directionsResult = ref(null);
const nearbyStations = ref([]);
const streetViewUrl = ref('');
const currentTravelMode = ref('WALKING');
const userLocation = ref(null);
const usingFallbackMap = ref(false);

// Travel modes
const travelModes = [
  { value: 'WALKING', label: '步行', icon: '🚶' },
  { value: 'BICYCLING', label: '騎車', icon: '🚴' },
  { value: 'TRANSIT', label: '大眾運輸', icon: '🚌' },
  { value: 'DRIVING', label: '開車', icon: '🚗' }
];

// 計算站點位置
const stationPosition = computed(() => {
  // Use the correct property names from the backend model
  const lat = props.station.latitude || 0;
  const lng = props.station.longitude || 0;
  
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng)
  };
});

// Watch for visibility changes
watch(() => props.isVisible, async (newVal, oldVal) => {
  if (newVal) {
    await nextTick();
    await initializeMap();
    loadStreetView();
  } else {
    cleanup();
  }
}, { immediate: true });

// Watch for station changes
watch(() => props.station, async (newStation, oldStation) => {
  // If the modal is visible and station changed, update the map
  if (props.isVisible && newStation && oldStation && newStation.sno !== oldStation.sno) {
    await updateMapForNewStation();
  }
}, { immediate: true });

// Methods
async function initializeMap() {
  if (!mapContainer.value) return;

  // Add container debugging
  console.log('🔍 Map container:', mapContainer.value);
  console.log('🔍 Container dimensions:', {
    width: mapContainer.value.offsetWidth,
    height: mapContainer.value.offsetHeight
  });

  // Add small delay to ensure CSS is loaded
  await new Promise(resolve => setTimeout(resolve, 500));
  
  mapLoading.value = true;
  mapError.value = '';
  usingFallbackMap.value = false;
  
  try {
    // Try Google Maps first
    map.value = await GoogleMapsService.createMap(mapContainer.value, {
      center: stationPosition.value,
      zoom: 16
    });

    marker.value = await GoogleMapsService.createAdvancedMarker(
      map.value,
      stationPosition.value,
      {
        title: props.station.sna,
        isSelected: true
      }
    );

    //console.log('stationPosition.value', stationPosition.value);

    const infoWindow = await GoogleMapsService.createInfoWindow(
      `
      <div style="padding: 10px; max-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${props.station.sna}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d;">${props.station.ar}</p>
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span>🚴 ${props.station.available_rent_bikes}</span>
          <span>🅿️ ${props.station.available_return_bikes}</span>
        </div>
      </div>
    `,
      {
        pixelOffset: new google.maps.Size(0, -50), // Adjusted for AdvancedMarkerElement
        disableAutoPan: false
      }
    );

    // Track this marker and add click handler for selection
    allMarkers.value.push({
      marker: marker.value,
      stationSno: props.station.sno,
      infoWindow: infoWindow,
      type: 'google-advanced' // Add type tracking
    });

    
    // AdvancedMarkerElement uses different event handling
    marker.value.addEventListener('click', () => {
      setMarkerAsSelected(props.station.sno);
      infoWindow.open(map.value, marker.value);
    });

    // ✅ ADD THIS: Open info window immediately when marker is created
    // 按下站點後 小地圖立即顯示站點資訊
    infoWindow.open(map.value, marker.value);
    allInfoWindows.value.push(infoWindow);


    // Try to get user location
    try {
      userLocation.value = await GoogleMapsService.getCurrentLocation();
    } catch (error) {
      console.error('User location not available:', error);
    }

  } catch (error) {
    
    try {
      // Fallback to Leaflet/OpenStreetMap
      usingFallbackMap.value = true;
      
      map.value = await LeafletMapService.createMap(mapContainer.value, {
        center: [stationPosition.value.lat, stationPosition.value.lng],
        zoom: 16
      });

      marker.value = await LeafletMapService.createMarker(
        map.value,
        stationPosition.value,
        {
          title: props.station.sna,
          isSelected: true
        }
      );

    const infoWindow = await LeafletMapService.createInfoWindow(
      `
      <div style="padding: 10px; max-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${props.station.sna}</h4>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d;">${props.station.ar}</p>
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <span>🚴 ${props.station.available_rent_bikes}</span>
          <span>🅿️ ${props.station.available_return_bikes}</span>
        </div>
      </div>
    `,
      {
        offset: [0, -30]
      }
    );
      // ✅ ADD THIS: Open info window immediately when marker is created
      // 按下站點後 小地圖立即顯示站點資訊
      infoWindow.open(map.value, marker.value);
      allInfoWindows.value.push(infoWindow);

      // Track this marker (add after marker creation)
      allMarkers.value.push({
        marker: marker.value,
        stationSno: props.station.sno,
        infoWindow: infoWindow,
        type: 'leaflet' // Add type tracking
      });

      // ✅ ADD THIS: Event listener for the new marker
      marker.value.addEventListener('click', () => {
        setMarkerAsSelected(props.station.sno);
        infoWindow.open(map.value, marker.value);
      });


      // Try to get user location
      try {
        userLocation.value = await LeafletMapService.getCurrentLocation();
      } catch (locationError) {
        console.error('User location not available:', error);
      }

    } catch (fallbackError) {
      mapError.value = `地圖載入失敗: ${fallbackError.message}`;
    }
  } finally {
    mapLoading.value = false;
  }
}

async function retryMapLoad() {
  //console.log('🔄 Retrying map load...');
  await initializeMap();
}

function clearAllMarkers() {
  //console.log('🧹 Clearing all markers...');
  
  if (usingFallbackMap.value && map.value) {
    // Clear all Leaflet markers
    const layersToRemove = [];
    map.value.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layersToRemove.push(layer);
      }
    });
    layersToRemove.forEach(layer => map.value.removeLayer(layer));
  } else if (map.value) {
    // Clear all Google Maps markers
    if (marker.value) {
      marker.value.setMap(null);
    }
    
    // Clear any additional markers that might have been added
    allMarkers.value.forEach(markerData => {
      if (markerData && markerData.marker) {
        markerData.marker.map = null;
      }
    });
    
    // Also clear any markers that might be attached to the map directly
    if (map.value.markers) {
      map.value.markers.forEach(m => m.setMap(null));
      map.value.markers = [];
    }
  }
  
  allMarkers.value = [];
  marker.value = null;
  //console.log('✅ All markers cleared');
}

//更新地圖以顯示新站點
async function updateMapForNewStation() {
  if (!map.value) return;
  
  //console.log('🔄 Updating map for new station:', props.station.sna);
  //console.log('📍 New station position:', stationPosition.value);
  
  try {
    // Clear all existing markers first
    clearAllMarkers();
    
    if (usingFallbackMap.value) {
      // Update Leaflet map
      map.value.setView([stationPosition.value.lat, stationPosition.value.lng], 16);
      
      // Create new marker with highlighted style for current station
      marker.value = await LeafletMapService.createMarker(
        map.value,
        stationPosition.value,
        {
          title: props.station.sna,
          isSelected: true
        }
      );
      
      // Create new info window and open it immediately to show selection
      const infoWindow = await LeafletMapService.createInfoWindow(
        `
        <div style="padding: 10px; max-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #2c3e50; font-weight: bold;">📍 ${props.station.sna}</h4>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d;">${props.station.ar}</p>
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span>🚴 ${props.station.available_rent_bikes}</span>
            <span>🅿️ ${props.station.available_return_bikes}</span>
          </div>
        </div>
      `,
        {
          offset: [0, -30]
        }
      );
      
      infoWindow.open(map.value, marker.value);
      
    } else {
      // Update Google Maps
      map.value.setCenter(stationPosition.value);
      map.value.setZoom(16);
      
      // Create new marker with highlighted style for current station
      marker.value = await GoogleMapsService.createAdvancedMarker(
        map.value,
        stationPosition.value,
        {
          title: props.station.sna,
          isSelected: true
        }
      );
      
      // Create new info window and open it to show selection
      const infoWindow = await GoogleMapsService.createInfoWindow(
        `
        <div style="padding: 10px; max-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #2c3e50; font-weight: bold;">📍 ${props.station.sna}</h4>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d;">${props.station.ar}</p>
          <div style="display: flex; justify-content: space-between; font-size: 14px;">
            <span>🚴 ${props.station.available_rent_bikes}</span>
            <span>🅿️ ${props.station.available_return_bikes}</span>
          </div>
        </div>
      `,
        {
          pixelOffset: new google.maps.Size(0, -50),
          disableAutoPan: false
        }
      );

      // ✅ ADD: Event listener for the new marker
      marker.value.addEventListener('click', () => {
        setMarkerAsSelected(props.station.sno);
        infoWindow.open(map.value, marker.value);
      });
      
      // add click handler
      allMarkers.value.push({
        marker: marker.value,
        stationSno: props.station.sno,
        infoWindow: infoWindow,
        type: 'google-advanced'
      });

      // Open the info window to indicate selection
      infoWindow.open(map.value, marker.value);
      allInfoWindows.value.push(infoWindow);
    }
    
    // Clear previous data that's specific to the old station
    directionsResult.value = null;
    nearbyStations.value = [];
    
    // Load street view for new station
    loadStreetView();

    // Auto-find nearby stations for the new selected station
    await findNearbyStations();
    
    //console.log('✅ Map updated successfully for new station');
    
  } catch (error) {
    console.error('❌ Error updating map for new station:', error);
  }
}

function loadStreetView() {
  if (usingFallbackMap.value) {
    streetViewUrl.value = LeafletMapService.getStreetViewUrl(
      stationPosition.value.lat,
      stationPosition.value.lng
    );
  } else {
    streetViewUrl.value = GoogleMapsService.getStreetViewUrl(
      stationPosition.value.lat,
      stationPosition.value.lng,
      { size: '300x150' }
    );
  }
}

async function getDirections() {
  if (!userLocation.value) {
    try {
      userLocation.value = await GoogleMapsService.getCurrentLocation();
    } catch (error) {
      alert('無法取得您的位置，請確認已允許位置存取權限');
      return;
    }
  }

  directionsLoading.value = true;
  
  try {
    const result = await GoogleMapsService.getDirections(
      userLocation.value,
      stationPosition.value,
      currentTravelMode.value
    );
    
    directionsResult.value = result;
    await GoogleMapsService.displayDirections(map.value, result);
  } catch (error) {
    console.error('Error getting directions:', error);
    alert('無法取得路線資訊，請稍後再試');
  } finally {
    directionsLoading.value = false;
  }
}

async function changeTravelMode(mode) {
  currentTravelMode.value = mode;
  if (directionsResult.value && userLocation.value) {
    await getDirections();
  }
}

async function findNearbyStations() {
  nearbyLoading.value = true;
  
  try {
    const service = usingFallbackMap.value ? LeafletMapService : GoogleMapsService;
    const nearby = await service.findNearbyStations(
      stationPosition.value,
      500,
      props.allStations.filter(s => s.sno !== props.station.sno)
    );
    
    // Limit to max 5 closest stations
    nearbyStations.value = nearby.slice(0, 5);
    
    // Add markers for nearby stations on the map
    await addNearbyStationMarkers(nearbyStations.value);
    
  } catch (error) {
    console.error('Error finding nearby stations:', error);
  } finally {
    nearbyLoading.value = false;
  }
}

function closeAllInfoWindows() {
  //console.log('🔒 Closing all info windows...');
  
  if (usingFallbackMap.value) {
    // Close all Leaflet popups
    if (map.value && map.value.closePopup) {
      map.value.closePopup();
    }
  } else {
    // Close all Google Maps info windows
    allInfoWindows.value.forEach(infoWindow => {
      if (infoWindow && infoWindow.close) {
        try {
          infoWindow.close();
        } catch (error) {
          console.warn('Error closing info window:', error);
        }
      }
    });
    
    // Also close any info windows stored in marker data
    allMarkers.value.forEach(markerData => {
      if (markerData && markerData.infoWindow && markerData.infoWindow.close) {
        try {
          markerData.infoWindow.close();
        } catch (error) {
          console.warn('Error closing marker info window:', error);
        }
      }
    });
  }
  
  allInfoWindows.value = [];
  //console.log('✅ All info windows closed');
}

  function closeAllInfoWindowsExcept(excludeStationSno) {
    //console.log('🔒 Closing all info windows except for station:', excludeStationSno);

    if (usingFallbackMap.value) {
      // For Leaflet, we need to close popups manually for each marker except the excluded one
      allMarkers.value.forEach(markerData => {
        if (markerData && markerData.stationSno !== excludeStationSno && markerData.marker) {
          if (markerData.marker.getPopup && markerData.marker.getPopup()) {
            markerData.marker.closePopup();
          }
        }
      });
    } else {
      // Close Google Maps info windows except for the excluded station
      allInfoWindows.value.forEach(infoWindow => {
        if (infoWindow && infoWindow.close) {
          try {
            infoWindow.close();
          } catch (error) {
            console.warn('Error closing info window:', error);
          }
        }
      });

      // Also close info windows stored in marker data, except for excluded station
      allMarkers.value.forEach(markerData => {
        if (markerData && markerData.stationSno !== excludeStationSno &&
          markerData.infoWindow && markerData.infoWindow.close) {
          try {
            markerData.infoWindow.close();
          } catch (error) {
            console.warn('Error closing marker info window:', error);
          }
        }
      });
    }

    // Clear the tracking array but we'll rebuild it with the selected station's info window
    allInfoWindows.value = [];
    //console.log('✅ All info windows closed except selected station');
  }



function updateMarkerAppearance(targetStationSno, isSelected = false) {
    const targetMarkerData = allMarkers.value.find(markerData =>
      markerData && markerData.stationSno === targetStationSno
    );

    if (targetMarkerData && targetMarkerData.marker) {
      try {
        if (usingFallbackMap.value) {
          // Update Leaflet marker appearance
          const station = props.allStations.find(s => s.sno === targetStationSno) || props.station;
          const iconColor = isSelected ? '#ff4444' : '#007bff';
          const size = isSelected ? 40 : 32;
          const fontSize = isSelected ? 20 : 16;

          const updatedIcon = L.divIcon({
            className: 'bike-station-marker',
            html: `
            <div style="
              background: ${iconColor};
              border: 2px solid white;
              border-radius: 50%;
              width: ${size}px;
              height: ${size}px;
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

          targetMarkerData.marker.setIcon(updatedIcon);
          targetMarkerData.marker.setZIndexOffset(isSelected ? 1000 : 1);

        } else {
          // Update Google Maps AdvancedMarkerElement appearance
          const station = props.allStations.find(s => s.sno === targetStationSno) || props.station;
          const updatedContent = GoogleMapsService.createMarkerContent(station.sna, isSelected);

          // Update the marker's content and z-index
          targetMarkerData.marker.content = updatedContent;
          targetMarkerData.marker.zIndex = isSelected ? 1000 : 1;
        }
      } catch (error) {
        console.error('Error updating marker appearance:', error);
      }
    }
  }



  function setMarkerAsSelected(targetStationSno) {
    //console.log('🎯 Setting marker as selected for station:', targetStationSno);

    // Close all info windows
    //closeAllInfoWindows();

    // Reset ALL markers to normal state first
    allMarkers.value.forEach(markerData => {
      if (markerData && markerData.marker) {
        if (markerData.type === 'google-advanced') {
          // Reset Google Maps AdvancedMarkerElement
          const station = props.allStations.find(s => s.sno === markerData.stationSno) || props.station;
          const normalContent = GoogleMapsService.createMarkerContent(station.sna, false);
          markerData.marker.content = normalContent;
          markerData.marker.zIndex = 1;
        } else if (markerData.type === 'leaflet') {
          // Reset Leaflet marker
          const normalIcon = L.divIcon({
            className: 'bike-station-marker',
            html: `
            <div style="
              width: 32px;
              height: 32px;
              background: #007bff;
              border: 2px solid white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 16px;
              font-weight: bold;
              color: white;
              cursor: pointer;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              transition: all 0.2s ease;
            ">🚴</div>
          `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          markerData.marker.setIcon(normalIcon);
          markerData.marker.setZIndexOffset(1);
        }
      }
    });
    
    // Reset ALL markers to normal state first
    allMarkers.value.forEach(markerData => {
      if (markerData && markerData.marker && markerData.stationSno !== targetStationSno) {
        if (markerData.type === 'google-advanced') {
          // Reset Google Maps AdvancedMarkerElement
          const station = props.allStations.find(s => s.sno === markerData.stationSno) || props.station;
          const normalContent = GoogleMapsService.createMarkerContent(station.sna, false);
          markerData.marker.content = normalContent;
          markerData.marker.zIndex = 1;
        } else if (markerData.type === 'leaflet') {
          // Reset Leaflet marker
          const normalIcon = L.divIcon({
            className: 'bike-station-marker',
            html: `
          <div style="
            width: 32px;
            height: 32px;
            background: #007bff;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            color: white;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
          ">🚴</div>
        `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          markerData.marker.setIcon(normalIcon);
          markerData.marker.setZIndexOffset(1);
        }
      }
    });

    // Find and highlight the target marker
    const targetMarkerData = allMarkers.value.find(markerData =>
      markerData && markerData.stationSno === targetStationSno
    );

    if (targetMarkerData && targetMarkerData.marker) {
      if (targetMarkerData.type === 'google-advanced') {
        // Update Google Maps AdvancedMarkerElement to selected state
        const station = props.allStations.find(s => s.sno === targetStationSno) || props.station;
        const selectedContent = GoogleMapsService.createMarkerContent(station.sna, true);
        targetMarkerData.marker.content = selectedContent;
        targetMarkerData.marker.zIndex = 1000;
      } else if (targetMarkerData.type === 'leaflet') {
        // Update Leaflet marker to selected state
        const selectedIcon = L.divIcon({
          className: 'bike-station-marker',
          html: `
        <div style="
          width: 40px;
          height: 40px;
          background: #ff4444;
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          color: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        ">🚴</div>
      `,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
        targetMarkerData.marker.setIcon(selectedIcon);
        targetMarkerData.marker.setZIndexOffset(1000);
      }

      //console.log('✅ Marker set as selected');
    } 
  }


async function addNearbyStationMarkers(nearbyStations) {
  if (!map.value || nearbyStations.length === 0) return;
  
  //console.log('📍 Adding markers for nearby stations:', nearbyStations.length);
  
  // Clear only nearby markers, preserve main station marker
const mainStationSno = props.station.sno;
const markersToRemove = allMarkers.value.filter(markerData => 
  markerData.stationSno !== mainStationSno
);

// Remove nearby markers from map
markersToRemove.forEach(markerData => {
  if (markerData && markerData.marker) {
    if (usingFallbackMap.value) {
      map.value.removeLayer(markerData.marker);
    } else {
      markerData.marker.map = null;
    }
  }
});

// Keep only the main station marker in tracking
allMarkers.value = allMarkers.value.filter(markerData => 
  markerData.stationSno === mainStationSno
);

  
  for (const station of nearbyStations) {
    try {
      const position = {
        lat: parseFloat(station.latitude),
        lng: parseFloat(station.longitude)
      };
      
      if (usingFallbackMap.value) {
        // Add Leaflet marker for nearby station
        const nearbyMarker = await LeafletMapService.createMarker(
          map.value,
          position,
          {
            title: station.sna,
            isSelected: true
          }
        );
        
        // Create info window
        const infoWindow = await LeafletMapService.createInfoWindow(
          `
          <div style="padding: 10px; max-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${station.sna}</h4>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d;">${station.ar}</p>
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
              <span>🚴 ${station.available_rent_bikes}</span>
              <span>🅿️ ${station.available_return_bikes}</span>
            </div>
          </div>
        `,
          {
            offset: [0, -30]
          }
        );
        
        // Track this marker
        allMarkers.value.push({
          marker: nearbyMarker,
          stationSno: station.sno,
          infoWindow: infoWindow,
          type: 'leaflet' // Add type tracking
        });
        
        // Add click handler to select this station
        nearbyMarker.on('click', () => {
          handleNearbyStationClick(station.sno);
        });
        
      } else {
        // Add Google Maps marker for nearby station
        const nearbyMarker = await GoogleMapsService.createAdvancedMarker(
          map.value,
          position,
          {
            title: station.sna,
            isSelected: false
          }
        );
        //console.log('QQQ:Position-----> ',position);

        // Create info window
        const infoWindow = await GoogleMapsService.createInfoWindow(
          `
          <div style="padding: 10px; max-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #2c3e50;">${station.sna}</h4>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6c757d;">${station.ar}</p>
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
              <span>🚴 ${station.available_rent_bikes}</span>
              <span>🅿️ ${station.available_return_bikes}</span>
            </div>
          </div>
        `,
          {
            pixelOffset: new google.maps.Size(0, -50), // Adjusted for AdvancedMarkerElement
            disableAutoPan: false
          }
        );
        
        // Track this marker
        allMarkers.value.push({
          marker: nearbyMarker,
          stationSno: station.sno,
          infoWindow: infoWindow,
          type: 'google-advanced' // Add type tracking
        });
        
        // Add click handler to select this station
        nearbyMarker.addEventListener('click', () => {
          handleNearbyStationClick(station.sno);
        });
      }
      
    } catch (error) {
      console.error('Error adding marker for station:', station.sna, error);
    }
  }
  
  // Set the current station as selected
  setMarkerAsSelected(props.station.sno);
  
  //console.log('✅ Added markers for all nearby stations');
}

async function handleNearbyStationClick(stationSno) {
  //console.log('🎯 Nearby station clicked:', stationSno);
  
  // Find the clicked station data
  const clickedStation = nearbyStations.value.find(station => station.sno === stationSno) || 
                        props.allStations.find(station => station.sno === stationSno);
  if (!clickedStation) {
    console.error('❌ Station not found:', stationSno);
    return;
  }

  // Close info windows for non-selected markers only
  closeAllInfoWindowsExcept(stationSno);
  
  // Wait a moment for cleanup
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Set the clicked marker as selected and show its info window
  setMarkerAsSelected(stationSno);
  
  // Wait for marker selection to complete
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Find and open the info window for the selected marker
  const targetMarkerData = allMarkers.value.find(markerData =>
    markerData && markerData.stationSno === stationSno
  );
  
  if (targetMarkerData && targetMarkerData.infoWindow) {
    //console.log('✅ Opening info window for selected station');
    targetMarkerData.infoWindow.open(map.value, targetMarkerData.marker);
    allInfoWindows.value.push(targetMarkerData.infoWindow);
  }
  
  // Clear nearby stations list after a delay to allow user to see the selection
  //setTimeout(() => {
  //  nearbyStations.value = [];
  //}, 1000);

  // Update nearby stations for the new selected station instead of clearing
  const newCenter = {
    lat: parseFloat(clickedStation.latitude),
    lng: parseFloat(clickedStation.longitude)
  };

  try {
    const service = usingFallbackMap.value ? LeafletMapService : GoogleMapsService;
    const nearby = await service.findNearbyStations(
      newCenter,
      500,
      props.allStations.filter(s => s.sno !== stationSno)
    );

    // Update nearby stations list (keep it visible)
    nearbyStations.value = nearby.slice(0, 5);

    // Add markers for the new nearby stations
    await addNearbyStationMarkers(nearbyStations.value);

  } catch (error) {
    console.error('Error updating nearby stations:', error);
  }
  
  // Emit station selection to parent
  emit('station-selected', stationSno);
}

function toggleStreetView() {
  if (streetViewUrl.value) {
    openFullStreetView();
  } else {
    loadStreetView();
  }
}

function openFullStreetView() {
  const lat = stationPosition.value.lat;
  const lng = stationPosition.value.lng;
  //console.log('🔍 Opening street view for coordinates:', { lat, lng });
  
  // Use the correct Google Maps Street View URL format
  const url = `https://www.google.com/maps/@${lat},${lng},3a,75y,90t/data=!3m6!1e1!3m4!1s0x0:0x0!2e0!7i13312!8i6656`;
  //console.log('🔗 Street view URL:', url);
  window.open(url, '_blank');
}

function getAvailabilityClass(count) {
  if (count === 0) return 'availability-none';
  if (count <= 4) return 'availability-low';
  return 'availability-good';
}

function closeModal() {
  emit('close');
}

function cleanup() {
  directionsResult.value = null;
  nearbyStations.value = [];
  streetViewUrl.value = '';
  map.value = null;
  marker.value = null;
}

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>

/* Fix for AdvancedMarkerElement visibility */
:deep(gmp-advanced-marker) {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
  position: relative !important;
}

/* Ensure marker content is visible */
:deep(gmp-advanced-marker div) {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 1 !important;
}

/* Force marker content to be above map */
:deep(.map-container gmp-advanced-marker) {
  z-index: 1000 !important;
}

/* Ensure marker content has proper dimensions */
:deep(gmp-advanced-marker div[style*="width"]) {
  min-width: 32px !important;
  min-height: 32px !important;
}


.map-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.map-modal {
  background: white;
  border-radius: 12px;
  max-width: 900px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.station-info h3 {
  margin: 0 0 5px 0;
  color: #2c3e50;
  font-size: 18px;
}

.station-address {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  color: #6c757d;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #2c3e50;
}

.modal-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  min-height: 500px;
  max-height: 85vh;
}

.map-section {
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e9ecef;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 15px;
  padding: 20px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
}

.map-error h4 {
  margin: 0;
  color: #dc3545;
  font-size: 18px;
}

.map-error p {
  margin: 0;
  color: #6c757d;
  font-size: 14px;
  max-width: 300px;
  line-height: 1.4;
}

.retry-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: #0056b3;
}

.info-section {
  padding: 20px;
  overflow-y: auto;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.station-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 5px;
  padding: 5px 10px;
  border-radius: 4px;
}

.stat-label {
  font-size: 12px;
  color: #6c757d;
}

.availability-good {
  background: #d4edda;
  color: #155724;
}

.availability-low {
  background: #fff3cd;
  color: #856404;
}

.availability-none {
  background: #f8d7da;
  color: #721c24;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  background: white;
  color: #495057;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-btn:hover:not(:disabled) {
  background: #007bff;
  color: white;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.street-view-section,
.nearby-section,
.directions-section {
  margin-bottom: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nearby-section {
  max-height: 300px;
  overflow-y: auto;
}

.street-view-section h4,
.nearby-section h4,
.directions-section h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.street-view-container {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
}

.street-view-image {
  width: 100%;
  height: auto;
  display: block;
}

.street-view-overlay {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(0, 0, 0, 0.8);
  border: none;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
  z-index: 10;
}

.street-view-overlay:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.nearby-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nearby-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.nearby-item:hover {
  background: #e9ecef;
}

.nearby-name {
  font-weight: 500;
  font-size: 13px;
  color: #2c3e50;
}

.nearby-distance {
  font-size: 12px;
  color: #6c757d;
}

.nearby-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.nearby-bikes,
.nearby-slots {
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
}

.directions-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.directions-item {
  font-size: 13px;
  color: #495057;
}

.directions-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.mode-btn {
  padding: 5px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.mode-btn:hover {
  background: #f8f9fa;
}

.mode-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .map-modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    grid-template-columns: 1fr;
    height: auto;
  }
  
  .map-section {
    height: 300px;
  }
  
  .info-section {
    max-height: 400px;
  }
  
  .station-stats {
    flex-direction: column;
    gap: 10px;
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .stat-number {
    font-size: 16px;
  }
}
</style>
