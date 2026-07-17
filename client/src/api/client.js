import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
});

let authStore = {
  getAccessToken: () => "",
  getRefreshToken: () => "",
  saveSession: () => {},
  clearSession: () => {}
};
let refreshPromise = null;

export const configureAuthClient = (config) => {
  authStore = { ...authStore, ...config };
};

export const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

api.interceptors.request.use((config) => {
  const token = authStore.getAccessToken?.();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const message = String(error.response?.data?.message || "");

    if (status === 403 && /blocked by an administrator|has been blocked/i.test(message)) {
      authStore.clearSession?.();
      throw error;
    }

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      throw error;
    }

    const refreshToken = authStore.getRefreshToken?.();
    if (!refreshToken) {
      authStore.clearSession?.();
      throw error;
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = api
        .post("/auth/refresh", { refreshToken }, { skipAuthRefresh: true })
        .then(({ data }) => {
          authStore.saveSession?.(data);
          setAuthHeader(data.token);
          return data.token;
        })
        .catch((refreshError) => {
          authStore.clearSession?.();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const nextAccessToken = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
    return api(originalRequest);
  }
);

export default api;
