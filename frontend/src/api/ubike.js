import axios from 'axios';

// Use consistent API URL for all environments
const baseURL = '/api/ubike';

console.log(` API Base URL: ${baseURL}`);

const apiClient = axios.create({
  baseURL,
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
