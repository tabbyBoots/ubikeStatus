import { defineStore } from 'pinia';

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    favoriteStations: JSON.parse(localStorage.getItem('uBikeFavorites') || '[]'),
  }),

  getters: {
    isFavorite: (state) => (stationId) => {
      return state.favoriteStations.includes(stationId);
    },
    
    favoriteCount: (state) => state.favoriteStations.length,
    
    getFavoriteStations: (state) => (allStations) => {
      return allStations.filter(station => 
        state.favoriteStations.includes(station.sno)
      );
    }
  },

  actions: {
    toggleFavorite(stationId) {
      const index = this.favoriteStations.indexOf(stationId);
      
      if (index > -1) {
        // Remove from favorites
        this.favoriteStations.splice(index, 1);
      } else {
        // Add to favorites
        this.favoriteStations.push(stationId);
      }
      
      // Save to localStorage
      this.saveFavorites();
    },

    addFavorite(stationId) {
      if (!this.favoriteStations.includes(stationId)) {
        this.favoriteStations.push(stationId);
        this.saveFavorites();
      }
    },

    removeFavorite(stationId) {
      const index = this.favoriteStations.indexOf(stationId);
      if (index > -1) {
        this.favoriteStations.splice(index, 1);
        this.saveFavorites();
      }
    },

    clearAllFavorites() {
      this.favoriteStations = [];
      this.saveFavorites();
    },

    saveFavorites() {
      localStorage.setItem('uBikeFavorites', JSON.stringify(this.favoriteStations));
    },

    loadFavorites() {
      const saved = localStorage.getItem('uBikeFavorites');
      if (saved) {
        this.favoriteStations = JSON.parse(saved);
      }
    },

    exportFavorites() {
      const data = {
        favorites: this.favoriteStations,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ubike-favorites-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },

    async importFavorites(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target.result);
            
            if (data.favorites && Array.isArray(data.favorites)) {
              // Merge with existing favorites (avoid duplicates)
              const newFavorites = [...new Set([...this.favoriteStations, ...data.favorites])];
              this.favoriteStations = newFavorites;
              this.saveFavorites();
              resolve(data.favorites.length);
            } else {
              reject(new Error('Invalid favorites file format'));
            }
          } catch (error) {
            reject(new Error('Failed to parse favorites file'));
          }
        };
        
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        
        reader.readAsText(file);
      });
    }
  }
});
