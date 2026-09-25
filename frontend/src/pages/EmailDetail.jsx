import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Back } from "../icons";
import { EmptyState, StatusPill } from "../components/ui";
import { fmtFull } from "../utils";

export default function EmailDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [mail, setMail] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error

  useEffect(() => {
    setState("loading");
    api.email(id).then((m) => { setMail(m); setState("ok"); }).catch(() => setState("error"));
  }, [id]);

  return (
    <div className="detail">
      <header className="detail-head">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back"><Back /></button>
        <h2>{mail ? mail.subject : state === "loading" ? "Loading…" : "Email not found"}</h2>
      </header>
      {state === "error" && <EmptyState>This email couldn't be loaded. It may have been removed.</EmptyState>}
      {mail && (
        <div className="detail-body">
          <span className="avatar big">{mail.fromSender[0].toUpperCase()}</span>
          <div className="meta">
            <div className="meta-top"><b>{mail.fromSender}</b>
              <time>{fmtFull(mail.sentTime || mail.scheduledTime)}</time></div>
            <small className="to-me">to {mail.email}</small>
            <p className="status-line">Status: <StatusPill status={mail.status} />
              {mail.status !== "sent" && mail.status !== "failed" && <> · scheduled for {fmtFull(mail.scheduledTime)}</>}
              {mail.failReason && <span className="fail"> {mail.failReason}</span>}
            </p>
            {/* sandboxed: the body is user-authored HTML, so no scripts may run */}
            <iframe className="mail-body" title="Email body" sandbox="" srcDoc={mail.body} />
          </div>
        </div>
      )}
    </div>
  );
}
