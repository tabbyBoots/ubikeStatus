<template>
  <div class="view-toggle">
    <button 
      class="toggle-btn"
      :class="{ active: viewMode === 'table' }"
      @click="setView('table')"
      title="表格檢視"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h10v2H7v-2z"/>
      </svg>
      表格
    </button>
    <button 
      class="toggle-btn"
      :class="{ active: viewMode === 'card' }"
      @click="setView('card')"
      title="卡片檢視"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8-2h8v8h-8v-8zm2 2v4h4v-4h-4z"/>
      </svg>
      卡片
    </button>
  </div>
</template>

<script setup>
import { useUbikeStore } from '@/stores/ubike';
import { computed } from 'vue';

const store = useUbikeStore();

const viewMode = computed(() => store.viewMode);

function setView(mode) {
  store.setViewMode(mode);
}
</script>

<style scoped>
.view-toggle {
  display: flex;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 4px;
  gap: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #e9ecef;
  color: #495057;
}

.toggle-btn.active {
  background: #007bff;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.toggle-btn svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 768px) {
  .toggle-btn {
    padding: 6px 10px;
    font-size: 13px;
  }
  
  .toggle-btn svg {
    width: 14px;
    height: 14px;
  }
}
</style>
