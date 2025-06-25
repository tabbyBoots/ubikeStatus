import { defineStore } from 'pinia';
import uBikeApi from '../api/ubike';

export const useUbikeStore = defineStore('ubike', {
    state: () => ({
        stations: [],
        isLoading: false,
        error: null,
        selectedArea: null,
        viewMode: localStorage.getItem('ubikeViewMode') || 'table',
        searchTerm: '',
        filterType: 'all',
        sortBy: 'sna',
        sortOrder: 'asc',
        selectedStation: null,
        showMapModal: false
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
                const response = await uBikeApi.getStations();
                this.stations = response.data;
            } catch (error) {
                this.error = error;
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
            console.log('🏪 Store: showStationMap called with station:', station.sna);
            this.selectedStation = station;
            this.showMapModal = true;
            console.log('🏪 Store: showMapModal set to:', this.showMapModal);
            console.log('🏪 Store: selectedStation set to:', this.selectedStation?.sna);
        },
        hideStationMap() {
            console.log('🏪 Store: hideStationMap called');
            this.showMapModal = false;
            this.selectedStation = null;
            console.log('🏪 Store: showMapModal set to:', this.showMapModal);
        },
        getStationById(sno) {
            return this.stations.find(station => station.sno === sno);
        }
    }
});
