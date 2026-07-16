// FILE: src/Lib/api.js
import axios from "axios";

/* ============================================================
   🔧 1. Axios Instance
   ============================================================ */

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || (isLocalhost ? "http://localhost:5001/api" : "https://curevirtual-2-production-e766.up.railway.app/api"),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

/* ============================================================
   🔒 2. Attach JWT Token Automatically
   ============================================================ */
api.interceptors.request.use(
  (config) => {
    // List of public endpoints that SHOULD NOT have a token attached
    // especially if the token might be expired (e.g., during registration)
    const publicEndpoints = [
      "/auth/register",
      "/auth/verify-otp",
      "/auth/request-otp-login",
      "/auth/verify-otp-login",
      "/registration-requests/submit"
    ];

    const isPublic = publicEndpoints.some(endpoint => config.url.includes(endpoint));

    if (!isPublic) {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ============================================================
   🔄 3. Handle Token Expiry or Network Errors Gracefully
   ============================================================ */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      console.error("🌐 Network error — check backend connection");
      // Intentionally not showing a global alert/toast here. 
      // Background polling (like unread counts) can fail on network changes (ERR_NETWORK_CHANGED).
      // Components should handle UI feedback in their own catch blocks.
      return Promise.reject(error);
    }

    // Handle expired tokens globally
    if (error.response.status === 401) {
      // Check if it's an actual expiration error
      const isExpired = error.response.data?.isExpired || error.response.data?.message?.includes("expired");

      if (isExpired) {
        console.warn("🔒 Token expired — clearing auth data and redirecting");
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        // Redirect to login only if not already on a public page
        const publicPages = ["/login", "/register", "/verify-otp"];
        if (!publicPages.includes(window.location.pathname)) {
          window.location.href = "/login?expired=true";
        }
      } else {
        console.warn("🔒 Unauthorized access — preserving auth data for retry");
      }
    }

    return Promise.reject(error);
  }
);

/* ============================================================
   🧩 4. Utility API Functions
   ============================================================ */

// 🔔 Notifications
export const getNotifications = async (userId) => {
  const res = await api.get(`/notifications/count/${userId}`);
  return res.data.notifications;
};

// 📊 Superadmin Stats
export const getSuperadminStats = async () => {
  const res = await api.get("/superadmin/stats");
  return res.data;
};

// 👥 Admin Management
export const fetchAdmins = async (role) => {
  const res = await api.get(`/admins${role ? `?role=${role}` : ""}`);
  return res.data;
};

export const getAdmin = async (id) => {
  const res = await api.get(`/admins/${id}`);
  return res.data;
};

export const createAdmin = async (data) => {
  const res = await api.post("/admins", data);
  return res.data;
};

export const updateAdmin = async (id, data) => {
  const res = await api.put(`/admins/${id}`, data);
  return res.data;
};

export const suspendAdmin = async (id) => {
  const res = await api.patch(`/admins/${id}/suspend`);
  return res.data;
};

export const deleteAdmin = async (id) => {
  const res = await api.delete(`/admins/${id}`);
  return res.data;
};

// 🧾 System Reports
export const fetchSystemReports = async () => {
  const res = await api.get("/superadmin/reports/summary");
  return res.data;
};

// ⚙️ Settings
export const fetchSettings = async () => {
  const res = await api.get("/settings");
  return res.data;
};

export const updateSettings = async (data) => {
  const res = await api.put("/settings", data);
  return res.data;
};

// 🧠 Logs & Activity
export const fetchLogs = async (role, limit = 20) => {
  const res = await api.get(`/logs?role=${role || ""}&limit=${limit}`);
  return res.data;
};

export const addLog = async (data) => {
  await api.post("/logs", data);
};

/* ============================================================
   🧩 5. Generic CRUD Helpers (optional reuse)
   ============================================================ */
export const getAll = async (endpoint, params = {}) => {
  const res = await api.get(endpoint, { params });
  return res.data;
};

export const getOne = async (endpoint, id) => {
  const res = await api.get(`${endpoint}/${id}`);
  return res.data;
};

export const create = async (endpoint, data) => {
  const res = await api.post(endpoint, data);
  return res.data;
};

export const update = async (endpoint, id, data) => {
  const res = await api.put(`${endpoint}/${id}`, data);
  return res.data;
};

export const remove = async (endpoint, id) => {
  const res = await api.delete(`${endpoint}/${id}`);
  return res.data;
};

/* ============================================================
   🧭 6. Export Default Instance
   ============================================================ */
export default api;
