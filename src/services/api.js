/**
 * services/api.js
 * Connected to real AWS API
 */

import axios from "axios";
import { getToken } from "./storage";

const BASE_URL = "https://0vy4wgl8gk.execute-api.ap-south-1.amazonaws.com";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Unknown API error";
    console.error("[API] Error:", message);
    return Promise.reject(new Error(message));
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Login
 * POST /sync/login
 * Expects: { employee_id, password }
 * Returns: { success, token, employee_id, message }
 */
export const login = async ({ email, password }) => {
  const response = await api.post("/sync/login", {
    employee_id: email, // login screen sends email field, maps to employee_id
    password,
  });
  return response.data;
};

/**
 * Register
 * POST /sync/register
 * Expects: { name, employee_id, embedding }
 * Returns: { success, message, userId, token, name }
 */
export const register = async ({ name, email, password, embedding = [] }) => {
  const response = await api.post("/sync/register", {
    name,
    employee_id: email, // email field maps to employee_id
    password,
    embedding, // face embedding array (empty for now, filled after TFLite)
  });
  return response.data;
};

/**
 * Get Profile
 */
export const getProfile = async () => {
  const response = await api.get("/sync/profile");
  return response.data;
};

/**
 * Upload a single liveness capture
 * POST /sync/captures/upload
 * Expects: { person_id, person_name, employee_id, timestamp, latitude, longitude }
 */
export const uploadCapture = async (capture) => {
  const response = await api.post("/sync/captures/upload", {
    person_id: capture.personId || "",
    person_name: capture.name || "",
    employee_id: capture.employeeId || "",
    timestamp: capture.timestamp || new Date().toISOString(),
    latitude: capture.latitude || 0,
    longitude: capture.longitude || 0,
  });
  return response.data;
};

/**
 * Bulk sync captures
 * POST /sync/captures/sync
 * Expects: { records: [...] }
 */
export const syncData = async (items) => {
  const records = items.map((item) => ({
    person_id: item.personId || "",
    person_name: item.name || "",
    employee_id: item.employeeId || "",
    timestamp: item.timestamp || new Date().toISOString(),
    latitude: item.latitude || 0,
    longitude: item.longitude || 0,
  }));
  const response = await api.post("/sync/captures/sync", { records });
  return response.data;
};

export default api;
