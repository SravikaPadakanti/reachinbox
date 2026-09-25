import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { useToast } from "./components/ui";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);

export function Store({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [scheduled, setScheduled] = useState([]);
  const [sent, setSent] = useState([]);
  const [health, setHealth] = useState({ ok: true });
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const toast = useToast();
  const failing = React.useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, h] = await Promise.all([api.scheduled(), api.sent(), api.health()]);
      setScheduled(s); setSent(d); setHealth(h); failing.current = false;
    } catch (e) {
      if (e.status === 401) setUser(null);
      else if (!failing.current) { failing.current = true; toast("Couldn't load emails. Retrying every 10 seconds.", "err"); }
    } finally { setLoading(false); setLoaded(true); }
  }, [toast]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get("auth_token");
      if (urlToken) {
        try {
          localStorage.setItem("reachinbox_token", urlToken);
        } catch {}
        params.delete("auth_token");
        const cleanQuery = params.toString() ? `?${params.toString()}` : "";
        const cleanUrl = window.location.pathname + cleanQuery + window.location.hash;
        window.history.replaceState(null, "", cleanUrl);
      }
    }

    api
      .me()
      .then(setUser)
      .catch(() => {
        try {
          localStorage.removeItem("reachinbox_token");
        } catch {}
        setUser(null);
      });
  }, []);

  // Poll every 10s while logged in
  useEffect(() => {
    if (!user) return;
    refresh();
    const t = setInterval(refresh, 10000);
    return () => clearInterval(t);
  }, [user, refresh]);

  const logout = async () => {
    await api.logout().catch(() => {});
    try {
      localStorage.removeItem("reachinbox_token");
    } catch {}
    setUser(null);
    setScheduled([]);
    setSent([]);
  };

  return <Ctx.Provider value={{ user, setUser, scheduled, sent, health, loading, loaded, refresh, logout }}>{children}</Ctx.Provider>;
}
