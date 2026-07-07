import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "magellan_token";

const instance = axios.create({ baseURL: API });

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default instance;
