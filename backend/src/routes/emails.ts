import { Router } from "express";
import { prisma } from "../db/prisma";
import { requireAuth } from "../middleware/auth";
import { enqueueEmailJob } from "../queues/emailQueue";

export const emailsRouter = Router();

// GET /api/emails/scheduled
emailsRouter.get("/scheduled", requireAuth, async (req, res) => {
  const jobs = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "RESCHEDULED", "PENDING"] }, campaign: { userId: (req.user as any).id } },
    orderBy: { scheduledAt: "asc" },
    take: 200,
  });
  res.json(
    jobs.map((j: (typeof jobs)[number]) => ({
      id: j.id,
      email: j.recipient,
      subject: j.subject,
      scheduledTime: j.scheduledAt,
      status: j.status,
      hasAttachments: Array.isArray(j.attachments) && (j.attachments as any[]).length > 0,
    }))
  );
});

// GET /api/emails/sent
emailsRouter.get("/sent", requireAuth, async (req, res) => {
  const jobs = await prisma.emailJob.findMany({
    where: { status: { in: ["SENT", "FAILED"] }, campaign: { userId: (req.user as any).id } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  res.json(
    jobs.map((j: (typeof jobs)[number]) => ({
      id: j.id,
      email: j.recipient,
      subject: j.subject,
      sentTime: j.sentAt || j.updatedAt,
      status: j.status === "SENT" ? "sent" : "failed",
      failReason: j.failReason,
      hasAttachments: Array.isArray(j.attachments) && (j.attachments as any[]).length > 0,
      previewUrl: j.previewUrl,
    }))
  );
});

// POST /api/emails/:id/retry
emailsRouter.post("/:id/retry", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req.user as any).id;

  const job = await prisma.emailJob.findUnique({
    where: { id },
    include: { campaign: true },
  });

  if (!job) {
    return res.status(404).json({ error: "Email not found" });
  }

  if (job.campaign.userId !== userId && process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  await prisma.emailJob.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      failReason: null,
      scheduledAt: new Date(),
    },
  });

  const bullJob = await enqueueEmailJob(
    {
      emailJobId: job.id,
      recipient: job.recipient,
      subject: job.subject,
      body: job.body,
      fromSender: job.fromSender,
      attachments: (job.attachments as any) || [],
    },
    new Date(),
    `retry-${Date.now()}`
  );

  await prisma.emailJob.update({
    where: { id },
    data: { bullJobId: bullJob.id?.toString() },
  });

  res.json({ ok: true, id: job.id });
});

// GET /api/emails/:id
emailsRouter.get("/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const userId = (req.user as any).id;

  const job = await prisma.emailJob.findUnique({
    where: { id },
    include: { campaign: true },
  });

  if (!job) {
    return res.status(404).json({ error: "Email not found" });
  }

  // Ensure user owns the campaign, or allow in dev for test user
  if (job.campaign.userId !== userId && process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  res.json({
    id: job.id,
    email: job.recipient,
    fromSender: job.fromSender,
    subject: job.subject,
    body: job.body,
    status: job.status.toLowerCase(),
    scheduledTime: job.scheduledAt,
    sentTime: job.sentAt,
    failReason: job.failReason,
    previewUrl: job.previewUrl,
    attachments: (job.attachments as any[]) || [],
    createdAt: job.createdAt,
  });
});

// GET /api/emails/:id/preview - Public HTML email preview viewer (similar to Ethereal web preview)
emailsRouter.get("/:id/preview", async (req, res) => {
  const { id } = req.params;
  const job = await prisma.emailJob.findUnique({
    where: { id },
  });

  if (!job) {
    return res.status(404).send("<div style='font-family:sans-serif;padding:40px;text-align:center;'><h2>Email not found</h2></div>");
  }

  const attachments = (job.attachments as any[]) || [];
  const statusColor = job.status === "SENT" ? "#10b981" : job.status === "FAILED" ? "#ef4444" : "#f59e0b";

  const safeBody = (job.body || "").replace(/"/g, "&quot;");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${job.subject} - ReachInbox Preview</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; }
    .header { background: #1e293b; border-bottom: 1px solid #334155; padding: 20px 28px; }
    .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .brand { font-size: 13px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px; }
    .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44; }
    h1 { font-size: 20px; font-weight: 600; margin-bottom: 14px; color: #ffffff; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; font-size: 13px; color: #94a3b8; }
    .meta-grid b { color: #cbd5e1; }
    .attachments-bar { margin-top: 14px; padding-top: 12px; border-top: 1px solid #334155; display: flex; gap: 8px; flex-wrap: wrap; }
    .att-chip { background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 6px 12px; font-size: 12px; color: #38bdf8; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .preview-container { width: 100%; height: calc(100vh - 190px); background: #ffffff; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge-row">
      <div class="brand">ReachInbox Email Delivery Inspector</div>
      <span class="status-badge">${job.status}</span>
    </div>
    <h1>${job.subject}</h1>
    <div class="meta-grid">
      <div><b>From:</b> ${job.fromSender}</div>
      <div><b>To:</b> ${job.recipient}</div>
      <div><b>Time:</b> ${job.sentAt ? new Date(job.sentAt).toUTCString() : new Date(job.scheduledAt).toUTCString()}</div>
      <div><b>Delivery ID:</b> <code>${job.id}</code></div>
    </div>
    ${attachments.length > 0 ? `
      <div class="attachments-bar">
        ${attachments.map((a: any) => `<div class="att-chip">📎 ${a.filename}</div>`).join('')}
      </div>
    ` : ''}
  </div>
  <div class="preview-container">
    <iframe sandbox="allow-same-origin" srcdoc="${safeBody}"></iframe>
  </div>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});
