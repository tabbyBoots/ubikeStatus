<template>
  <div v-if="isVisible" class="map-modal-overlay" @click="closeModal">
    <div class="map-modal" @click.stop>
      <div class="modal-header">
        <div class="station-info">
          <h3>{{ formatStationName(station.sna) }}</h3>
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
          <!-- Regular Map -->
          <div v-if="!showStreetView" ref="mapContainer" class="map-container"></div>
          
          <!-- Street View Panorama -->
          <div v-if="showStreetView" ref="streetViewContainer" class="street-view-container"></div>
          
          <div v-if="mapLoading" class="map-loading">
            <div class="loading-spinner"></div>
            <p>{{ showStreetView ? '載入街景中...' : '載入地圖中...' }}</p>
          </div>
          <div v-if="mapError" class="map-error">
            <div class="error-icon">⚠️</div>
            <h4>{{ showStreetView ? '街景載入失敗' : '地圖載入失敗' }}</h4>
            <p>{{ mapError }}</p>
            <button @click="retryMapLoad" class="retry-btn">重新載入</button>
          </div>
        </div>

        <div class="info-section">
          

          <div class="action-buttons">
            <button @click="getDirections" class="action-btn directions-btn" :disabled="directionsLoading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M12 5L5 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ directionsLoading ? '載入中...' : '取得路線' }}
            </button>
            
            <button @click="toggleStreetView" class="action-btn streetview-btn" :class="{ active: showStreetView }">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 6V12L16 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              {{ showStreetView ? '返回地圖' : '街景檢視' }}
            </button>

            <button @click="findNearbyStations(true)" class="action-btn nearby-btn" :disabled="nearbyLoading">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              </svg>
              {{ nearbyLoading ? '搜尋中...' : '附近站點' }}
            </button>
          </div>

          <div v-if="nearbyStations.length > 0" class="nearby-section" ref="nearbySectionRef">
            <h4>附近站點 ({{ nearbyStations.length }})</h4>
            <div class="nearby-list">
              <div 
                v-for="nearbyStation in nearbyStations" 
                :key="nearbyStation.sno"
                class="nearby-item"
                @click="handleNearbyStationClick(nearbyStation.sno)"
              >
                <div class="nearby-info">
                  <div class="nearby-name">{{ formatStationName(nearbyStation.sna) }}</div>
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
import { ref, computed, watch, nextTick, onUnmounted, createApp } from 'vue';
import GoogleMapsService from '@/services/GoogleMapsService';
import LeafletMapService from '@/services/LeafletMapService';
import FavoritesButton from '@/components/FavoritesButton.vue';
import InfoWindowContent from './InfoWindowContent.vue';

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
const streetViewContainer = ref(null);
const map = ref(null);
const marker = ref(null);
const allMarkers = ref([]);
const allInfoWindows = ref([]);
const markerRegistry = ref(new Map()); // Track markers by station ID
const focusedStationId = ref(null); // Track currently focused station
const mapLoading = ref(false);
const mapError = ref('');
const directionsLoading = ref(false);
const nearbyLoading = ref(false);
const directionsResult = ref(null);
const nearbyStations = ref([]);
const nearbySectionRef = ref(null); // Ref for the nearby stations section
const streetViewPanorama = ref(null);
const showStreetView = ref(false);
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
  const lat = props.station.latitude || 0;
  const lng = props.station.longitude || 0;
  
  return {
    lat: parseFloat(lat),
    lng: parseFloat(lng)
  };
});

