import axios, { AxiosError } from 'axios';

// Get API base URL from Vite environment variables (fallback to local server)
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach bearer token to outgoing requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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
      // Clear token and user details on unauthorized access
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      
      // Force page redirect to login page (avoid window location loop if already on login page)
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Normalizes Axios errors into human-readable messages.
 * Strips raw database queries and server traces before presenting to user.
 */
export function handleApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError<{ message?: string; status?: string }>;
    if (axiosError.response) {
      // Standard backend operational error or validation error
      return axiosError.response.data?.message || `Request failed with status code ${axiosError.response.status}`;
    } else if (axiosError.request) {
      // No response received from server
      return 'No response from server. Please verify your connection.';
    }
  }
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}
