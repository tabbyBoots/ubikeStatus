<template>
  <div v-if="visible" class="street-view-modal-overlay" @click.self="closeModal">
    <div class="street-view-modal-content">
      <button class="close-button" @click="closeModal">&times;</button>
      <div ref="streetViewPanorama" class="street-view-panorama"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import GoogleMapsService from '@/services/GoogleMapsService';
import { useUbikeStore } from '@/stores/ubike';

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  station: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

const ubikeStore = useUbikeStore();
const streetViewPanorama = ref(null);

watch(() => props.visible, (newValue) => {
  if (newValue && props.station) {
    // Pause auto-refresh when street view opens
    ubikeStore.pauseAutoRefresh('streetViewModal');
    nextTick(() => {
      initializeStreetView();
    });
  } else {
    // Resume auto-refresh when street view closes
    ubikeStore.resumeAutoRefresh('streetViewModal');
  }
});

async function initializeStreetView() {
  if (!props.station || !streetViewPanorama.value) return;

  try {
    const location = {
      lat: parseFloat(props.station.latitude),
      lng: parseFloat(props.station.longitude)
    };
    await GoogleMapsService.createStreetViewPanorama(streetViewPanorama.value, {
      position: location,
      pov: {
        heading: 34,
        pitch: 10
      },
      visible: true,
      onVisibleChanged: (isVisible) => {
        if (!isVisible) {
          closeModal();
        }
      }
    });
  } catch (error) {
    console.error('Failed to initialize Street View:', error);
  }
}

function closeModal() {
  emit('close');
}
</script>

<style scoped>
.street-view-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.street-view-modal-content {
  position: relative;
  width: 80%;
  height: 80%;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
}

.street-view-panorama {
  width: 100%;
  height: 100%;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 20px;
  cursor: pointer;
  z-index: 1001;
}
</style>
