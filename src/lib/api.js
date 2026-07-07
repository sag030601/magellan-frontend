const API = import.meta.env.VITE_API_URL || "";
const TOKEN_KEY = "magellan_token";

function getHeaders(extra = {}, body) {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = { ...extra };
  if (!isFormData && !("Content-Type" in headers)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiFetch(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers, options.body),
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  return res;
}

export function apiUrl(path) {
  return `${API}${path}`;
}
