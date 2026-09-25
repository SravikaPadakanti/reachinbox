import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useStore } from "../store";
import { Back, Chevron, Clip, Clock, Upload } from "../icons";
import { Button, useToast } from "../components/ui";

const EMAIL_RE = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/g;
const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const DEFAULT_SENDER = import.meta.env.VITE_DEFAULT_SENDER;

export default function Compose() {
  const { user, health, refresh } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const senders = [...new Set([user.email, DEFAULT_SENDER].filter(Boolean))];
  const [from, setFrom] = useState(DEFAULT_SENDER || user.email);
  const [recipients, setRecipients] = useState([]);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [delay, setDelay] = useState("");
  const [hourly, setHourly] = useState("");
  const [when, setWhen] = useState(localInput(new Date(Date.now() + 5 * 60000)));
  const [showTime, setShowTime] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editor = useRef(null);
  const fileInput = useRef(null);
  const listInput = useRef(null);

  const addRecipients = (text) => {
    const found = (text.match(EMAIL_RE) || []).filter(isEmail);
    setRecipients((prev) => [...new Set([...prev, ...found])]);
    return found.length;
  };
  const commitDraft = () => { if (draft.trim()) { addRecipients(draft); setDraft(""); } };

  const onList = async (e) => {
    const f = e.target.files?.[0];
    if (f) {
      const n = addRecipients(await f.text());
      toast(n ? `${n} email addresses detected in ${f.name}` : `No email addresses found in ${f.name}`, n ? "ok" : "err");
    }
    e.target.value = "";
  };
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result || "").split(",")[1] || "";
        resolve({
          filename: file.name,
          content: base64,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onFiles = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    try {
      const converted = await Promise.all(selected.map(fileToBase64));
      setFiles((prev) => [...prev, ...converted]);
      toast(`${converted.length} file(s) attached`, "ok");
    } catch {
      toast("Failed to read attached file", "err");
    }
    e.target.value = "";
  };
  const fmt = (cmd, val) => { editor.current.focus(); document.execCommand(cmd, false, val); };

  const submit = async () => {
    setError("");
    const all = draft.trim() ? [...new Set([...recipients, ...(draft.match(EMAIL_RE) || [])])] : recipients;
    const body = editor.current.innerHTML.trim();
    const text = editor.current.innerText.trim();
    if (!all.length) return setError("Add at least one recipient.");
    if (!subject.trim()) return setError("Add a subject.");
    if (!text) return setError("Write a message before scheduling.");
    const start = new Date(when);
    if (isNaN(start)) return setError("Pick a valid send time.");
    setBusy(true);
    try {
      const payload = {
        fromSender: from,
        recipients: all,
        subject: subject.trim(),
        body,
        startTime: (start < new Date() ? new Date() : start).toISOString(),
        attachments: files.map((f) => ({
          filename: f.filename,
          content: f.content,
          contentType: f.contentType,
        })),
      };
      if (delay !== "") payload.delayBetweenEmailsMs = Math.round(Number(delay) * 1000); // field is in seconds
      if (hourly !== "") payload.hourlyLimit = Number(hourly);
      const res = await api.schedule(payload);
      await refresh();
      toast(`${res.jobsCreated} email(s) scheduled`);
      nav("/dashboard");
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  const shown = recipients.slice(0, 3);
  const extra = recipients.length - shown.length;

  return (
    <div className="compose">
      <header className="compose-head">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Back"><Back /></button>
        <h2>Compose New Email</h2>
        <div className="head-actions">
          <button className="icon-btn green" onClick={() => fileInput.current.click()} aria-label="Attach files"><Clip />{files.length > 0 && <sub>{files.length}</sub>}</button>
          <div className="filter-wrap">
            <button className="icon-btn green" onClick={() => setShowTime(!showTime)} aria-label="Pick send time"><Clock /></button>
            {showTime && (
              <div className="popover time-pop">
                <label>Send at<input type="datetime-local" value={when} min={localInput(new Date())} onChange={(e) => setWhen(e.target.value)} /></label>
              </div>
            )}
          </div>
          <Button className="pill-btn" onClick={submit} busy={busy} busyText="Scheduling…" disabled={!health.ok}>Send Later</Button>
        </div>
        <input ref={fileInput} type="file" multiple hidden onChange={onFiles} />
      </header>

      <div className="compose-body">
        {error && <p className="form-msg" role="alert">{error}</p>}
        <div className="c-row"><label>From</label>
          <div className="select">
            <select value={from} onChange={(e) => setFrom(e.target.value)}>{senders.map((s) => <option key={s}>{s}</option>)}</select><Chevron size={14} />
          </div>
        </div>
        <div className="c-row line"><label>To</label>
          <div className="chips">
            {shown.map((r) => <span className="chip" key={r} onClick={() => setRecipients(recipients.filter((x) => x !== r))} title="Remove">{r}</span>)}
            {extra > 0 && <span className="chip chip-more">+{extra}</span>}
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={recipients.length ? "" : "recipient@example.com"}
              onKeyDown={(e) => { if (["Enter", ",", " ", ";"].includes(e.key)) { e.preventDefault(); commitDraft(); } else if (e.key === "Backspace" && !draft) setRecipients(recipients.slice(0, -1)); }}
              onBlur={commitDraft} onPaste={(e) => { e.preventDefault(); addRecipients(e.clipboardData.getData("text")); }} />
          </div>
          <button className="link-btn" onClick={() => listInput.current.click()}><Upload size={15} /> Upload List</button>
          {recipients.length > 0 && <span className="count">{recipients.length} detected</span>}
          <input ref={listInput} type="file" accept=".csv,.txt" hidden onChange={onList} />
        </div>
        <div className="c-row line"><label>Subject</label><input className="plain" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" /></div>
        <div className="c-row nums">
          <label>Delay between 2 emails</label><input className="num" type="number" min="0" step="1" value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="00" aria-label="Delay in seconds" />
          <label>Hourly Limit</label><input className="num" type="number" min="1" step="1" value={hourly} onChange={(e) => setHourly(e.target.value)} placeholder="00" aria-label="Hourly limit" />
        </div>

        <div className="editor-box">
          <div ref={editor} className="editor" contentEditable suppressContentEditableWarning data-ph="Type Your Reply..." />
          <div className="rte">
            <button onClick={() => fmt("undo")} aria-label="Undo">↶</button><button onClick={() => fmt("redo")} aria-label="Redo">↷</button><i />
            <select onChange={(e) => { fmt("fontSize", e.target.value); e.target.selectedIndex = 0; }} defaultValue="" aria-label="Text size">
              <option value="" disabled>Tт</option><option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option></select><i />
            <button onClick={() => fmt("bold")}><b>B</b></button><button onClick={() => fmt("italic")}><em>I</em></button><button onClick={() => fmt("underline")}><u>U</u></button><i />
            <button onClick={() => fmt("justifyCenter")} aria-label="Center">≡</button><i />
            <button onClick={() => fmt("insertOrderedList")} aria-label="Numbered list">1.</button>
            <button onClick={() => fmt("insertUnorderedList")} aria-label="Bulleted list">•</button>
            <button onClick={() => fmt("indent")} aria-label="Indent">→</button>
            <button onClick={() => fmt("outdent")} aria-label="Outdent">←</button>
            <button onClick={() => fmt("formatBlock", "blockquote")} aria-label="Quote">“</button><i />
            <button onClick={() => fmt("strikeThrough")}><s>S</s></button>
          </div>
        </div>

        {files.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "12px", color: "#4B5563", fontWeight: "600" }}>
              📎 Attachments ({files.length}):
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  title="Click to remove"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#F3F4F6",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  {f.url ? (
                    <img src={f.url} alt={f.filename} style={{ width: "18px", height: "18px", borderRadius: "3px", objectFit: "cover" }} />
                  ) : (
                    <span>📄</span>
                  )}
                  <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.filename}
                  </span>
                  <span style={{ color: "#9CA3AF", fontSize: "10px" }}>
                    ({Math.round((f.size || 0) / 1024)} KB)
                  </span>
                  <span style={{ color: "#EF4444", fontWeight: "bold", marginLeft: "4px" }}>×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
