import axios from 'axios';

// Use relative path for API requests
const apiClient = axios.create({
  // Use relative path for production Docker deployment, fallback to dev endpoint
  baseURL: process.env.NODE_ENV === 'production' ? '/api/ubike' : 'https://localhost:7135/api/ubike',
  withCredentials: false,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  }
});

export default {
  getStations() {
    return apiClient.get('/');
  },
  getStationsByArea(area) {
    return apiClient.get(`/area/${area}`);
  }
};
