<template>
  <div class="container">
    <div class="header">
      <h1>🚴 uBike 即時狀態查詢</h1>
      <p>查詢台北市 uBike 2.0 即時租借狀況</p>
    </div>

    <div class="controls">
      <div class="search-box">
        <input 
          v-model="searchTerm" 
          type="text" 
          placeholder="搜尋站點名稱或地址..."
          @input="filterStations"
        />
      </div>
      
      <div class="area-select">
        <select v-model="selectedArea" @change="filterStations">
          <option value="">所有區域</option>
          <option v-for="area in areas" :key="area" :value="area">{{ area }}</option>
        </select>
      </div>
      
      <div class="filter-buttons">
        <button 
          class="btn btn-primary" 
          :class="{ active: filterType === 'all' }"
          @click="setFilter('all')"
        >
          全部站點
        </button>
        <button 
          class="btn btn-secondary" 
          :class="{ active: filterType === 'available' }"
          @click="setFilter('available')"
        >
          有車可借
        </button>
        <button 
          class="btn btn-secondary" 
          :class="{ active: filterType === 'parking' }"
          @click="setFilter('parking')"
        >
          有位可停
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <div>載入中...</div>
    </div>

    <div v-if="error" class="error">
      <strong>錯誤：</strong>{{ error }}
      <button @click="fetchStations" class="btn btn-primary" style="margin-left: 10px;">重新載入</button>
    </div>

    <div v-if="!loading && !error" class="stats">
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

    <div v-if="!loading && !error && filteredStations.length > 0" class="stations-grid">
      <div 
        v-for="station in filteredStations" 
        :key="station.sno" 
        class="station-card"
        @click="goToStation(station.sno)"
      >
        <div class="station-header">
          <div>
            <div class="station-name">{{ station.sna }}</div>
            <div class="station-id">站點編號：{{ station.sno }}</div>
          </div>
          <div class="station-status" :class="station.act === 1 ? 'status-active' : 'status-inactive'">
            {{ station.act === 1 ? '運作中' : '暫停服務' }}
          </div>
        </div>

        <div class="station-info">
          <div class="info-item">
            <div class="info-number bikes-available">{{ station.available_rent_bikes }}</div>
            <div class="info-label">可借車輛</div>
          </div>
          <div class="info-item">
            <div class="info-number slots-available">{{ station.available_return_bikes }}</div>
            <div class="info-label">可停車位</div>
          </div>
        </div>

        <div class="station-details">
          <div><strong>區域：</strong>{{ station.sarea }}</div>
          <div><strong>地址：</strong>{{ station.ar }}</div>
          <div><strong>總車位：</strong>{{ station.total }}</div>
          <div><strong>更新時間：</strong>{{ formatTime(station.mday) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'StationsList',
  data() {
    return {
      stations: [],
      filteredStations: [],
      loading: true,
      error: null,
      searchTerm: '',
      selectedArea: '',
      filterType: 'all',
      refreshInterval: null
    }
  },
  computed: {
    areas() {
      const areas = [...new Set(this.stations.map(station => station.sarea))].sort()
      return areas
    },
    stats() {
      return {
        totalStations: this.stations.length,
        activeStations: this.stations.filter(s => s.act === 1).length,
        totalBikes: this.stations.reduce((sum, s) => sum + s.available_rent_bikes, 0),
        totalSlots: this.stations.reduce((sum, s) => sum + s.available_return_bikes, 0)
      }
    }
  },
  mounted() {
    this.fetchStations()
    // 每30秒自動更新資料
    this.refreshInterval = setInterval(() => {
      this.fetchStations()
    }, 30000)
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },
  methods: {
    async fetchStations() {
      try {
        this.loading = true
        this.error = null
        
        // 直接呼叫 API 或通過後端代理
        const response = await axios.get('/api/ubike')
        this.stations = response.data
        this.filterStations()
      } catch (err) {
        this.error = '無法載入站點資料，請稍後再試'
        console.error('Error fetching stations:', err)
      } finally {
        this.loading = false
      }
    },
    filterStations() {
      let filtered = [...this.stations]

      // 區域篩選
      if (this.selectedArea) {
        filtered = filtered.filter(station => station.sarea === this.selectedArea)
      }

      // 搜尋篩選
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase()
        filtered = filtered.filter(station => 
          station.sna.toLowerCase().includes(term) ||
          station.ar.toLowerCase().includes(term) ||
          station.snaen.toLowerCase().includes(term)
        )
      }

      // 類型篩選
      switch (this.filterType) {
        case 'available':
          filtered = filtered.filter(station => station.available_rent_bikes > 0 && station.act === 1)
          break
        case 'parking':
          filtered = filtered.filter(station => station.available_return_bikes > 0 && station.act === 1)
          break
        default:
          // 顯示所有站點
          break
      }

      this.filteredStations = filtered
    },
    setFilter(type) {
      this.filterType = type
      this.filterStations()
    },
    formatTime(timeString) {
      if (!timeString) return '無資料'
      try {
        const date = new Date(timeString)
        return date.toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      } catch {
        return timeString
      }
    },
    goToStation(sno) {
      this.$router.push(`/station/${sno}`)
    }
  }
}
</script>

<style scoped>
.station-card {
  cursor: pointer;
}

.btn.active {
  background: #495057 !important;
  transform: translateY(-1px);
}
</style>