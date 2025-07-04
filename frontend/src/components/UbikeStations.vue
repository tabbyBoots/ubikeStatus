<template>
  <div class="container">
    <div class="header">
      <h1>🚴 即時狀態查詢</h1>
      <p>查詢台北市 YouBike 2.0 即時狀況</p>
    </div>

    <div class="controls">
      <div class="controls-row">
        <div class="search-box">
          <input 
            v-model="searchTerm" 
            type="text" 
            placeholder="搜尋站點名稱或地址..."
            @input="updateSearch"
          />
        </div>
        
        <div class="area-select">
          <select v-model="selectedArea" @change="updateArea">
            <option value="">所有區域</option>
            <option v-for="area in areas" :key="area" :value="area">{{ formatAreaName(area) }}</option>
          </select>
        </div>
        
        <button 
          class="btn btn-secondary reset-btn" 
          @click="resetFilters"
          title="重置所有查詢條件"
        >
          🔄 重置查詢
        </button>
        
        <ViewToggle />
      </div>
      
      <div class="controls-row">
        <div class="filter-buttons">
          <button class="btn btn-primary" :class="{ active: filterType === 'favorites' }" @click="setFilter('favorites')">
            ❤️ 我的最愛 ({{ favoritesStore.favoriteCount }})
          </button>
<button @click="toggleStats" class="btn btn-primary" v-if="viewMode !== 'map'">
  {{ showStats ? '隱藏統計資訊' : '統計資訊' }}
