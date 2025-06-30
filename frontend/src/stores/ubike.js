import { defineStore } from 'pinia';
import ubikeApi from '../api/ubike';

const TAIPEI_CITY_HALL_LOCATION = { lat: 25.033964, lng: 121.564576 };
const RADIUS_500M = 500; // 500 meters for general use
const RADIUS_1KM = 1000; // 1000 meters for station-centered views

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
}

export const useUbikeStore = defineStore('ubike', {
    state: () => ({
        stations: [],
        isLoading: false,
        error: null,
        selectedArea: '',
        viewMode: localStorage.getItem('ubikeViewMode') || 'table',
        searchTerm: '',
        filterType: 'all',
        sortBy: 'sna',
        sortOrder: 'asc',
        selectedStation: null,
        selectedStationId: null, // Track selected station ID
        showMapModal: false,
        autoRefreshPaused: false,
        activeModals: new Set(),
        // New center point tracking
        currentCenterPoint: null,
        centerPointSource: 'default', // 'gps', 'station', 'map', 'default'
        radiusFilterEnabled: false, // Default to false for "All Stations" mode
        userLocationAvailable: false
    }),
    getters: {
        areas: (state) => [...new Set(state.stations.map(s => s.sarea))].sort(),
        filteredStations: (state) => {
            console.log('Computing filteredStations. View mode:', state.viewMode, 'Radius filter enabled:', state.radiusFilterEnabled, 'Center point source:', state.centerPointSource);
            let filtered = [...state.stations];

            // Area filter
            if (state.selectedArea) {
                filtered = filtered.filter(s => s.sarea === state.selectedArea);
            }

            // Search filter
            if (state.searchTerm) {
                const term = state.searchTerm.toLowerCase();
                filtered = filtered.filter(station => 
                    station.sna.toLowerCase().includes(term) ||
                    station.ar.toLowerCase().includes(term) ||
                    (station.snaen && station.snaen.toLowerCase().includes(term))
                );
            }

            // Type filter
            switch (state.filterType) {
                case 'available':
                    filtered = filtered.filter(station => station.available_rent_bikes > 0 && station.act === 1);
                    break;
                case 'parking':
                    filtered = filtered.filter(station => station.available_return_bikes > 0 && station.act === 1);
                    break;
                case 'favorites':
                    // This will be handled by the component using favorites store
                    break;
                default:
                    break;
            }

            // Radius filter
            if (state.radiusFilterEnabled && state.currentCenterPoint) {
                const radius = state.centerPointSource === 'station' ? RADIUS_1KM : RADIUS_500M;
                filtered = filtered.filter(station => {
                    if (!station.latitude || !station.longitude) return false;
                    
                    const distance = calculateDistance(
                        state.currentCenterPoint.lat,
                        state.currentCenterPoint.lng,
                        parseFloat(station.latitude),
                        parseFloat(station.longitude)
                    );
                    
                    return distance <= radius;
                });
            }

            // Sorting
            filtered.sort((a, b) => {
                let aVal = a[state.sortBy];
                let bVal = b[state.sortBy];
                
                // Handle numeric sorting
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return state.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
                }
                
                // Handle string sorting
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
                
                if (state.sortOrder === 'asc') {
                    return aVal.localeCompare(bVal);
                } else {
                    return bVal.localeCompare(aVal);
                }
            });

            return filtered;
        },
        stats: (state) => ({
            totalStations: state.stations.length,
            activeStations: state.stations.filter(s => s.act === 1).length,
            totalBikes: state.stations.reduce((sum, s) => sum + s.available_rent_bikes, 0),
            totalSlots: state.stations.reduce((sum, s) => sum + s.available_return_bikes, 0)
        }),
        // New getter to check if we're in "All Stations" mode
        isAllStationsMode: (state) => {
            return !state.searchTerm && 
                   !state.selectedArea && 
                   state.filterType === 'all' && 
                   state.centerPointSource !== 'station';
        },
        // Get current radius based on center source
        currentRadius: (state) => {
            return state.centerPointSource === 'station' ? RADIUS_1KM : RADIUS_500M;
        }
    },
    actions: {
        async fetchStations() {
            this.isLoading = true;
            this.error = null;
            try {
                const response = await ubikeApi.getStations();
                // Ensure we always have an array, even if API returns unexpected data
                this.stations = Array.isArray(response.data) ? response.data : [];
                console.log(`📊 Loaded ${this.stations.length} stations`);
            } catch (error) {
                console.error('❌ Failed to fetch stations:', error);
                this.error = error;
                this.stations = []; // Ensure stations is always an array
            } finally {
                this.isLoading = false;
            }
        },
        setSelectedArea(area) {
            this.selectedArea = area;
        },
        setViewMode(mode) {
            // When switching away from map mode, reset to "All Stations" mode
            if (this.viewMode === 'map' && mode !== 'map') {
                this.resetToAllStations();
            }
            this.viewMode = mode;
            localStorage.setItem('ubikeViewMode', mode);
        },
        setSearchTerm(term) {
            this.searchTerm = term;
        },
        setFilterType(type) {
            this.filterType = type;
        },
        setSorting(sortBy, sortOrder) {
            this.sortBy = sortBy;
            this.sortOrder = sortOrder;
        },
        showStationMap(station) {
            this.selectedStation = station;
            this.setCenterFromStation(station);
            this.setViewMode('map');
        },
        hideStationMap() {
            this.showMapModal = false;
            this.selectedStation = null;
        },
        getStationById(sno) {
            return this.stations.find(station => station.sno === sno);
        },
        resetFilters() {
            this.searchTerm = '';
            this.selectedArea = '';
            this.filterType = 'all';
        },
        pauseAutoRefresh(reason) {
            this.activeModals.add(reason);
            this.autoRefreshPaused = this.activeModals.size > 0;
            console.log(`🔄 Auto-refresh paused: ${reason}. Active modals:`, Array.from(this.activeModals));
        },
        resumeAutoRefresh(reason) {
            this.activeModals.delete(reason);
            this.autoRefreshPaused = this.activeModals.size > 0;
            console.log(`🔄 Auto-refresh ${this.autoRefreshPaused ? 'still paused' : 'resumed'}. Removed: ${reason}. Active modals:`, Array.from(this.activeModals));
        },
        // Center point management actions
        setCenterPoint(location, source = 'unknown') {
            this.currentCenterPoint = location;
            this.centerPointSource = source;
            console.log(`📍 Center point updated to ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)} (source: ${source})`);
        },
        setCenterFromUserLocation(location) {
            this.setCenterPoint(location, 'gps');
            this.userLocationAvailable = true;
        },
        setCenterFromStation(station) {
            if (station && station.latitude && station.longitude) {
                const location = {
                    lat: parseFloat(station.latitude),
                    lng: parseFloat(station.longitude)
                };
                this.setCenterPoint(location, 'station');
                this.selectedStationId = station.sno;
                this.radiusFilterEnabled = true; // Enable radius filtering for station-centered view
            }
        },
        setCenterFromMap(location) {
            this.setCenterPoint(location, 'map');
        },
        initializeDefaultCenter() {
            if (!this.currentCenterPoint) {
                this.setCenterPoint(TAIPEI_CITY_HALL_LOCATION, 'default');
            }
        },
        toggleRadiusFilter() {
            this.radiusFilterEnabled = !this.radiusFilterEnabled;
            console.log(`🎯 Radius filter ${this.radiusFilterEnabled ? 'enabled' : 'disabled'}`);
        },
        // Reset to "All Stations" mode
        resetToAllStations() {
            this.currentCenterPoint = null;
            this.centerPointSource = 'default';
            this.radiusFilterEnabled = false;
            this.selectedStationId = null;
            this.selectedStation = null;
            console.log('📍 Reset to "All Stations" mode');
        }
    }
});
