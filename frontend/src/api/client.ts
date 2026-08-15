import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";

// Backend origin (no /api suffix) — used to resolve relative URLs like
// /static/... referenced from markdown content (learning material images).
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const ACCESS_KEY = "exams_access_token";
const REFRESH_KEY = "exams_refresh_token";

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  setAccess: (access: string) => localStorage.setItem(ACCESS_KEY, access),
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const apiClient = axios.create({ baseURL: API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

/** Shared by the axios interceptor below and useConversationChat's manual
 * fetch() (for the SSE streaming endpoints, which don't go through axios) —
 * both must dedupe onto the same in-flight refresh instead of racing two
 * independent calls, since SIMPLE_JWT.ROTATE_REFRESH_TOKENS blacklists the
 * refresh token after one use and the second racer would fail. */
export function refreshAccessTokenShared(): Promise<string> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) throw new Error("No refresh token");
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh });
  // SIMPLE_JWT.ROTATE_REFRESH_TOKENS blacklists the refresh token used here
  // and issues a new one in the response — it must be persisted too, or the
  // next refresh (after the next access-token expiry) fails and force-logs
  // the user out.
  if (data.refresh) {
    tokenStorage.set(data.access, data.refresh);
  } else {
    tokenStorage.setAccess(data.access);
  }
  return data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const newAccess = await refreshAccessTokenShared();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch {
        tokenStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);