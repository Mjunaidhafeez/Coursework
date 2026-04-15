import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
});

let pendingRequestCount = 0;
const pendingListeners = new Set();

const notifyPendingListeners = () => {
  pendingListeners.forEach((listener) => {
    try {
      listener(pendingRequestCount);
    } catch {
      // Ignore listener-level errors to avoid breaking requests.
    }
  });
};

const isGlobalLoaderEnabled = (config) => !config?.skipGlobalLoader;

const markRequestStarted = (config) => {
  if (!isGlobalLoaderEnabled(config)) return config;
  config.__globalLoaderTracked = true;
  pendingRequestCount += 1;
  notifyPendingListeners();
  return config;
};

const markRequestFinished = (config) => {
  if (!config?.__globalLoaderTracked) return;
  pendingRequestCount = Math.max(0, pendingRequestCount - 1);
  notifyPendingListeners();
};

export const subscribeApiPendingRequests = (listener) => {
  pendingListeners.add(listener);
  listener(pendingRequestCount);
  return () => {
    pendingListeners.delete(listener);
  };
};

api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access_token");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return markRequestStarted(config);
});

api.interceptors.response.use(
  (response) => {
    markRequestFinished(response?.config);
    return response;
  },
  async (error) => {
    const original = error.config;
    markRequestFinished(original);
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    original._retry = true;
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) {
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, {
        refresh,
      });
      localStorage.setItem("access_token", data.access);
      original.headers.Authorization = `Bearer ${data.access}`;
      return api(original);
    } catch (refreshError) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
      return Promise.reject(refreshError);
    }
  }
);

export default api;
