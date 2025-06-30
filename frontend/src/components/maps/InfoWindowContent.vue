<template>
  <div class="info-window-content">
    <h4 class="station-name">{{ formatStationName(station.sna) }}</h4>
    <p class="station-address">{{ station.ar }}</p>
    <div class="availability-info">
      <span title="可借車輛">🚴 {{ station.available_rent_bikes }}</span>
      <span title="可停車位">🅿️ {{ station.available_return_bikes }}</span>
    </div>
    <div class="action-buttons">
      <button class="info-window-btn" @click="emitDirections">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        <span class="button-text">路線</span>
      </button>
      <button class="info-window-btn" @click="emitStreetView">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        <span class="button-text">街景</span>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  station: {
    type: Object,
    required: true
  },
  isMapView: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['get-directions', 'toggle-street-view']);

const formatStationName = (name) => {
  const prefix = 'YouBike2.0_';
  if (name.startsWith(prefix)) {
    return name.substring(prefix.length);
  }
  return name;
};

const emitDirections = () => {
  emit('get-directions', props.station.sno);
};

const emitStreetView = () => {
  emit('toggle-street-view', props.station.sno);
};

</script>

<style scoped>
.info-window-content {
  padding: 10px;
  max-width: 200px;
}

.station-name {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 14px;
}

.station-address {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #6c757d;
}

.availability-info {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.action-buttons {
  margin-top: 10px;
  display: flex;
  gap: 5px;
}

.info-window-btn {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 3px;
  transition-property: background;
  transition-duration: 0.2s;
}

.info-window-btn:hover {
  background: #0056b3;
}

@media (max-width: 480px) {
  .info-window-btn .button-text {
    display: none;
  }
  .info-window-btn {
    padding: 5px; /* Adjust padding for icon-only buttons */
  }
}
</style>
