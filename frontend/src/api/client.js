import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
});

api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access_token");
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
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
