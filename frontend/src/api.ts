import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  User,
  FlowTemplate,
  Stage,
  FormField,
  AuthResponse,
  CurrentUserResponse,
  CreateFlowTemplateRequest,
  UpdateFlowTemplateRequest,
  CreateStageRequest,
  UpdateStageRequest,
  CreateFormFieldRequest,
  UpdateFormFieldRequest,
  TaskInstance,
  CreateFlowInstanceRequest,
  FlowInstanceDetailResponse,
  TaskInstanceDetailResponse,
  CompleteTaskRequest,
  TaskCompleteResponse,
} from './types';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token && config.headers) {
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
  register: (
    email: string,
    password: string,
    fullName?: string
  ): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    }),

  login: async (
    email: string,
    password: string
  ): Promise<AxiosResponse<AuthResponse>> => {
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

  googleLogin: (): void => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  },
};

// User API calls
export const users = {
  getCurrentUser: (): Promise<AxiosResponse<CurrentUserResponse>> =>
    api.get('/users/me'),
  getMyTasks: (): Promise<AxiosResponse<TaskInstanceDetailResponse[]>> =>
    api.get('/users/me/tasks'),
  getUserTasks: (userId: number): Promise<AxiosResponse<TaskInstanceDetailResponse[]>> =>
    api.get(`/users/${userId}/tasks`),
  list: (): Promise<AxiosResponse<User[]>> => api.get('/users'),
};

// Flow Templates API
export const flowTemplates = {
  list: (): Promise<AxiosResponse<FlowTemplate[]>> => api.get('/flows'),
  get: (id: number): Promise<AxiosResponse<FlowTemplate>> =>
    api.get(`/flows/${id}`),
  create: (
    data: CreateFlowTemplateRequest
  ): Promise<AxiosResponse<FlowTemplate>> => api.post('/flows', data),
  update: (
    id: number,
    data: UpdateFlowTemplateRequest
  ): Promise<AxiosResponse<FlowTemplate>> => api.put(`/flows/${id}`, data),
  delete: (id: number): Promise<AxiosResponse<void>> =>
    api.delete(`/flows/${id}`),
};

// Flow Stages API
export const stages = {
  create: (
    flowId: number,
    data: CreateStageRequest
  ): Promise<AxiosResponse<Stage>> => api.post(`/flows/${flowId}/stages`, data),
  update: (
    flowId: number,
    stageId: number,
    data: UpdateStageRequest
  ): Promise<AxiosResponse<Stage>> =>
    api.put(`/flows/${flowId}/stages/${stageId}`, data),
  delete: (flowId: number, stageId: number): Promise<AxiosResponse<void>> =>
    api.delete(`/flows/${flowId}/stages/${stageId}`),
};

// Form Fields API
export const formFields = {
  create: (
    flowId: number,
    stageId: number,
    data: CreateFormFieldRequest
  ): Promise<AxiosResponse<FormField>> =>
    api.post(`/flows/${flowId}/stages/${stageId}/fields`, data),
  update: (
    flowId: number,
    stageId: number,
    fieldId: number,
    data: UpdateFormFieldRequest
  ): Promise<AxiosResponse<FormField>> =>
    api.put(`/flows/${flowId}/stages/${stageId}/fields/${fieldId}`, data),
  delete: (
    flowId: number,
    stageId: number,
    fieldId: number
  ): Promise<AxiosResponse<void>> =>
    api.delete(`/flows/${flowId}/stages/${stageId}/fields/${fieldId}`),
};

// Flow Roles API (for future use)
export const flowRoles = {
  list: (flowId: number): Promise<AxiosResponse<any[]>> =>
    api.get(`/flows/${flowId}/roles`),
  create: (flowId: number, data: any): Promise<AxiosResponse<any>> =>
    api.post(`/flows/${flowId}/roles`, data),
  update: (
    flowId: number,
    roleId: number,
    data: any
  ): Promise<AxiosResponse<any>> =>
    api.put(`/flows/${flowId}/roles/${roleId}`, data),
  delete: (flowId: number, roleId: number): Promise<AxiosResponse<void>> =>
    api.delete(`/flows/${flowId}/roles/${roleId}`),
};

// Flow Instances API
export const flowInstances = {
  create: (
    data: CreateFlowInstanceRequest
  ): Promise<AxiosResponse<FlowInstanceDetailResponse>> =>
    api.post('/flow-instances', data),
  get: (id: number): Promise<AxiosResponse<FlowInstanceDetailResponse>> =>
    api.get(`/flow-instances/${id}`),
  list: (status?: string): Promise<AxiosResponse<FlowInstanceDetailResponse[]>> =>
    api.get('/flow-instances', { params: status ? { status } : {} }),
};

// Tasks API
export const tasks = {
  get: (
    taskId: number
  ): Promise<AxiosResponse<TaskInstanceDetailResponse>> =>
    api.get(`/tasks/${taskId}`),
  complete: (
    taskId: number,
    data: CompleteTaskRequest
  ): Promise<AxiosResponse<TaskCompleteResponse>> =>
    api.post(`/tasks/${taskId}/complete`, data),
};

export default api;
