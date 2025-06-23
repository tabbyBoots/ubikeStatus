<template>
  <div class="container">
    <div class="header">
      <button @click="goBack" class="btn btn-secondary back-btn">← 返回列表</button>
      <h1>🚴 站點詳細資訊</h1>
    </div>

    <div v-if="loading" class="loading">
      <div>載入中...</div>
    </div>

    <div v-if="error" class="error">
      <strong>錯誤：</strong>{{ error }}
      <button @click="fetchStation" class="btn btn-primary" style="margin-left: 10px;">重新載入</button>
    </div>

    <div v-if="!loading && !error && station" class="station-detail">
      <div class="detail-card">
        <div class="card-header">
          <div class="station-title">
            <h2>{{ station.sna }}</h2>
            <div class="station-subtitle">
              <span class="station-id">站點編號：{{ station.sno }}</span>
              <span class="station-status" :class="station.act === 1 ? 'status-active' : 'status-inactive'">
                {{ station.act === 1 ? '🟢 運作中' : '🔴 暫停服務' }}
              </span>
            </div>
          </div>
        </div>

        <div class="availability-section">
          <h3>即時狀態</h3>
          <div class="availability-grid">
            <div class="availability-item bikes">
              <div class="availability-icon">🚴</div>
              <div class="availability-info">
                <div class="availability-number">{{ station.available_rent_bikes }}</div>
                <div class="availability-label">可借車輛</div>
              </div>
            </div>
            <div class="availability-item slots">
              <div class="availability-icon">🅿️</div>
              <div class="availability-info">
                <div class="availability-number">{{ station.available_return_bikes }}</div>
                <div class="availability-label">可停車位</div>
              </div>
            </div>
            <div class="availability-item total">
              <div class="availability-icon">📊</div>
              <div class="availability-info">
                <div class="availability-number">{{ station.total }}</div>
                <div class="availability-label">總車位數</div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h3>站點資訊</h3>
          <div class="info-grid">
            <div class="info-row">
              <span class="info-label">中文名稱：</span>
              <span class="info-value">{{ station.sna }}</span>
            </div>
            <div class="info-row" v-if="station.snaen">
              <span class="info-label">英文名稱：</span>
              <span class="info-value">{{ station.snaen }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">所在區域：</span>
              <span class="info-value">{{ station.sarea }}{{ station.sareaen ? ` (${station.sareaen})` : '' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">地址：</span>
              <span class="info-value">{{ station.ar }}</span>
            </div>
            <div class="info-row" v-if="station.aren">
              <span class="info-label">英文地址：</span>
              <span class="info-value">{{ station.aren }}</span>
            </div>
          </div>
        </div>

        <div class="location-section">
          <h3>位置資訊</h3>
          <div class="location-grid">
            <div class="location-item">
              <span class="location-label">緯度：</span>
              <span class="location-value">{{ station.latitude }}</span>
            </div>
            <div class="location-item">
              <span class="location-label">經度：</span>
              <span class="location-value">{{ station.longitude }}</span>
            </div>
          </div>
          <div class="map-actions">
            <button @click="openGoogleMaps" class="btn btn-primary">
              📍 在 Google Maps 中開啟
            </button>
            <button @click="copyCoordinates" class="btn btn-secondary">
              📋 複製座標
            </button>
          </div>
        </div>

        <div class="update-section">
          <h3>更新時間</h3>
          <div class="update-grid">
            <div class="update-item" v-if="station.mday">
              <span class="update-label">資料更新：</span>
              <span class="update-value">{{ formatTime(station.mday) }}</span>
            </div>
            <div class="update-item" v-if="station.srcUpdateTime">
              <span class="update-label">系統更新：</span>
              <span class="update-value">{{ formatTime(station.srcUpdateTime) }}</span>
            </div>
            <div class="update-item" v-if="station.updateTime">
              <span class="update-label">平台更新：</span>
              <span class="update-value">{{ formatTime(station.updateTime) }}</span>
            </div>
            <div class="update-item" v-if="station.infoTime">
              <span class="update-label">場站更新：</span>
              <span class="update-value">{{ formatTime(station.infoTime) }}</span>
            </div>
          </div>
        </div>

        <div class="actions-section">
          <button @click="fetchStation" class="btn btn-primary">
            🔄 重新整理
          </button>
          <button @click="goBack" class="btn btn-secondary">
            ← 返回列表
          </button>
        </div>
      </div>
    </div>

    <div v-if="!loading && !error && !station" class="no-results">
      <h3>找不到該站點</h3>
      <p>站點編號 {{ sno }} 不存在</p>
      <button @click="goBack" class="btn btn-primary">返回列表</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'StationDetail',
  props: {
    sno: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      station: null,
      loading: true,
      error: null,
      refreshInterval: null
    }
  },
  mounted() {
    this.fetchStation()
    // 每15秒自動更新資料
    this.refreshInterval = setInterval(() => {
      this.fetchStation()
    }, 15000)
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  },
  methods: {
    async fetchStation() {
      try {
        this.loading = true
        this.error = null
        
        const response = await axios.get(`/api/ubike/${this.sno}`)
        this.station = response.data
      } catch (err) {
        if (err.response && err.response.status === 404) {
          this.error = '找不到該站點'
        } else {
          this.error = '無法載入站點資料，請稍後再試'
        }
        console.error('Error fetching station:', err)
      } finally {
        this.loading = false
      }
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
          minute: '2-digit',
          second: '2-digit'
        })
      } catch {
        return timeString
      }
    },
    openGoogleMaps() {
      if (this.station && this.station.latitude && this.station.longitude) {
        const url = `https://www.google.com/maps?q=${this.station.latitude},${this.station.longitude}`
        window.open(url, '_blank')
      }
    },
    copyCoordinates() {
      if (this.station && this.station.latitude && this.station.longitude) {
        const coordinates = `${this.station.latitude}, ${this.station.longitude}`
        navigator.clipboard.writeText(coordinates).then(() => {
          alert('座標已複製到剪貼簿')
        }).catch(() => {
          alert(`座標：${coordinates}`)
        })
      }
    },
    goBack() {
      this.$router.push('/')
    }
  }
}
</script>

