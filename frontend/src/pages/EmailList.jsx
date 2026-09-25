import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";
import { Filter, Refresh, Search, Star } from "../icons";
import { EmptyState, ListSkeleton, StatusPill, TimePill } from "../components/ui";
import { fmtFull } from "../utils";

const loadStars = () => { try { return new Set(JSON.parse(localStorage.getItem("stars") || "[]")); } catch { return new Set(); } };

export default function EmailList({ kind }) {
  const { scheduled, sent, loading, loaded, refresh } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [menu, setMenu] = useState(false);
  const [stars, setStars] = useState(loadStars);
  const isSent = kind === "sent";

  const options = isSent ? ["all", "sent", "failed"] : ["all", "scheduled", "rescheduled", "pending"];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (isSent ? sent : scheduled).filter((r) =>
      (status === "all" || r.status.toLowerCase() === status) &&
      (!term || r.email.toLowerCase().includes(term) || r.subject.toLowerCase().includes(term)));
  }, [isSent, sent, scheduled, q, status]);

  const toggleStar = (e, id) => {
    e.stopPropagation();
    const next = new Set(stars);
    next.has(id) ? next.delete(id) : next.add(id);
    setStars(next);
    localStorage.setItem("stars", JSON.stringify([...next]));
  };

  return (
    <>
      <div className="toolbar">
        <label className="search"><Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search emails" />
        </label>
        <div className="filter-wrap">
          <button className={"icon-btn" + (status !== "all" ? " active" : "")} onClick={() => setMenu(!menu)} aria-label="Filter"><Filter size={17} /></button>
          {menu && (
            <div className="popover">
              {options.map((o) => (
                <button key={o} className={o === status ? "sel" : ""} onClick={() => { setStatus(o); setMenu(false); }}>{o[0].toUpperCase() + o.slice(1)}</button>
              ))}
            </div>
          )}
        </div>
        <button className={"icon-btn" + (loading ? " spin" : "")} onClick={refresh} aria-label="Refresh"><Refresh size={17} /></button>
      </div>

      {!loaded ? <ListSkeleton /> : (
        <ul className="rows">
          {rows.map((r) => (
            <li key={r.id} className="row" onClick={() => nav(`/email/${r.id}`)}>
              <span className="to">To: {r.email}</span>
              {isSent ? <StatusPill status={r.status} /> : <TimePill iso={r.scheduledTime} />}
              <span className="subj"><b>{r.subject}</b></span>
              {isSent ? <time className="when">{fmtFull(r.sentTime)}</time> : <StatusPill status={r.status} />}
              <button className="star" onClick={(e) => toggleStar(e, r.id)} aria-label="Star"><Star on={stars.has(r.id)} size={16} /></button>
            </li>
          ))}
        </ul>
      )}
      {loaded && !rows.length && (
        <EmptyState>{q || status !== "all" ? "No emails match your search." : isSent ? "Nothing sent yet." : "No scheduled emails. Use Compose to schedule one."}</EmptyState>
      )}
    </>
  );
}
