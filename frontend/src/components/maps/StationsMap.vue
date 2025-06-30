<template>
  <div class="stations-map-container">
    <div ref="mapDiv" class="map-canvas"></div>
    <div v-if="loading" class="map-overlay loading-overlay">
      <div class="spinner"></div>
      <p>載入地圖中...</p>
    </div>
    <div v-if="error" class="map-overlay error-overlay">
      <p>地圖載入失敗: {{ error }}</p>
      <button @click="initializeMap">重新載入</button>
    </div>
    <div v-if="showLocationPrompt" class="map-overlay location-prompt">
      <p>是否允許取得您的位置？</p>
      <button @click="requestLocation">允許</button>
      <button @click="useDefaultLocation">使用預設位置</button>
    </div>
    <div v-if="updatingStations" class="map-status-indicator">
      <div class="status-spinner"></div>
      <span>更新附近站點...</span>
    </div>
    <StreetViewModal :visible="showStreetViewModal" :station="selectedStationForStreetView" @close="showStreetViewModal = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue';
import GoogleMapsService from '@/services/GoogleMapsService';
import LeafletMapService from '@/services/LeafletMapService';
import { useUbikeStore } from '@/stores/ubike';
import { createApp } from 'vue';
import InfoWindowContent from './InfoWindowContent.vue';
import StreetViewModal from './StreetViewModal.vue';

