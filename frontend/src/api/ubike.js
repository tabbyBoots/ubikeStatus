import axios from 'axios';

// Environment-based API configuration
// Development: Use Vite proxy (/api)
// Production: Use direct backend API (/api/ubike)
const isDevelopment = import.meta.env.DEV || 
                     (window.location.hostname === 'localhost' && 
                      window.location.port !== '8080' && 
                      window.location.port !== '8443');

const baseURL = isDevelopment ? '/api' : '/api/ubike';

console.log(`🔧 API Environment: ${isDevelopment ? 'Development' : 'Production'}`);
console.log(`🔗 API Base URL: ${baseURL}`);

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
