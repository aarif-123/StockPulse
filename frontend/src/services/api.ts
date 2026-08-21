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

// In-Memory Stale Cache and In-Flight Request Deduplication (TTL: 8 seconds)
const getCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 8000;

export function clearApiCache() {
  getCache.clear();
}

// Intercept Axios requests for fast caching
const originalGet = api.get.bind(api);
api.get = (url: string, config?: any): Promise<any> => {
  const activeOrgId = localStorage.getItem('activeOrgId') || 'default';
  const cacheKey = `${activeOrgId}:${url}:${JSON.stringify(config?.params || {})}`;
  const now = Date.now();

  const cached = getCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS && !config?.headers?.['Cache-Control']) {
    return Promise.resolve({ data: cached.data, status: 200, statusText: 'OK', headers: {}, config });
  }

  // Deduplicate in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey)!;
  }

  const reqPromise = originalGet(url, config)
    .then((res) => {
      getCache.set(cacheKey, { data: res.data, timestamp: Date.now() });
      return res;
    })
    .finally(() => {
      inFlightRequests.delete(cacheKey);
    });

  inFlightRequests.set(cacheKey, reqPromise);
  return reqPromise;
};

// Invalidate cache on mutations
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      clearApiCache();
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      clearApiCache();
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
