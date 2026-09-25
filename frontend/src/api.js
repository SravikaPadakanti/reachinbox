const PROD_API_URL = "https://reachinbox-1wr6.onrender.com";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const envApi = import.meta.env.VITE_API_URL;
export const API =
  envApi && (!envApi.includes("localhost") || isLocalhost)
    ? envApi
    : isLocalhost
    ? "http://localhost:4000"
    : PROD_API_URL;

export function getToken() {
  try {
    return localStorage.getItem("reachinbox_token");
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem("reachinbox_token", token);
    else localStorage.removeItem("reachinbox_token");
  } catch {}
}

async function req(path, opts = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const res = await fetch(API + path, {
    credentials: "include", // session cookie fallback
    headers,
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(formatError(data) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Backend returns either { error: "text" } or { error: { fieldErrors, formErrors } } (zod)
export function formatError(data) {
  const e = data?.error;
  if (!e) return "";
  if (typeof e === "string") return e;
  const fields = Object.entries(e.fieldErrors || {}).map(([k, v]) => `${k}: ${v.join(", ")}`);
  return [...fields, ...(e.formErrors || [])].join(" · ");
}

export const api = {
  get googleLoginUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${API}/auth/google?redirect_to=${encodeURIComponent(origin)}`;
  },
  testLoginUrl: `${API}/auth/test-login`,
  login: async (body = {}) => {
    const data = await req("/auth/login", { method: "POST", body: JSON.stringify(body) });
    if (data?.token) setToken(data.token);
    return data;
  },
  me: () => req("/auth/me"),
  logout: async () => {
    try {
      await req("/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
    }
  },
  scheduled: () => req("/api/emails/scheduled"),
  sent: () => req("/api/emails/sent"),
  email: (id) => req(`/api/emails/${id}`),
  schedule: (body) => req("/api/schedule", { method: "POST", body: JSON.stringify(body) }),
  // /health answers 503 with a JSON body when something is down, so don't throw on it
  health: async () => {
    try {
      const r = await fetch(API + "/health");
      return { ok: r.ok, ...(await r.json()) };
    } catch {
      return { ok: false, redis: "unreachable", postgres: "unreachable" };
    }
  },
};
