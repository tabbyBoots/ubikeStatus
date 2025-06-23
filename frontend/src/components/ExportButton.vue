<template>
  <div class="export-container">
    <button 
      class="export-btn primary"
      @click="exportFiltered"
      :disabled="filteredStations.length === 0"
      title="匯出目前篩選結果"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
      匯出篩選結果 ({{ filteredStations.length }})
    </button>
    
    <button 
      class="export-btn secondary"
      @click="exportAll"
      :disabled="allStations.length === 0"
      title="匯出所有站點資料"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      </svg>
      匯出全部 ({{ allStations.length }})
    </button>
  </div>
</template>

<script setup>
import { useUbikeStore } from '@/stores/ubike';
import { computed } from 'vue';

const store = useUbikeStore();

const filteredStations = computed(() => store.filteredStations);
const allStations = computed(() => store.stations);

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

function generateCSV(stations) {
  const headers = [
    '站點名稱',
    '區域',
    '地址',
    '可借車輛',
    '可停車位',
    '總車位',
    '狀態',
    '更新時間'
  ];

  const rows = stations.map(station => [
    `"${station.sna}"`,
    `"${station.sarea}"`,
    `"${station.ar}"`,
    station.available_rent_bikes,
    station.available_return_bikes,
    station.total,
    station.act === 1 ? '運作中' : '暫停服務',
    `"${formatTime(station.mday)}"`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
}

function downloadCSV(content, filename) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function exportFiltered() {
  if (filteredStations.value.length === 0) return;
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `ubike-stations-filtered-${timestamp}.csv`;
  const csvContent = generateCSV(filteredStations.value);
  
  downloadCSV(csvContent, filename);
}

function exportAll() {
  if (allStations.value.length === 0) return;
  
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `ubike-stations-all-${timestamp}.csv`;
  const csvContent = generateCSV(allStations.value);
  
  downloadCSV(csvContent, filename);
}
</script>

<style scoped>
.export-container {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-btn.primary {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.export-btn.primary:hover:not(:disabled) {
  background: #218838;
  border-color: #1e7e34;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);
}

.export-btn.secondary {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.export-btn.secondary:hover:not(:disabled) {
  background: #5a6268;
  border-color: #545b62;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(108, 117, 125, 0.2);
}

.export-btn svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 768px) {
  .export-container {
    flex-direction: column;
  }
  
  .export-btn {
    padding: 10px 12px;
    font-size: 13px;
    justify-content: center;
  }
  
  .export-btn svg {
    width: 14px;
    height: 14px;
  }
}
</style>
