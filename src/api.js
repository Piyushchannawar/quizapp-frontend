import axios from "axios";

const REMOTE_API = "https://quizeapp-backend-alcm.onrender.com/api";

// Development defaults to local backend via Vite proxy (/api -> localhost:5000).
// Set VITE_USE_REMOTE_API=true to force Render while developing.
const useRemoteApiInDev =
  import.meta.env.DEV && import.meta.env.VITE_USE_REMOTE_API === "true";

const apiBase =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV && !useRemoteApiInDev ? "/api" : REMOTE_API);

const api = axios.create({
  baseURL: apiBase
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token && config.url.startsWith("/admin")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

