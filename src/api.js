import axios from "axios";

const REMOTE_API = "https://quizeapp-backend-alcm.onrender.com/api";

// Dev server: default = call Render (no local backend). For local API, run `server` on
// port 5000 and set VITE_USE_LOCAL_API=true (e.g. in client/.env.local).
const useLocalProxy =
  import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_API === "true";

const apiBase =
  import.meta.env.VITE_API_URL ||
  (useLocalProxy ? "/api" : REMOTE_API);

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

