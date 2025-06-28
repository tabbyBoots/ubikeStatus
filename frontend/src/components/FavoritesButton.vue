<template>
  <button 
    @click.stop="toggleFavorite"
    class="favorites-btn"
    :class="{ 'is-favorite': isFavorite }"
    :title="isFavorite ? '從我的最愛移除' : '加入我的最愛'"
  >
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        :fill="isFavorite ? '#e74c3c' : 'none'"
        :stroke="isFavorite ? '#e74c3c' : '#6c757d'"
        stroke-width="2"
      />
    </svg>
  </button>
</template>

<script setup>
import { computed } from 'vue';
import { useFavoritesStore } from '@/stores/favorites';

const props = defineProps({
  stationId: {
    type: String,
    required: true
  }
});

const favoritesStore = useFavoritesStore();

const isFavorite = computed(() => favoritesStore.isFavorite(props.stationId));

function toggleFavorite() {
  favoritesStore.toggleFavorite(props.stationId);
}
</script>

<style scoped>
.favorites-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* transition-property: all; */
  /* transition-duration: 0.2s; */
  /* transition-timing-function: ease; */
  width: 32px;
  height: 32px;
}

.favorites-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  transform: scale(1.1);
}

.favorites-btn.is-favorite:hover {
  background: rgba(231, 76, 60, 0.1);
}

.favorites-btn svg {
  /* transition-property: all; */
  /* transition-duration: 0.2s; */
  /* transition-timing-function: ease; */
}

.favorites-btn:hover svg {
  transform: scale(1.1);
}

.favorites-btn.is-favorite svg {
  filter: drop-shadow(0 2px 4px rgba(231, 76, 60, 0.3));
}
</style>
