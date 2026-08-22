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

// Without a timeout, a stalled backend/proxy/network leaves requests (and
// their callers' loading states) hanging indefinitely. 20s comfortably
// covers normal API calls; long-running work (AI assistant chat) uses SSE
// via fetch() instead of this client, so it isn't affected.
export const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

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

/*
  Endpoints where a 401 means "those credentials are wrong", not "your session
  expired".

  Without this list the interceptor treated the login endpoint's own 401 as an
  expired session: a student typing the wrong password got a failed token
  refresh, `tokenStorage.clear()`, and a full `window.location.href = "/login"`
  navigation. The page reloaded, the error message the login page had just set
  was destroyed along with the username they had typed, and they were returned
  to an empty form with nothing said. In other words the wrong-password
  message could never be seen, in a modal or anywhere else — which is a
  functional defect, not a styling one.

  Matching on the path rather than a per-call flag keeps every future caller of
  these endpoints correct by default.
*/
const CREDENTIAL_ENDPOINTS = [
  "/auth/login/",
  "/auth/register/",
  "/auth/refresh/",
  "/auth/password-reset/",
  "/auth/password-reset/confirm/",
];

function isCredentialRequest(url: string | undefined): boolean {
  if (!url) return false;
  return CREDENTIAL_ENDPOINTS.some((path) => url.includes(path));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (isCredentialRequest(original?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const newAccess = await refreshAccessTokenShared();
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(original);
      } catch {
        tokenStorage.clear();
        // Already on the login screen: reloading it would only throw away
        // whatever the person had typed.
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);