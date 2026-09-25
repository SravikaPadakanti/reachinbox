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
