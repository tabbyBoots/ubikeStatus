import axios from 'axios';

// Use relative path for API requests
const apiClient = axios.create({
  // src/api/ubike.js
  baseURL: 'http://localhost:5001/api/ubike', // Updated to match backend HTTP port
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
