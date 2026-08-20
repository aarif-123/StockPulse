import axios, { AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach bearer token & active organization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    const activeOrgId = localStorage.getItem('activeOrgId');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (activeOrgId && config.headers) {
      config.headers['x-organization-id'] = activeOrgId;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401 globally, wipe state and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('activeOrgId');
      localStorage.removeItem('userOrganizations');

      if (!window.location.pathname.endsWith('/login') && !window.location.pathname.endsWith('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Normalizes Axios errors into human-readable messages.
 */
export function handleApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError<{ message?: string; status?: string; code?: string }>;
    if (axiosError.response) {
      return axiosError.response.data?.message || `Request failed with status code ${axiosError.response.status}`;
    } else if (axiosError.request) {
      return 'No response from server. Please verify your connection.';
    }
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}
