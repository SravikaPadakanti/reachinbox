import React, { createContext, useCallback, useContext, useState } from "react";
import { Clock } from "../icons";
import { fmtTime } from "../utils";

export function Button({ busy, busyText = "Working…", className = "", children, disabled, ...p }) {
  return <button className={"btn-outline " + className} disabled={busy || disabled} {...p}>{busy ? busyText : children}</button>;
}

export const StatusPill = ({ status }) => {
  const s = String(status).toLowerCase();
  return <span className={"pill status-" + s}>{s}</span>;
};

export const TimePill = ({ iso }) => <span className="pill pill-orange"><Clock size={12} /> {fmtTime(iso)}</span>;

export const EmptyState = ({ children }) => <p className="empty">{children}</p>;

export const ListSkeleton = ({ rows = 6 }) => (
  <ul className="rows" aria-busy="true" aria-label="Loading emails">
    {Array.from({ length: rows }, (_, i) => <li key={i} className="row skel"><span /><span /><span /></li>)}
  </ul>
);

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = "ok") => {
    const id = Math.random();
    setItems((p) => [...p, { id, msg, type }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={"toast " + t.type}>{t.msg}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}
