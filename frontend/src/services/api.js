import axios from 'axios';

// VITE_API_BASE_URL is injected at Docker build time.
// Falls back to relative /api so it works behind the ALB without hardcoding a domain.
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';


const apiClient = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },  
    timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

const api = {
  /**
   * Create a new short URL
   */
  createShortUrl: async (longUrl, customCode = null, expiresIn = null) => {
    return apiClient.post('/urls', {
      longUrl,
      customCode,
      expiresIn
    });
  },

/**
   * Get all URLs
   */
  getAllUrls: async (limit = 50, offset = 0) => {
    return apiClient.get('/urls', {
      params: { limit, offset }
    });
  },

  /**
   * Get analytics for a short URL
   */
  getAnalytics: async (shortCode) => {
    return apiClient.get(`/urls/${shortCode}/analytics`);
  },

  /**
   * Delete a short URL
   */
  deleteUrl: async (shortCode) => {
    return apiClient.delete(`/urls/${shortCode}`);
  }
};

export default api;