const props = defineProps({
  stations: {
    type: Array,
    required: true
  },
  filteredStations: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['station-selected']);

const ubikeStore = useUbikeStore();

const mapDiv = ref(null);
const mapInstance = ref(null);
const mapInitialized = ref(false);
const loading = ref(true);
const error = ref(null);
const userLocation = ref(null);
const userLocationGranted = ref(false);
const showLocationPrompt = ref(false);
const currentMarkers = ref(new Map()); // Map of station ID to marker
const currentInfoWindows = ref(new Map()); // Map of station ID to info window
const currentOpenInfoWindow = ref(null); // Track currently open info window
const usingFallbackMap = ref(false);
const updatingStations = ref(false);
const currentMapCenter = ref(null);
const currentDisplayedStations = ref(new Set()); // Set of currently displayed station IDs
const showStreetViewModal = ref(false);
const selectedStationForStreetView = ref(null);

const TAIPEI_CITY_HALL_LOCATION = { lat: 25.033964, lng: 121.564576 };
const DEFAULT_ZOOM = 17;

// Debounce function for map events
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Enhanced radius logic based on zoom level and center source
function getRadiusForZoom(zoom) {
  // Use 1km for station-centered views, 500m for others
  return ubikeStore.centerPointSource === 'station' ? 1000 : 500;
}

// Debounced handlers for map events
const debouncedCenterChange = debounce(handleMapCenterChange, 300);
const debouncedZoomChange = debounce(handleMapZoomChange, 200);

// Note: We no longer use filteredStations watcher since we now use dynamic center-based filtering

onMounted(() => {
  nextTick(() => {
    if (!mapInitialized.value) {
      initializeMap();
    }
  });
});


watch(userLocation, async (newLocation) => {
  console.log('Watcher: userLocation changed. New value:', newLocation);
  if (!newLocation || !mapInitialized.value) return;
  
  console.log('Watcher: userLocation changed with map initialized, updating map content.');
  await renderMapContent();
});

watch(() => ubikeStore.selectedStation, async (newStation) => {
  if (newStation && mapInitialized.value) {
    // Wait for the marker to be available
    let attempts = 0;
    const maxAttempts = 10;
    const delay = 100; // ms
    let marker = null;
    let infoWindow = null;

    while ((!marker || !infoWindow) && attempts < maxAttempts) {
      marker = currentMarkers.value.get(newStation.sno);
      infoWindow = currentInfoWindows.value.get(newStation.sno);
      if (!marker || !infoWindow) {
        console.log(`Waiting for marker for station ${newStation.sno}... Attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        attempts++;
      }
    }

    if (marker && infoWindow) {
      if (currentOpenInfoWindow.value) {
        currentOpenInfoWindow.value.close();
      }
      renderInfoWindowContent(infoWindow.getContent(), newStation);
      infoWindow.open(mapInstance.value, marker);
      currentOpenInfoWindow.value = infoWindow;
    } else {
      console.warn(`Marker or InfoWindow not found for selected station ${newStation.sno} after ${maxAttempts} attempts.`);
    }
  }
});


// Watch for changes in store's center point to re-center map
watch(() => ubikeStore.currentCenterPoint, async (newCenter, oldCenter) => {
  console.log('Watcher: store center point changed:', newCenter, 'source:', ubikeStore.centerPointSource);
  if (!mapInitialized.value || !newCenter) return;
  
  // Only re-center if this is a significant change (not just map dragging)
  if (ubikeStore.centerPointSource === 'station') {
    console.log('Watcher: Re-centering map to selected station');
    if (usingFallbackMap.value) {
      mapInstance.value.setView([newCenter.lat, newCenter.lng], DEFAULT_ZOOM);
    } else {
      mapInstance.value.setCenter(newCenter);
      mapInstance.value.setZoom(DEFAULT_ZOOM);
    }
    await renderMapContent();
  }
}, { deep: true });

onUnmounted(() => {
  cleanupMap();
});

async function initializeMap() {
  if (mapInitialized.value) {
    console.log('initializeMap: Map already initialized, skipping.');
    return;
  }
  
  console.log('initializeMap: Function started.');
  loading.value = true;
  error.value = null;
  userLocationGranted.value = false; // Reset on re-init
  showLocationPrompt.value = false; // Hide prompt initially

  let initialCenter = TAIPEI_CITY_HALL_LOCATION; // Default to Taipei City Hall

  // Check if there's already a center point set in the store (e.g., from selected station)
  if (ubikeStore.currentCenterPoint) {
    initialCenter = ubikeStore.currentCenterPoint;
    console.log('initializeMap: Using store center point:', initialCenter, 'source:', ubikeStore.centerPointSource);
  }
  // Attempt to get user location only if no center point is set and user location not already obtained
  else if (!userLocation.value) { // Only try to get location if not already set
    try {
      const position = await GoogleMapsService.getCurrentLocation();
      userLocation.value = position;
      userLocationGranted.value = true;
      initialCenter = position;
      console.log('initializeMap: ✅ User location obtained:', userLocation.value);
    } catch (locError) {
      console.warn('initializeMap: ⚠️ Could not get user location:', locError.message);
      userLocationGranted.value = false;
      if (locError.code === locError.PERMISSION_DENIED) {
        // User explicitly denied, proceed with default location without prompt
        userLocation.value = TAIPEI_CITY_HALL_LOCATION;
        console.log('initializeMap: User denied geolocation, using default location.');
      } else {
        // Other errors (timeout, unavailable), show prompt
        showLocationPrompt.value = true;
        error.value = '無法取得您的位置，請允許位置存取權限或使用預設位置。';
        loading.value = false;
        console.log('initializeMap: Waiting for user interaction for location.');
        return; // Stop initialization until user interacts
      }
    }
  }

  // Enhanced DOM readiness check with retry mechanism
  let attempts = 0;
  const maxAttempts = 10;
  const delay = 100; // ms
  
  while ((!mapDiv.value || !(mapDiv.value instanceof HTMLElement)) && attempts < maxAttempts) {
    console.log(`initializeMap: Waiting for mapDiv to be ready... Attempt ${attempts + 1}/${maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    attempts++;
  }
  
  if (!mapDiv.value || !(mapDiv.value instanceof HTMLElement)) {
    console.error('initializeMap: mapDiv is not an HTMLElement after multiple attempts, cannot initialize map.');
    error.value = '地圖容器未準備好，無法顯示地圖。';
    loading.value = false;
    return;
  }
  
  // Ensure container has proper dimensions and is in DOM
  mapDiv.value.style.width = '100%';
  mapDiv.value.style.height = '100%';
  mapDiv.value.style.minHeight = '400px';
  mapDiv.value.style.display = 'block';
  mapDiv.value.style.visibility = 'visible';
  mapDiv.value.style.position = 'relative';
  
  // Force DOM reflow to ensure container is ready
  void mapDiv.value.offsetHeight;
  
  console.log('initializeMap: ✅ mapDiv is ready, proceeding with map initialization.');

  // Proceed with map initialization using the determined initialCenter
  try {
    console.log('initializeMap: Attempting to initialize Google Maps with center:', initialCenter);
    const google = await GoogleMapsService.initialize();
    mapInstance.value = await GoogleMapsService.createMap(mapDiv.value, {
      center: initialCenter,
      zoom: DEFAULT_ZOOM,
    });
    usingFallbackMap.value = false;
    mapInitialized.value = true; // Set flag after successful map creation
    console.log('initializeMap: ✅ Google Maps initialized successfully.');

    // Add enhanced event listeners for zoom and center changes
    mapInstance.value.addListener('zoom_changed', debouncedZoomChange);
    mapInstance.value.addListener('center_changed', debouncedCenterChange);
    mapInstance.value.addListener('dragend', debouncedCenterChange);

  } catch (mapInitError) {
    console.error('initializeMap: ❌ Google Maps initialization failed, trying Leaflet:', mapInitError);
    usingFallbackMap.value = true;
    mapInstance.value = await LeafletMapService.createMap(mapDiv.value, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: DEFAULT_ZOOM,
    });
    // Add enhanced event listeners for Leaflet
    mapInstance.value.on('zoomend', debouncedZoomChange);
    mapInstance.value.on('moveend', debouncedCenterChange);
    mapInstance.value.on('dragend', debouncedCenterChange);
    mapInitialized.value = true; // Set flag after successful map creation
    console.log('initializeMap: ✅ Fallback Leaflet map initialized successfully.');
  }

  // Initial rendering of map content
  console.log('initializeMap: Calling renderMapContent for initial display.');
  renderMapContent();

  loading.value = false;
  console.log('initializeMap: Function finished. Loading set to false.');
}

  async function renderMapContent() {
  console.log('renderMapContent: Function started.');
  if (!mapInstance.value) {
    console.log('renderMapContent: mapInstance is null, returning.');
    return;
  }

  try {
    const currentZoom = usingFallbackMap.value ? mapInstance.value.getZoom() : mapInstance.value.getZoom();
    const radius = getRadiusForZoom(currentZoom);
    console.log(`renderMapContent: Map zoomed to ${currentZoom}, setting radius to ${radius / 1000}km`);

    const center = usingFallbackMap.value 
      ? { lat: mapInstance.value.getCenter().lat, lng: mapInstance.value.getCenter().lng }
      : { lat: mapInstance.value.getCenter().lat(), lng: mapInstance.value.getCenter().lng() };

    const service = usingFallbackMap.value ? LeafletMapService : GoogleMapsService;
    // Use filteredStations instead of props.stations to respect user filters
    const stationsInRadius = await service.findNearbyStations(center, radius, props.stations);
    console.log('renderMapContent: Result of findNearbyStations:', stationsInRadius);
    
    // Update the displayed stations based on this new filtered list
    updateMapMarkers(stationsInRadius);
    console.log('renderMapContent: Function finished.');
  } catch (err) {
    console.error('renderMapContent: Error during map content rendering:', err);
    error.value = err.message || '地圖內容載入失敗';
  }
}

async function requestLocation() {
  console.log('requestLocation: User clicked Allow. Attempting to get location.');
  loading.value = true;
  error.value = null;
  showLocationPrompt.value = false; // Hide prompt immediately

  try {
    const position = await GoogleMapsService.getCurrentLocation();
    userLocation.value = position;
    userLocationGranted.value = true;
    console.log('requestLocation: ✅ User granted location:', userLocation.value);
    // The watcher on userLocation will now handle map re-initialization
  } catch (err) {
    console.error('requestLocation: ❌ Failed to get user location after request:', err);
    alert('無法取得您的位置，將使用預設位置。');
    useDefaultLocation(); // Fallback to default if user denies again or other error
  } finally {
    loading.value = false;
  }
}

async function useDefaultLocation() {
  userLocation.value = TAIPEI_CITY_HALL_LOCATION;
  userLocationGranted.value = true; // Treat as granted since we have a location
  showLocationPrompt.value = false; // Hide prompt on using default
  console.log('📍 Using default location:', userLocation.value);
  cleanupMap(); // Clean up old map instance
  await initializeMap();
}

// Enhanced map event handlers
async function handleMapCenterChange() {
  console.log('handleMapCenterChange: Map center changed, updating stations.');
  if (!mapInstance.value) return;
  
  // Update the store's center point when map is moved
  const center = usingFallbackMap.value 
    ? { lat: mapInstance.value.getCenter().lat, lng: mapInstance.value.getCenter().lng }
    : { lat: mapInstance.value.getCenter().lat(), lng: mapInstance.value.getCenter().lng() };
  
  ubikeStore.setCenterFromMap(center);
  
  updatingStations.value = true;
  try {
    await renderMapContent();
  } finally {
    updatingStations.value = false;
  }
}

async function handleMapZoomChange() {
  console.log('handleMapZoomChange: Map zoom changed, updating stations.');
  if (!mapInstance.value) return;
  
  updatingStations.value = true;
  try {
    await renderMapContent();
  } finally {
    updatingStations.value = false;
  }
}



async function updateMapMarkers(stations) {
  console.log('updateMapMarkers: Smart update started with', stations?.length, 'stations.');
  if (!mapInstance.value || !Array.isArray(stations)) {
    console.log('updateMapMarkers: mapInstance is null or stations is not an array, returning.');
    return;
  }

  const newStationIds = new Set(stations.map(s => s.sno));
  const currentStationIds = currentDisplayedStations.value;

  // Find stations to add and remove
  const stationsToAdd = stations.filter(s => !currentStationIds.has(s.sno));
  const stationIdsToRemove = [...currentStationIds].filter(id => !newStationIds.has(id));

  console.log(`updateMapMarkers: Adding ${stationsToAdd.length} stations, removing ${stationIdsToRemove.length} stations`);

  // Remove old stations with fade-out animation
  await removeStationsWithAnimation(stationIdsToRemove);

  // Add new stations with fade-in animation
  await addStationsWithAnimation(stationsToAdd);

  // Update the current displayed stations set
  currentDisplayedStations.value = newStationIds;
  
  console.log('updateMapMarkers: Smart update finished. Total markers:', currentMarkers.value.size);
}

async function removeStationsWithAnimation(stationIdsToRemove) {
  if (stationIdsToRemove.length === 0) return;

  console.log('removeStationsWithAnimation: Removing', stationIdsToRemove.length, 'stations');

  for (const stationId of stationIdsToRemove) {
    const marker = currentMarkers.value.get(stationId);
    const infoWindow = currentInfoWindows.value.get(stationId);

    if (marker) {
      // Close info window if it's the currently open one
      if (currentOpenInfoWindow.value === infoWindow) {
        currentOpenInfoWindow.value.close();
        currentOpenInfoWindow.value = null;
      }

      // Close and remove info window
      if (infoWindow && typeof infoWindow.close === 'function') {
        infoWindow.close();
      }

      // For Google Maps, we can add a fade-out effect by manipulating opacity
      if (!usingFallbackMap.value && marker.setOpacity) {
        // Fade out animation
        let opacity = 1;
        const fadeOut = () => {
          opacity -= 0.1;
          if (opacity <= 0) {
            marker.setMap(null);
          } else {
            marker.setOpacity(opacity);
            requestAnimationFrame(fadeOut);
          }
        };
        fadeOut();
      } else {
        // For Leaflet or if opacity is not supported, remove immediately
        if (usingFallbackMap.value) {
          mapInstance.value?.removeLayer(marker);
        } else {
          marker.setMap?.(null);
        }
      }

      // Remove from our tracking
      currentMarkers.value.delete(stationId);
      currentInfoWindows.value.delete(stationId);
    }
  }

  // Small delay to let fade-out animations complete
  await new Promise(resolve => setTimeout(resolve, 100));
}

async function addStationsWithAnimation(stationsToAdd) {
  if (stationsToAdd.length === 0) return;

  console.log('addStationsWithAnimation: Adding', stationsToAdd.length, 'stations');

  const service = usingFallbackMap.value ? LeafletMapService : GoogleMapsService;

  // Add stations with staggered timing for smooth appearance
  for (let i = 0; i < stationsToAdd.length; i++) {
    const station = stationsToAdd[i];
    
    // Add a small delay between each station for staggered effect
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    await addSingleStationWithAnimation(station, service);
  }
}

async function addSingleStationWithAnimation(station, service) {
  if (!station?.latitude || !station?.longitude) {
    console.warn('Invalid station data:', station);
    return;
  }

  const position = { 
    lat: parseFloat(station.latitude), 
    lng: parseFloat(station.longitude) 
  };
  
  if (isNaN(position.lat) || isNaN(position.lng)) {
    console.warn('Invalid station coordinates:', station);
    return;
  }

  try {
    let marker;
    let infoWindow;

    if (usingFallbackMap.value) {
      marker = await service.createMarker(mapInstance.value, position, { title: station.sna });
      infoWindow = await service.createInfoWindow(document.createElement('div'));
      marker.bindPopup(infoWindow.content);
      marker.on('click', () => {
        if (currentOpenInfoWindow.value) {
          currentOpenInfoWindow.value.close();
        }
        renderInfoWindowContent(infoWindow.content, station);
        infoWindow.open(mapInstance.value, marker);
        currentOpenInfoWindow.value = infoWindow;
      });
    } else {
      marker = await service.createStandardMarker(mapInstance.value, position, { title: station.sna });
      infoWindow = new google.maps.InfoWindow({ content: document.createElement('div') });
      
      // Start with low opacity for fade-in effect
      if (marker.setOpacity) {
        marker.setOpacity(0);
      }

      marker.addListener('click', () => {
        if (currentOpenInfoWindow.value) {
          currentOpenInfoWindow.value.close();
        }
        renderInfoWindowContent(infoWindow.getContent(), station);
        infoWindow.open(mapInstance.value, marker);
        currentOpenInfoWindow.value = infoWindow;
      });

      // Fade-in animation for Google Maps
      if (marker.setOpacity) {
        let opacity = 0;
        const fadeIn = () => {
          opacity += 0.1;
          if (opacity >= 1) {
            marker.setOpacity(1);
          } else {
            marker.setOpacity(opacity);
            requestAnimationFrame(fadeIn);
          }
        };
        // Start fade-in after a brief moment
        setTimeout(fadeIn, 10);
      }
    }

    if (marker) {
      currentMarkers.value.set(station.sno, marker);
      currentInfoWindows.value.set(station.sno, infoWindow);
    }
  } catch (err) {
    console.error('Error creating marker for station:', station.sno, err);
  }
}

function renderInfoWindowContent(container, station) {
  container.innerHTML = ''; // Clear previous content
  const app = createApp(InfoWindowContent, {
    station: station,
    isMapView: true, // Set isMapView to true in map mode
    onGetDirections: () => {
      currentInfoWindows.value.forEach(iw => iw.close());
      emit('station-selected', station.sno);
    },
    onToggleStreetView: () => {
      currentInfoWindows.value.forEach(iw => iw.close());
      selectedStationForStreetView.value = station;
      showStreetViewModal.value = true;
    }
  });
  app.mount(container);
}

function cleanupMap() {
  console.log('cleanupMap: Function started.');
  if (mapInstance.value) {
    if (usingFallbackMap.value) {
      // Remove all Leaflet event listeners
      mapInstance.value.off('zoomend');
      mapInstance.value.off('moveend');
      mapInstance.value.off('dragend');
      mapInstance.value.remove();
    } else {
      // Google Maps cleanup - remove all event listeners
      if (mapInstance.value.google) {
        mapInstance.value.google.maps.event.clearInstanceListeners(mapInstance.value);
      }
    }
    mapInstance.value = null;
  }
  // Close any open info window
  if (currentOpenInfoWindow.value) {
    currentOpenInfoWindow.value.close();
    currentOpenInfoWindow.value = null;
  }
  // Clear all markers and info windows
  currentMarkers.value.forEach(marker => {
    if (usingFallbackMap.value) {
      mapInstance.value?.removeLayer(marker);
    } else {
      marker.setMap?.(null);
    }
  });
  currentInfoWindows.value.forEach(infoWindow => {
    if (infoWindow && typeof infoWindow.close === 'function') {
      infoWindow.close();
    }
  });
  currentMarkers.value.clear();
  currentInfoWindows.value.clear();
  currentDisplayedStations.value.clear();
  loading.value = false;
  error.value = null;
  mapInitialized.value = false; // Reset mapInitialized flag
  console.log('cleanupMap: Function finished. mapInitialized set to false.');
}
</script>

<style scoped>
.stations-map-container {
  width: 100%;
  height: 600px; /* Adjust height as needed */
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.map-canvas {
  width: 100%;
  height: 100%;
}

.map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 10;
  text-align: center;
  padding: 20px;
}

.loading-overlay .spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-overlay p {
  color: #dc3545;
  margin-bottom: 15px;
}

.error-overlay button,
.location-prompt button {
  padding: 10px 20px;
  margin: 5px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition-property: background-color;
  transition-duration: 0.3s;
}

.error-overlay button {
  background-color: #007bff;
  color: white;
}

.error-overlay button:hover {
  background-color: #0056b3;
}

.location-prompt p {
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}

.location-prompt button:first-of-type {
  background-color: #28a745;
  color: white;
}

.location-prompt button:first-of-type:hover {
  background-color: #218838;
}

.location-prompt button:last-of-type {
  background-color: #6c757d;
  color: white;
}

.location-prompt button:last-of-type:hover {
  background-color: #5a6268;
}

.map-status-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 15;
  font-size: 14px;
  color: #495057;
}

.status-spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #007bff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}
</style>
