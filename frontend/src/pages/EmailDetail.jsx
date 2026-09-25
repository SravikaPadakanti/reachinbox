import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { Back, Clip } from "../icons";
import { Button, EmptyState, StatusPill, useToast } from "../components/ui";
import { fmtFull } from "../utils";

export default function EmailDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [mail, setMail] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setState("loading");
    api.email(id).then((m) => { setMail(m); setState("ok"); }).catch(() => setState("error"));
  }, [id]);

  const onRetry = async () => {
    setRetrying(true);
    try {
      await api.retry(id);
      toast("Email re-queued for immediate send!", "ok");
      const updated = await api.email(id);
      setMail(updated);
    } catch (e) {
      toast("Retry failed: " + e.message, "err");
    } finally {
      setRetrying(false);
    }
  };

  const downloadAttachment = (att) => {
    try {
      if (!att.content) {
        alert("Attachment content not available");
        return;
      }
      const byteChars = atob(att.content);
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: att.contentType || "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename || "attachment";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
            <div className="meta-top">
              <b>{mail.fromSender}</b>
              <time>{fmtFull(mail.sentTime || mail.scheduledTime)}</time>
            </div>
            <small className="to-me">to {mail.email}</small>
            <p className="status-line">
              Status: <StatusPill status={mail.status} />
              {mail.status !== "sent" && mail.status !== "failed" && <> · scheduled for {fmtFull(mail.scheduledTime)}</>}
              {mail.failReason && <span className="fail"> {mail.failReason}</span>}
            </p>

            {mail.status === "failed" && (
              <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                <Button
                  className="pill-btn"
                  onClick={onRetry}
                  busy={retrying}
                  busyText="Retrying…"
                  style={{ background: "#DC2626", color: "#fff", borderColor: "#DC2626" }}
                >
                  🔄 Retry Sending Now
                </Button>
              </div>
            )}

            {mail.previewUrl && (
              <div>
                <a
                  href={mail.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ethereal-badge"
                  title="Open this email in Ethereal test inbox"
                >
                  📨 View in Ethereal Mailbox ↗
                </a>
              </div>
            )}

            {/* sandboxed: the body is user-authored HTML, so no scripts may run */}
            <iframe className="mail-body" title="Email body" sandbox="" srcDoc={mail.body} />

            {mail.attachments && mail.attachments.length > 0 && (
              <div className="detail-attachments">
                <div className="attachments-hdr">
                  <Clip size={16} />
                  <span>Attachments ({mail.attachments.length})</span>
                </div>
                <div className="attachments-grid">
                  {mail.attachments.map((att, i) => {
                    const isImg = att.contentType?.startsWith("image/");
                    const imgSrc = isImg && att.content ? `data:${att.contentType};base64,${att.content}` : null;
                    return (
                      <div key={i} className="attachment-card" title={att.filename}>
                        {imgSrc ? (
                          <img src={imgSrc} alt={att.filename} className="attachment-thumb" />
                        ) : (
                          <span className="attachment-thumb">📄</span>
                        )}
                        <div className="attachment-info">
                          <span className="attachment-name">{att.filename}</span>
                          <span className="attachment-meta">
                            {formatSize(att.size) || att.contentType || "File"}
                          </span>
                        </div>
                        {att.content && (
                          <button
                            type="button"
                            className="attachment-btn"
                            onClick={() => downloadAttachment(att)}
                            title="Download attachment"
                          >
                            ⬇ Download
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
