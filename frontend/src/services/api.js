import axios from 'axios';

const API_BASE = ''; // Proxy handles /v1, /health, /metrics

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getStoredApiKey = (appId) => {
  try {
    const keys = JSON.parse(localStorage.getItem('pulsetrack_api_keys') || '{}');
    return keys[appId] || '';
  } catch {
    return '';
  }
};

export const storeApiKey = (appId, apiKey) => {
  try {
    const keys = JSON.parse(localStorage.getItem('pulsetrack_api_keys') || '{}');
    keys[appId] = apiKey;
    localStorage.setItem('pulsetrack_api_keys', JSON.stringify(keys));
  } catch (error) {
    console.error('Error saving API Key:', error);
  }
};

// Automatically intercept requests and attach X-API-Key header if available
apiClient.interceptors.request.use(
  (config) => {
    if (config.url) {
      let appId = null;
      if (config.url.startsWith('/v1/applications/')) {
        const segments = config.url.split('/');
        appId = segments[3];
      }
      if (appId && appId !== 'rotate') {
        const apiKey = getStoredApiKey(appId);
        if (apiKey) {
          config.headers['X-API-Key'] = apiKey;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const fetchHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error fetching health:', error);
    return { status: 'degraded', components: {} };
  }
};

export const fetchApplications = async () => {
  try {
    const response = await apiClient.get('/v1/applications');
    return response.data;
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
};

export const fetchApplicationDetails = async (id) => {
  try {
    const response = await apiClient.get(`/v1/applications/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching app details for ${id}:`, error);
    return null;
  }
};

export const createApplication = async (data) => {
  const response = await apiClient.post('/v1/applications', data);
  const app = response.data;
  if (app && app.id && app.api_key) {
    storeApiKey(app.id, app.api_key);
  }
  return app;
};

export const rotateApiKey = async (id) => {
  const response = await apiClient.post(`/v1/applications/${id}/keys/rotate`);
  const result = response.data;
  if (result && result.api_key) {
    storeApiKey(id, result.api_key);
  }
  return result;
};

export const updateApplication = async (id, data) => {
  const response = await apiClient.patch(`/v1/applications/${id}`, data);
  return response.data;
};

export const fetchMetrics = async (appId, params = {}) => {
  try {
    const response = await apiClient.get(`/v1/applications/${appId}/metrics`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return null;
  }
};

export const ingestEvent = async (apiKey, eventData) => {
  const response = await apiClient.post('/v1/events', eventData, {
    headers: {
      'X-API-Key': apiKey,
    },
  });
  return response.data;
};

export const ingestBatchEvents = async (apiKey, eventsBatch) => {
  const response = await apiClient.post('/v1/events/batch', eventsBatch, {
    headers: {
      'X-API-Key': apiKey,
    },
  });
  return response.data;
};

export const fetchRecentEvents = async (appId, apiKey, limit = 50) => {
  try {
    const headers = apiKey ? { 'X-API-Key': apiKey } : {};
    const response = await apiClient.get(`/v1/applications/${appId}/events`, {
      params: { limit },
      headers,
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching events for ${appId}:`, error);
    return [];
  }
};

export const fetchPrometheusMetrics = async () => {
  try {
    const response = await apiClient.get('/metrics', { responseType: 'text' });
    return response.data;
  } catch (error) {
    console.error('Error fetching Prometheus metrics:', error);
    return '';
  }
};
