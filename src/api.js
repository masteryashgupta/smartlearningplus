import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 12000, // 12 seconds timeout to fail fast on DNS blocking
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Help debug DNS blocking/network connectivity issues
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error(
        "🚨 Network Error / DNS Blocking suspected. No response received from server. Request details:",
        {
          url: error.config?.url,
          method: error.config?.method,
          message: error.message,
          code: error.code,
        }
      );
    }
    return Promise.reject(error);
  }
);

export function getSession() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");
  return token ? { token, role, name } : null;
}

export function setSession(token, role, name) {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
  localStorage.setItem("name", name);
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("name");
}
