import { defineStore } from 'pinia';
import ubikeApi from '../api/ubike';

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
        showMapModal: false,
        autoRefreshPaused: false,
        activeModals: new Set()
    }),
    getters: {
        areas: (state) => [...new Set(state.stations.map(s => s.sarea))].sort(),
        filteredStations: (state) => {
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
        })
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
            this.showMapModal = true;
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
        }
    }
});