</button>
          <button class="btn btn-primary" :class="{ active: filterType === 'available' }" @click="setFilter('available')">
            有車可借
          </button>
          <button class="btn btn-primary" :class="{ active: filterType === 'parking' }" @click="setFilter('parking')">
            有位可停
          </button>
        </div>
        
        <ExportButton />
        
        <!-- Center Point and Radius Filter Indicator -->
        <div v-if="viewMode !== 'map' && store.currentCenterPoint" class="location-indicator">
          <div class="location-info">
            <span class="location-icon">📍</span>
            <span class="location-text">
              {{ getCenterPointDescription() }}
            </span>
          </div>
          <button 
            @click="toggleRadiusFilter" 
            class="btn btn-sm radius-toggle"
            :class="{ active: store.radiusFilterEnabled }"
            :title="store.radiusFilterEnabled ? `關閉${getRadiusText()}範圍篩選` : `開啟${getRadiusText()}範圍篩選`"
          >
            🎯 {{ store.radiusFilterEnabled ? getRadiusText() : '全部' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="showStats && !loading && !error" class="stats">
      <div class="stat-item">
        <div class="stat-number">{{ stats.totalStations }}</div>
        <div class="stat-label">總站點數</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ stats.activeStations }}</div>
        <div class="stat-label">運作中站點</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ stats.totalBikes }}</div>
        <div class="stat-label">總可借車輛</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">{{ stats.totalSlots }}</div>
        <div class="stat-label">總可停車位</div>
      </div>
    </div>

    <div v-if="!loading && !error && filteredStations.length === 0" class="no-results">
      <h3>找不到符合條件的站點</h3>
      <p>請嘗試調整搜尋條件</p>
    </div>

    <!-- Table View -->
    <div v-if="!loading && !error && filteredStations.length > 0 && viewMode === 'table'" class="table-container">
      <table class="stations-table">
        <thead>
          <tr>
            <th @click="sort('sna')" class="sortable">
              站點名稱
              <span class="sort-indicator" v-if="sortBy === 'sna'">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sort('sarea')" class="sortable">
              區域
              <span class="sort-indicator" v-if="sortBy === 'sarea'">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sort('available_rent_bikes')" class="sortable">
              可借車輛
              <span class="sort-indicator" v-if="sortBy === 'available_rent_bikes'">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="sort('available_return_bikes')" class="sortable">
              可停車位
              <span class="sort-indicator" v-if="sortBy === 'available_return_bikes'">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>我的最愛</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="station in filteredStations" 
            :key="station.sno"
            class="station-row"
            @click="goToStation(station.sno)"
          >
            <td class="station-name">
              <div>
                <div class="name">{{ formatStationName(station.sna) }}</div>
                <div class="status" :class="station.act === 1 ? 'status-active' : 'status-inactive'">
                  {{ station.act === 1 ? '運作中' : '暫停服務' }}
                </div>
              </div>
            </td>
            <td class="area">{{ formatAreaName(station.sarea) }}</td>
            <td class="bikes">
              <span class="availability-number" :class="getAvailabilityClass(station.available_rent_bikes)">
                {{ station.available_rent_bikes }}
              </span>
            </td>
            <td class="slots">
              <span class="availability-number" :class="getAvailabilityClass(station.available_return_bikes)">
                {{ station.available_return_bikes }}
              </span>
            </td>
            <td class="favorites-cell">
              <FavoritesButton :station-id="station.sno" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Card View -->
    <div v-if="!loading && !error && filteredStations.length > 0 && viewMode === 'card'" class="stations-grid">
      <div 
        v-for="station in filteredStations" 
        :key="station.sno" 
        class="station-card"
        @click="goToStation(station.sno)"
      >
        <div class="station-header">
          <div>
            <div class="station-name">{{ formatStationName(station.sna) }}</div>
            <div class="station-id">站點編號：{{ station.sno }}</div>
          </div>
          <div class="station-actions">
            <FavoritesButton :station-id="station.sno" />
            <div class="station-status" :class="station.act === 1 ? 'status-active' : 'status-inactive'">
              {{ station.act === 1 ? '運作中' : '暫停服務' }}
            </div>
          </div>
        </div>

        <div class="station-info">
          <div class="info-item">
            <div class="info-number bikes-available" :class="getAvailabilityClass(station.available_rent_bikes)">
              {{ station.available_rent_bikes }}
            </div>
            <div class="info-label">可借車輛</div>
          </div>
          <div class="info-item">
            <div class="info-number slots-available" :class="getAvailabilityClass(station.available_return_bikes)">
              {{ station.available_return_bikes }}
            </div>
            <div class="info-label">可停車位</div>
          </div>
        </div>

        <div class="station-details">
          <div><strong>區域：</strong>{{ formatAreaName(station.sarea) }}</div>
          <div><strong>地址：</strong>{{ station.ar }}</div>
          <div><strong>總車位：</strong>{{ station.total }}</div>
          <div><strong>更新時間：</strong>{{ formatTime(station.mday) }}</div>
        </div>
      </div>
    </div>

    <!-- Map View -->
    <StationsMap
      v-if="!loading && !error && viewMode === 'map'"
      :stations="stations"
      :filtered-stations="filteredStationsForMap"
      @station-selected="handleStationSelected"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useUbikeStore } from '@/stores/ubike';
import { useFavoritesStore } from '@/stores/favorites';
import ViewToggle from './ViewToggle.vue';
import ExportButton from './ExportButton.vue';
import FavoritesButton from './FavoritesButton.vue';
import StationsMap from './maps/StationsMap.vue';

const store = useUbikeStore();
const favoritesStore = useFavoritesStore();

const refreshInterval = ref(null);
const showStats = ref(false); // Default to hidden

// Computed properties
const loading = computed(() => store.isLoading);
const error = computed(() => store.error);
const stations = computed(() => store.stations);
const areas = computed(() => store.areas);
const stats = computed(() => store.stats);
const viewMode = computed(() => store.viewMode);

// Methods
function toggleStats() {
  showStats.value = !showStats.value;
}

// Custom filtered stations that handles favorites
const filteredStations = computed(() => {
  let filtered = store.filteredStations;
  
  // Apply favorites filter if selected
  if (store.filterType === 'favorites') {
    filtered = favoritesStore.getFavoriteStations(filtered);
  }
  
  return filtered;
});

const filteredStationsForMap = computed(() => {
  // Always apply user filters (favorites, available bikes, parking spots) even in map mode
  // The map component will handle geographic filtering on top of these user filters
  return filteredStations.value;
});

