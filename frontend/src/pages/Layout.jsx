import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Chevron, Clock, Send } from "../icons";

export default function Layout() {
  const { user, scheduled, sent, health, logout } = useStore();
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  const initials = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">ONB</div>
        <div className="user-wrap">
          <button className="user-card" onClick={() => setMenu(!menu)} aria-expanded={menu}>
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{initials}</span>}
            <span className="user-text"><b>{user.name || "Account"}</b><small>{user.email}</small></span>
            <Chevron size={16} />
          </button>
          {menu && <button className="menu-item" onClick={logout}>Log out</button>}
        </div>
        <button className="btn-outline compose-btn" onClick={() => nav("/compose")} disabled={!health.ok} title={health.ok ? "" : "Server is unavailable"}>Compose</button>
        <div className="nav-label">CORE</div>
        <NavLink to="/dashboard" className="nav-item"><Clock /> <span>Scheduled</span><em>{scheduled.length}</em></NavLink>
        <NavLink to="/sent" className="nav-item"><Send /> <span>Sent</span><em>{sent.length}</em></NavLink>
        <div className={"health " + (health.ok ? "ok" : "bad")} title={`redis: ${health.redis} · postgres: ${health.postgres}`}>
          <i /> {health.ok ? "All systems running" : "Server issue"}
        </div>
      </aside>
      <section className="content">
        {!health.ok && <div className="banner">Scheduling is paused: Redis ({health.redis}) / Postgres ({health.postgres}).</div>}
        <Outlet />
      </section>
    </div>
  );
}
