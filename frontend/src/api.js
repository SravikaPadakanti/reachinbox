export const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function req(path, opts = {}) {
  const res = await fetch(API + path, {
    credentials: "include", // session cookie
    headers: { "Content-Type": "application/json" },
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
  googleLoginUrl: `${API}/auth/google`,
  testLoginUrl: `${API}/auth/test-login`,
  login: (body = {}) => req("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => req("/auth/me"),
  logout: () => req("/auth/logout", { method: "POST" }),
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
