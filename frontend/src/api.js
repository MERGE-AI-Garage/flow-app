import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      window.location.href = '/login.html';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const auth = {
  register: (email, password, fullName) =>
    api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    }),

  login: async (email, password) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  },
};

// User API calls
export const users = {
  getCurrentUser: () => api.get('/users/me'),
  getMyTasks: () => api.get('/users/me/tasks'),
  list: () => api.get('/users'),
};

// Flow Templates API
export const flowTemplates = {
  list: () => api.get('/flows'),
  get: (id) => api.get(`/flows/${id}`),
  create: (data) => api.post('/flows', data),
  update: (id, data) => api.put(`/flows/${id}`, data),
  delete: (id) => api.delete(`/flows/${id}`),
};

// Flow Stages API
export const stages = {
  create: (flowId, data) => api.post(`/flows/${flowId}/stages`, data),
  update: (flowId, stageId, data) => api.put(`/flows/${flowId}/stages/${stageId}`, data),
  delete: (flowId, stageId) => api.delete(`/flows/${flowId}/stages/${stageId}`),
};

// Form Fields API
export const formFields = {
  create: (flowId, stageId, data) => api.post(`/flows/${flowId}/stages/${stageId}/fields`, data),
  update: (flowId, stageId, fieldId, data) => api.put(`/flows/${flowId}/stages/${stageId}/fields/${fieldId}`, data),
  delete: (flowId, stageId, fieldId) => api.delete(`/flows/${flowId}/stages/${stageId}/fields/${fieldId}`),
};

// Flow Roles API
export const flowRoles = {
  list: (flowId) => api.get(`/flows/${flowId}/roles`),
  create: (flowId, data) => api.post(`/flows/${flowId}/roles`, data),
  update: (flowId, roleId, data) => api.put(`/flows/${flowId}/roles/${roleId}`, data),
  delete: (flowId, roleId) => api.delete(`/flows/${flowId}/roles/${roleId}`),
};

export default api;
