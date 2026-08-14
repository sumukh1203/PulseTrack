import axios from 'axios';

const API_BASE = ''; // Proxy handles /v1, /health, /metrics

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  return response.data;
};

export const rotateApiKey = async (id) => {
  const response = await apiClient.post(`/v1/applications/${id}/keys/rotate`);
  return response.data;
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

export const fetchPrometheusMetrics = async () => {
  try {
    const response = await apiClient.get('/metrics', { responseType: 'text' });
    return response.data;
  } catch (error) {
    console.error('Error fetching Prometheus metrics:', error);
    return '';
  }
};