const searchTerm = computed({
  get: () => store.searchTerm,
  set: (value) => store.setSearchTerm(value)
});
const selectedArea = computed({
  get: () => store.selectedArea,
  set: (value) => store.setSelectedArea(value)
});
const filterType = computed(() => store.filterType);
const sortBy = computed(() => store.sortBy);
const sortOrder = computed(() => store.sortOrder);

// Methods
function fetchStations() {
  store.fetchStations();
}

function updateSearch() {
  // The v-model already updates the store through the computed property
}

function updateArea() {
  // The v-model already updates the store through the computed property
}

function setFilter(type) {
  store.setFilterType(type);
}

function sort(field) {
  const currentOrder = sortBy.value === field && sortOrder.value === 'asc' ? 'desc' : 'asc';
  store.setSorting(field, currentOrder);
}

function getAvailabilityClass(count) {
  if (count === 0) return 'availability-none';
  if (count <= 4) return 'availability-low';
  return 'availability-good';
}

function formatTime(timeString) {
  if (!timeString) return '無資料';
  try {
    const date = new Date(timeString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return timeString;
  }
}

function goToStation(sno) {
  const station = store.getStationById(sno);
  if (station) {
    store.setCenterFromStation(station); // This will enable radius filter and set 1km radius
    store.setViewMode('map'); // Switch to map view
  }
}

function handleStationSelected(sno) {
  const station = store.getStationById(sno);
  if (station) {
    store.setCenterFromStation(station);
    store.setViewMode('map'); // Switch to map view
  }
}

function resetFilters() {
  store.resetFilters();
}

function formatStationName(name) {
  const prefix = 'YouBike2.0_';
  if (name.startsWith(prefix)) {
    return name.substring(prefix.length);
  }
  return name;
}

function formatAreaName(name) {
  return name.replace('區', '');
}

function getCenterPointDescription() {
  if (store.isAllStationsMode) {
    return '所有站點';
  }
  
  if (!store.currentCenterPoint) return '';
  
  switch (store.centerPointSource) {
    case 'gps':
      return '目前位置';
    case 'station':
      const station = store.getStationById(store.selectedStationId);
      return station ? `選定站點: ${formatStationName(station.sna)}` : '選定站點';
    case 'map':
      return '地圖中心';
    case 'default':
      return '預設位置';
    default:
      return '未知位置';
  }
}

function toggleRadiusFilter() {
  store.toggleRadiusFilter();
}

function getRadiusText() {
  return store.centerPointSource === 'station' ? '1km' : '500m';
}

// Lifecycle
onMounted(async () => {
  fetchStations();
  store.radiusFilterEnabled = false; // Disable radius filter by default
  
  // Initialize center point for radius filtering
  await initializeCenterPoint();
  
  // Auto refresh every 60 seconds
  refreshInterval.value = setInterval(() => {
    if (!store.autoRefreshPaused) {
      fetchStations();
    }
  }, 60000);
});

// Watch for center point changes to update table/card view
watch(() => store.currentCenterPoint, (newCenter, oldCenter) => {
  if (newCenter && oldCenter && 
      (newCenter.lat !== oldCenter.lat || newCenter.lng !== oldCenter.lng)) {
    console.log(`📍 Center point changed from ${store.centerPointSource}, updating table/card view`);
    // The filteredStations computed property will automatically re-evaluate
    // due to the reactive dependency on store.currentCenterPoint
  }
}, { deep: true });

// Watch for radius filter toggle
watch(() => store.radiusFilterEnabled, (enabled) => {
  console.log(`🎯 Radius filter ${enabled ? 'enabled' : 'disabled'}, updating view`);
});

// Initialize center point for radius filtering
async function initializeCenterPoint() {
  try {
    // Try to get user location first
    const GoogleMapsService = (await import('@/services/GoogleMapsService')).default;
    const userLocation = await GoogleMapsService.getCurrentLocation();
    store.setCenterFromUserLocation(userLocation);
    console.log('📍 User location obtained for radius filtering:', userLocation);
  } catch (error) {
    console.log('📍 User location not available, using default center for radius filtering');
    store.initializeDefaultCenter();
  }
}

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<style scoped>
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #6c757d;
  font-size: 16px;
}