// Watch for visibility changes
watch(() => props.isVisible, async (newVal) => {
  if (newVal) {
    await nextTick();
    
    // Add a loop to wait for mapContainer.value to be a valid HTMLElement
    let attempts = 0;
    const maxAttempts = 10; // Try for up to 1 second (10 * 100ms)
    const delay = 100; // ms
    while (!mapContainer.value || !(mapContainer.value instanceof HTMLElement) && attempts < maxAttempts) {
      console.log(`Waiting for mapContainer.value... Attempt ${attempts + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempts++;
    }

    if (!mapContainer.value || !(mapContainer.value instanceof HTMLElement)) {
      console.error('❌ Map container not available after multiple attempts.');
      mapError.value = '地圖容器未準備好，無法顯示地圖。';
      return;
    }

    await initializeMap();
  } else {
    cleanup();
  }
}, { immediate: true });

// Watch for station changes: Full teardown and rebuild for reliability
watch(() => props.station, async (newStation, oldStation) => {
  if (props.isVisible && newStation && oldStation && newStation.sno !== oldStation.sno) {
    console.log('Station changed, performing full map re-initialization.');
    cleanup();
    await nextTick(); // Wait for DOM to update after cleanup
    await initializeMap();
    
    // After map is ready, find nearby stations for the new location
    await findNearbyStations(false);
  }
}, { immediate: true });

// Watch for showStreetView changes to handle native exit button
watch(showStreetView, async (newVal) => {
  if (!newVal) {
    // Switching back to map view
    if (streetViewPanorama.value) {
      streetViewPanorama.value = null;
    }
    mapError.value = '';
    await nextTick();
    await initializeMap();
    await findNearbyStations();
  }
});

// Simplified map initialization with Docker compatibility
async function initializeMap() {
  if (!mapContainer.value) {
    console.error('❌ Map container not found');
    return;
  }

  console.log('🔄 Initializing map for station:', props.station.sna);
  //console.log('📍 Station position:', stationPosition.value);

  mapLoading.value = true;
  mapError.value = '';
  usingFallbackMap.value = false;

  try {
    // Clear any existing content
    mapContainer.value.innerHTML = '';
    
    // Ensure container has proper dimensions and is in DOM
    mapContainer.value.style.width = '100%';
    mapContainer.value.style.height = '100%';
    mapContainer.value.style.minHeight = '400px';
    mapContainer.value.style.display = 'block';
    mapContainer.value.style.visibility = 'visible';
    mapContainer.value.style.position = 'relative';
    
    // Force DOM reflow to ensure container is ready
    void mapContainer.value.offsetHeight;
    
    // Add a small delay to ensure DOM is fully ready (helps with Docker environments)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try Google Maps first with simplified approach
    const google = await GoogleMapsService.initialize();
    
    // Create map with basic options
    map.value = new google.maps.Map(mapContainer.value, {
      center: stationPosition.value,
      zoom: 16,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      streetViewControl: true,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true
    });

    // Create enhanced standard marker
    marker.value = await GoogleMapsService.createStandardMarker(
      map.value,
      stationPosition.value,
      {
        title: props.station.sna,
        isSelected: true,
        availableBikes: props.station.available_rent_bikes
      }
    );

    // Create info window
    const infoWindowContentDiv = document.createElement('div');
    infoWindowContentDiv.id = 'google-maps-info-window-content'; // Assign an ID for consistency, though not strictly needed for direct mounting
    const infoWindow = new google.maps.InfoWindow({
      content: infoWindowContentDiv
    });

    // Add click listener to marker
    marker.value.addListener('click', () => {
      infoWindow.open(map.value, marker.value);
      // Render Vue component into info window
      renderInfoWindowContent(infoWindowContentDiv, props.station);
    });

    // Open info window immediately
    infoWindow.open(map.value, marker.value);
    renderInfoWindowContent(infoWindowContentDiv, props.station);

    // Track marker and info window in both systems
    const markerData = {
      marker: marker.value,
      stationSno: props.station.sno,
      infoWindow: infoWindow,
      type: 'standard',
      isSelected: true
    };
    
    allMarkers.value.push(markerData);
    allInfoWindows.value.push(infoWindow);
    markerRegistry.value.set(props.station.sno, markerData);
    focusedStationId.value = props.station.sno;

    console.log('✅ Map initialized successfully');

    // Try to get user location
    try {
      userLocation.value = await GoogleMapsService.getCurrentLocation();
    } catch (error) {
      //console.log('ℹ️ User location not available:', error.message);
    }

  } catch (error) {
    console.error('❌ Google Maps failed, trying fallback:', error);
    
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

      const infoWindowContentDiv = document.createElement('div');
      infoWindowContentDiv.id = 'leaflet-info-window-content';
      const infoWindow = await LeafletMapService.createInfoWindow(
        infoWindowContentDiv,
        {
          offset: [0, -30]
        }
      );

      infoWindow.open(map.value, marker.value);
      renderInfoWindowContent(infoWindowContentDiv, props.station, 'leaflet');
      
      allMarkers.value.push({
        marker: marker.value,
        stationSno: props.station.sno,
        infoWindow: infoWindow,
        type: 'leaflet'
      });
      allInfoWindows.value.push(infoWindow);

      console.log('✅ Fallback map initialized successfully');

    } catch (fallbackError) {
      console.error('❌ All map services failed:', fallbackError);
      mapError.value = `地圖載入失敗: ${fallbackError.message}`;
    }
  } finally {
    mapLoading.value = false;
  }
}

async function retryMapLoad() {
  console.log('🔄 Retrying map load...');
  await initializeMap();
}

async function updateMapForNewStation() {
  if (!map.value) return;
  
  console.log('🔄 Updating map for new station:', props.station.sna);
  
  try {
    // Clear existing markers
    clearAllMarkers();
    
    if (usingFallbackMap.value) {
      // Update Leaflet map
      map.value.setView([stationPosition.value.lat, stationPosition.value.lng], 16);
      
      marker.value = await LeafletMapService.createMarker(
        map.value,
        stationPosition.value,
        {
          title: props.station.sna,
          isSelected: true
        }
      );
      
      const infoWindowContentDiv = document.createElement('div');
      infoWindowContentDiv.id = 'leaflet-info-window-content';
      const infoWindow = await LeafletMapService.createInfoWindow(
        infoWindowContentDiv,
        {
          offset: [0, -30]
        }
      );
      
      infoWindow.open(map.value, marker.value);
      renderInfoWindowContent(infoWindowContentDiv, props.station, 'leaflet');
      
      infoWindow.open(map.value, marker.value);

      // FIX: Register the new main marker so it can be cleared later
      const markerData = {
        marker: marker.value,
        stationSno: props.station.sno,
        infoWindow: infoWindow,
        type: 'leaflet',
        isSelected: true
      };
      allMarkers.value.push(markerData);
      allInfoWindows.value.push(infoWindow);
      markerRegistry.value.set(props.station.sno, markerData);
      focusedStationId.value = props.station.sno;
      
    } else {
      // Update Google Maps
      map.value.setCenter(stationPosition.value);
      map.value.setZoom(16);
      
      const google = await GoogleMapsService.initialize();
      
      marker.value = await GoogleMapsService.createStandardMarker(
        map.value,
        stationPosition.value,
        {
          title: props.station.sna,
          isSelected: true,
          availableBikes: props.station.available_rent_bikes
        }
      );
      
      const infoWindowContentDiv = document.createElement('div');
      infoWindowContentDiv.id = 'google-maps-info-window-content';
      const infoWindow = new google.maps.InfoWindow({
        content: infoWindowContentDiv
      });

      marker.value.addListener('click', () => {
        infoWindow.open(map.value, marker.value);
        renderInfoWindowContent(infoWindowContentDiv, props.station);
      });
      
      infoWindow.open(map.value, marker.value);
      renderInfoWindowContent(infoWindowContentDiv, props.station);
      
      // FIX: Register the new main marker so it can be cleared later
      const markerData = {
        marker: marker.value,
        stationSno: props.station.sno,
        infoWindow: infoWindow,
        type: 'standard',
        isSelected: true
      };
      allMarkers.value.push(markerData);
      allInfoWindows.value.push(infoWindow);
      markerRegistry.value.set(props.station.sno, markerData);
      focusedStationId.value = props.station.sno;
    }
    
    // Clear previous data
    directionsResult.value = null;
    nearbyStations.value = [];
    
    // Find nearby stations
    await findNearbyStations(false);
    
    console.log('✅ Map updated successfully for new station');
    
  } catch (error) {
    console.error('❌ Error updating map for new station:', error);
  }
}

function clearAllMarkers() {
  console.log('🧹 Clearing all markers. Registry size:', markerRegistry.value.size, 'Array count:', allMarkers.value.length);
  
  if (usingFallbackMap.value && map.value) {
    // Clear Leaflet markers - comprehensive approach
    try {
      // Method 1: Remove markers from registry
      markerRegistry.value.forEach((markerData, stationId) => {
        if (markerData && markerData.marker && markerData.type === 'leaflet') {
          try {
            map.value.removeLayer(markerData.marker);
            console.log('🗑️ Removed Leaflet marker for station:', stationId);
          } catch (error) {
            console.warn('Error removing registry Leaflet marker:', error);
          }
        }
      });
      
      // Method 2: Remove tracked markers from array
      allMarkers.value.forEach(markerData => {
        if (markerData && markerData.marker && markerData.type === 'leaflet') {
          try {
            map.value.removeLayer(markerData.marker);
          } catch (error) {
            console.warn('Error removing tracked Leaflet marker:', error);
          }
        }
      });
      
      // Method 3: Remove all marker layers from map (safety net)
      const layersToRemove = [];
      map.value.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          layersToRemove.push(layer);
        }
      });
      layersToRemove.forEach(layer => {
        try {
          map.value.removeLayer(layer);
        } catch (error) {
          console.warn('Error removing Leaflet layer:', error);
        }
      });
      
      console.log('✅ Cleared', layersToRemove.length, 'Leaflet markers total');
    } catch (error) {
      console.error('❌ Error clearing Leaflet markers:', error);
    }
    
  } else if (map.value) {
    // 清除地圖標記
    try {
      // Method 1: Remove markers from registry
      markerRegistry.value.forEach((markerData, stationId) => {
        if (markerData && markerData.marker) {
          try {
            markerData.marker.setMap(null);
            if (markerData.infoWindow) {
              markerData.infoWindow.close();
            }
            console.log('🗑️ Removed Google marker for station:', stationId);
          } catch (error) {
            console.warn('Error removing registry Google marker:', error);
          }
        }
      });
      
      // Method 2: Remove tracked markers from array
      allMarkers.value.forEach(markerData => {
        if (markerData && markerData.marker) {
          try {
            // Handle different marker types
            if (markerData.type === 'advanced' || markerData.type === 'standard') {
              markerData.marker.setMap(null);
            }
            
            // Close any associated info windows
            if (markerData.infoWindow) {
              markerData.infoWindow.close();
            }
          } catch (error) {
            console.warn('Error removing tracked Google marker:', error);
          }
        }
      });
      
      // Method 3: Clear main marker reference (safety net)
      if (marker.value) {
        try {
          marker.value.setMap(null);
        } catch (error) {
          console.warn('Error removing main marker:', error);
        }
      }
      
      console.log('✅ Cleared Google Maps markers from registry and array');
    } catch (error) {
      console.error('❌ Error clearing Google Maps markers:', error);
    }
  }
  
  // Close all info windows
  allInfoWindows.value.forEach(infoWindow => {
    try {
      if (infoWindow && typeof infoWindow.close === 'function') {
        infoWindow.close();
      }
    } catch (error) {
      console.warn('Error closing info window:', error);
    }
  });
  
  // Reset all tracking systems
  markerRegistry.value.clear();
  allMarkers.value = [];
  allInfoWindows.value = [];
  marker.value = null;
  focusedStationId.value = null;
  
  console.log('✅ All markers cleared and tracking systems reset');
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
    closeAllInfoWindows();
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

async function findNearbyStations(shouldScroll = false) {
  nearbyLoading.value = true;
  
  // Clear existing nearby markers before adding new ones
  clearNearbyMarkers();
  
  try {
    const service = usingFallbackMap.value ? LeafletMapService : GoogleMapsService;
    const nearby = await service.findNearbyStations(
      stationPosition.value,
      500,
      props.allStations.filter(s => s.sno !== props.station.sno)
    );
    
    nearbyStations.value = nearby.slice(0, 5);
    await addNearbyStationMarkers(nearbyStations.value);

    // Scroll to the nearby section only if explicitly requested
    if (shouldScroll && nearbySectionRef.value) {
      nearbySectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
  } catch (error) {
    console.error('Error finding nearby stations:', error);
  } finally {
    nearbyLoading.value = false;
  }
}

function clearNearbyMarkers() {
  if (!map.value) return;
  
  // Remove only nearby station markers (preserve main station marker)
  for (const [sno, markerData] of markerRegistry.value.entries()) {
    if (sno === props.station.sno) continue; // Skip main station
    
    if (usingFallbackMap.value) {
      map.value.removeLayer(markerData.marker);
    } else {
      markerData.marker.setMap(null);
    }
    
    markerRegistry.value.delete(sno);
  }
  
  // Update allMarkers array
  allMarkers.value = allMarkers.value.filter(marker =>
    marker.stationSno === props.station.sno
  );
  
  //console.log('🧹 Cleared all nearby markers');
}

async function addNearbyStationMarkers(nearbyStations) {
  if (!map.value || nearbyStations.length === 0) {
    console.log('Skipping addNearbyStationMarkers: map not ready or no nearby stations.');
    return;
  }
  
  console.log('📍 Adding markers for nearby stations:', nearbyStations.length);
  
  // Ensure map is fully loaded before adding markers
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for map to render

  for (const station of nearbyStations) {
    try {
      const position = {
        lat: parseFloat(station.latitude),
        lng: parseFloat(station.longitude)
      };
      
      console.log(`Attempting to add marker for ${station.sna} at ${position.lat}, ${position.lng}`);

      if (usingFallbackMap.value) {
        const nearbyMarker = await LeafletMapService.createMarker(
          map.value,
          position,
          {
            title: station.sna,
            isSelected: false,
            distance: station.distance,
            availableBikes: station.available_rent_bikes
          }
        );
        
        const infoWindowContentDiv = document.createElement('div');
        infoWindowContentDiv.id = 'leaflet-nearby-info-window-content';
        const infoWindow = await LeafletMapService.createInfoWindow(
          infoWindowContentDiv,
          {
            offset: [0, -30]
          }
        );
        
        const markerData = {
          marker: nearbyMarker,
          stationSno: station.sno,
          infoWindow: infoWindow,
          type: 'leaflet',
          isSelected: false
        };
        
        allMarkers.value.push(markerData);
        markerRegistry.value.set(station.sno, markerData);
        
        nearbyMarker.on('click', () => {
          handleNearbyStationClick(station.sno);
          renderInfoWindowContent(infoWindowContentDiv, station, 'leaflet');
        });
        console.log(`✅ Leaflet marker added for ${station.sna}`);
        
      } else {
        const nearbyMarker = await GoogleMapsService.createStandardMarker(
          map.value,
          position,
          {
            title: station.sna,
            isSelected: false,
            distance: station.distance,
            availableBikes: station.available_rent_bikes
          }
        );
        
        const infoWindowContentDiv = document.createElement('div');
        infoWindowContentDiv.id = 'google-maps-nearby-info-window-content';
        const infoWindow = new google.maps.InfoWindow({
          content: infoWindowContentDiv
        });
        
        const markerData = {
          marker: nearbyMarker,
          stationSno: station.sno,
          infoWindow: infoWindow,
          type: 'standard',
          isSelected: false
        };
        
        allMarkers.value.push(markerData);
        markerRegistry.value.set(station.sno, markerData);
        
        nearbyMarker.addListener('click', () => {
          handleNearbyStationClick(station.sno);
          renderInfoWindowContent(infoWindowContentDiv, station);
        });
        console.log(`✅ Google Maps marker added for ${station.sna}`);
      }
      
    } catch (error) {
      console.error('Error adding marker for station:', station.sna, error);
    }
  }
  
  console.log('✅ Finished adding markers for all nearby stations');
}

async function handleNearbyStationClick(stationSno) {
  console.log('🎯 Nearby station clicked:', stationSno);

  // Close all existing info windows. The watcher on props.station will handle the full map refresh.
  closeAllInfoWindows();

  // Emit event to parent, which will trigger the watcher to update the map
  emit('station-selected', stationSno);

  // Scroll to the map section
  if (mapContainer.value) {
    await nextTick(); // Ensure DOM is updated after station change
    mapContainer.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function closeAllInfoWindows() {
  allInfoWindows.value.forEach(infoWindow => {
    try {
      if (infoWindow && typeof infoWindow.close === 'function') {
        infoWindow.close();
      }
    } catch (error) {
      console.warn('Error closing info window:', error);
    }
  });
}

// The complex transitionMarkerStates function was removed.
// It was conflicting with the watcher-based map update logic,
// causing markers to not be cleared correctly. The watcher on `props.station`
// now handles the entire map refresh, which is a more robust approach.

async function toggleStreetView() {
  showStreetView.value = !showStreetView.value;
  
  if (showStreetView.value) {
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      mapLoading.value = true;
      mapError.value = '';
      
      if (!streetViewContainer.value) {
        throw new Error('Street View container not found');
      }
      
      streetViewPanorama.value = await GoogleMapsService.createStreetViewPanorama(
        streetViewContainer.value,
        stationPosition.value,
        {
          pov: { heading: 0, pitch: 0 },
          zoom: 1,
          enableCloseButton: true
        }
      );
      
      // Add listener for when Google's native exit button is clicked
      if (streetViewPanorama.value) {
        streetViewPanorama.value.addListener('visible_changed', () => {
          if (!streetViewPanorama.value.getVisible()) {
            console.log('Google Street View exited natively. Returning to map view.');
            showStreetView.value = false; // Update our internal state
            // No need to call toggleStreetView directly, as the watcher on showStreetView will handle it
          }
        });
      }
      
      console.log('✅ Street View panorama created successfully');
      
    } catch (error) {
      console.error('❌ Error loading Street View:', error);
      showStreetView.value = false;
      mapError.value = `街景載入失敗: ${error.message}`;
      alert('無法載入街景視圖，請稍後再試');
    } finally {
      mapLoading.value = false;
    }
  } else {
    // Switching back to map view
    // Clean up the panorama when hiding
    if (streetViewPanorama.value) {
      streetViewPanorama.value = null;
    }
    mapError.value = '';
    
    // Re-initialize the map to ensure it's correctly rendered with markers
    await nextTick(); // Ensure DOM is ready for map container
    await initializeMap(); // This will clear and re-add the main marker
    await findNearbyStations(); // Re-add nearby markers
  }
}

function getAvailabilityClass(count) {
  if (count === 0) return 'availability-none';
  if (count <= 4) return 'availability-low';
  return 'availability-good';
}

function formatStationName(name) {
  const prefix = 'YouBike2.0_';
  if (name.startsWith(prefix)) {
    return name.substring(prefix.length);
  }
  return name;
}

// Function to render Vue component into info window
function renderInfoWindowContent(container, station) {
  // Clear previous content
  container.innerHTML = '';
  
  const app = createApp(InfoWindowContent, {
    station: station,
      onGetDirections: () => getDirections(),
      onToggleStreetView: () => toggleStreetView(),
      onFindNearbyStations: () => findNearbyStations(true)
    });
  app.mount(container);
}

function closeModal() {
  emit('close');
}

function cleanup() {
  directionsResult.value = null;
  nearbyStations.value = [];

  // This will remove markers from the map and reset tracking arrays
  clearAllMarkers();
  
  if (map.value) {
    if (!usingFallbackMap.value) {
      try {
        const google = window.google;
        if (google && google.maps && google.maps.event) {
          google.maps.event.clearInstanceListeners(map.value);
        }
      } catch (error) {
        console.warn('Error clearing map event listeners:', error);
      }
    } else {
      try {
        map.value.remove();
      } catch (error) {
        console.warn('Error removing Leaflet map:', error);
      }
    }
  }
  
  map.value = null;
  // marker.value, allMarkers, etc. are already handled by clearAllMarkers()
  showStreetView.value = false;
  streetViewPanorama.value = null;
}

onUnmounted(() => {
  cleanup();
});
</script>

<style scoped>
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
  overflow-y: auto; /* Allow modal to scroll if content exceeds max-height */
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
  width: 100% !important;
  height: 100% !important;
  min-height: 400px !important;
  display: block !important;
  visibility: visible !important;
  position: relative !important;
  z-index: 1 !important;
}

.street-view-container {
  width: 100% !important;
  height: 100% !important;
  min-height: 400px !important;
  position: relative !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  display: block !important;
  visibility: visible !important;
  z-index: 1 !important;
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

.action-btn.active {
  background: #007bff;
  color: white;
}

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

.nearby-section h4,
.directions-section h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
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


  .map-modal-overlay {
    padding: 10px;
  }
  
  .modal-content {
    display: flex;
    flex-direction: column;
    min-height: 0; /* Allow flex item to shrink */
    max-height: none; /* Remove fixed max-height */
  }
  
  .map-section {
    height: auto; /* Allow flex-grow to control height */
    flex-grow: 4; /* Make map section take 4 parts of available space */
    flex-shrink: 0;
  }
  
  .info-section {
    flex-grow: 1; /* Make info section take 1 part of available space */
    overflow-y: auto;
    min-height: 0;
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

@media (max-width: 480px) {
  .stats {
    grid-template-columns: 1fr;
  }
  
  .station-info {
    flex-direction: column;
    gap: 15px;
  }
}
</style>