<style scoped>
.back-btn {
  margin-bottom: 20px;
}

.station-detail {
  max-width: 800px;
  margin: 0 auto;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
}

.card-header {
  margin-bottom: 30px;
}

.station-title h2 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 10px;
}

.station-subtitle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.station-id {
  color: #6c757d;
  font-size: 1rem;
}

.station-status {
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 500;
  font-size: 0.9rem;
}

.availability-section,
.info-section,
.location-section,
.update-section {
  margin-bottom: 30px;
}

.availability-section h3,
.info-section h3,
.location-section h3,
.update-section h3 {
  color: #333;
  margin-bottom: 15px;
  font-size: 1.3rem;
  border-bottom: 2px solid #667eea;
  padding-bottom: 5px;
}

.availability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.availability-item {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 10px;
  transition: transform 0.3s;
}

.availability-item:hover {
  transform: translateY(-3px);
}

.availability-item.bikes {
  background: linear-gradient(135deg, #d4edda, #c3e6cb);
}

.availability-item.slots {
  background: linear-gradient(135deg, #cce5ff, #b3d9ff);
}

.availability-item.total {
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
}

.availability-icon {
  font-size: 2.5rem;
  margin-right: 15px;
}

.availability-number {
  font-size: 2rem;
  font-weight: bold;
  color: #333;
}

.availability-label {
  color: #6c757d;
  font-weight: 500;
}

.info-grid,
.update-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row,
.update-item {
  display: flex;
  padding: 10px;
  background: #f8f9fa;
  border-radius: 6px;
}

.info-label,
.update-label {
  font-weight: 600;
  color: #495057;
  min-width: 120px;
}

.info-value,
.update-value {
  color: #333;
  flex: 1;
}

.location-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
}

.location-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.location-label {
  font-weight: 600;
  color: #495057;
  margin-right: 10px;
}

.location-value {
  color: #333;
  font-family: monospace;
}

.map-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.actions-section {
  display: flex;
  gap: 15px;
  justify-content: center;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

@media (max-width: 768px) {
  .detail-card {
    padding: 20px;
  }
  
  .station-title h2 {
    font-size: 1.5rem;
  }
  
  .station-subtitle {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .availability-grid {
    grid-template-columns: 1fr;
  }
  
  .location-grid {
    grid-template-columns: 1fr;
  }
  
  .map-actions,
  .actions-section {
    flex-direction: column;
  }
}
</style>