.controls {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.controls-row {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 15px;
}

.controls-row:last-child {
  margin-bottom: 0;
}

.search-box {
  flex: 2;
  min-width: 120px;
}

.search-box input {
  width: 90%;
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  transition-property: border-color;
  transition-duration: 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: #007bff;
}

.area-select select {
  padding: 10px 15px;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  min-width: 120px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: 2px solid;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition-property: all;
  transition-duration: 0.2s;
  transition-timing-function: ease;
  white-space: nowrap;
}

.btn-primary {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.btn-primary.active {
  background-color: #0056b3;
  border-color: #0056b3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.btn-secondary {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.btn.active {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.loading, .error {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.error {
  color: #dc3545;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-item {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.stat-label {
  color: #6c757d;
  font-size: 14px;
}

.stats-toggle {
  text-align: center;
  margin-bottom: 20px;
}

.no-results {
  text-align: center;
  padding: 60px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: #6c757d;
}

/* Table Styles */
.table-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.stations-table {
  width: 100%;
  border-collapse: collapse;
}

.stations-table th {
  background: #f8f9fa;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #495057;
  border-bottom: 2px solid #dee2e6;
}

.stations-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.stations-table th.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  margin-left: 5px;
  font-size: 12px;
}

.stations-table td {
  padding: 15px;
  border-bottom: 1px solid #dee2e6;
}

.station-row {
  cursor: pointer;
  transition-property: background-color;
  transition-duration: 0.2s;
}

.station-row:hover {
  background: #f8f9fa;
}

.station-name .name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 4px;
}

.status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-inactive {
  background: #f8d7da;
  color: #721c24;
}

.availability-number {
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 16px;
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

.favorites-cell {
  text-align: center;
  width: 60px;
}

.station-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Location Indicator Styles */
.location-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  font-size: 12px;
}

.location-info {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #495057;
}

.location-icon {
  font-size: 14px;
}

.location-text {
  font-weight: 500;
}

.radius-toggle {
  padding: 4px 8px;
  font-size: 11px;
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.radius-toggle:hover {
  background: #5a6268;
  border-color: #5a6268;
}

.radius-toggle.active {
  background: #28a745;
  border-color: #28a745;
}

.radius-toggle.active:hover {
  background: #218838;
  border-color: #218838;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 12px;
}

/* Card Styles */
.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.station-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  cursor: pointer;
  transition-property: all;
  transition-duration: 0.2s;
  transition-timing-function: ease;
}

.station-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.station-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.station-card .station-name {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
}

.station-id {
  font-size: 12px;
  color: #6c757d;
}

.station-info {
  display: flex;
  justify-content: space-between;
  margin: 20px 0;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-item {
  text-align: center;
}

.info-number {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
  padding: 8px 12px;
  border-radius: 6px;
}

.info-label {
  font-size: 12px;
  color: #6c757d;
  font-weight: 500;
}

.station-details {
  font-size: 14px;
  line-height: 1.6;
  color: #495057;
}

.station-details div {
  margin-bottom: 4px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 15px;
  }
  
  .controls-row {
    flex-direction: column;
    align-items: stretch;
    gap: 10px; /* Adjust gap for better spacing in mobile */
  }
  
  .search-box {
    min-width: auto; /* Allow content to dictate width */
    width: 100%; /* Take full width */
  }
  
  .area-select {
    width: 100%; /* Make area select full width */
  }

  .area-select select {
    width: 100%; /* Make area select dropdown full width */
  }
  
  .filter-buttons {
    justify-content: center;
  }
  
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .stations-table th,
  .stations-table td {
    padding: 10px 8px;
    font-size: 14px;
  }
  
  .stations-grid {
    grid-template-columns: 1fr;
  }
  
  .station-card {
    padding: 15px;
  }
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
