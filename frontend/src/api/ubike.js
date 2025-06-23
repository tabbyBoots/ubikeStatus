import axios from 'axios';

// Use relative path for API requests
const apiClient = axios.create({
  // src/api/ubike.js
  baseURL: 'https://localhost:7135/api/ubike', // Updated to current HTTPS port
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
