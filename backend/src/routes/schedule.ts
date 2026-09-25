import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { enqueueEmailJob } from "../queues/emailQueue";
import { requireAuth } from "../middleware/auth";

export const scheduleRouter = Router();

const AttachmentSchema = z.object({
  filename: z.string(),
  content: z.string(), // base64 string
  contentType: z.string().optional(),
  size: z.number().optional(),
});

const ScheduleSchema = z.object({
  fromSender: z.string().email(),
  recipients: z.array(z.string().email()).min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  startTime: z.coerce.date(), // when the first email should go out
  delayBetweenEmailsMs: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1).default(200),
  attachments: z.array(AttachmentSchema).optional().default([]),
});

// POST /api/schedule
scheduleRouter.post("/", requireAuth, async (req, res) => {
  const parsed = ScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;
  const userId = (req.user as any).id; // from the session, never trust a client-supplied userId

  const campaign = await prisma.campaign.create({
    data: {
      userId,
      fromSender: data.fromSender,
      subject: data.subject,
      body: data.body,
      delayBetweenEmailsMs: data.delayBetweenEmailsMs,
      hourlyLimit: data.hourlyLimit,
      startTime: data.startTime,
      attachments: data.attachments as any,
    },
  });

  // Fan out: one EmailJob row + one BullMQ delayed job per recipient.
  // Stagger scheduledAt by delayBetweenEmailsMs purely for DB bookkeeping / UI display —
  // the ACTUAL throttling is enforced by the worker's limiter + hourly rate limiter.
  const created = [];
  for (let i = 0; i < data.recipients.length; i++) {
    const recipient = data.recipients[i];
    const scheduledAt = new Date(
      data.startTime.getTime() + i * data.delayBetweenEmailsMs
    );

    const emailJob = await prisma.emailJob.create({
      data: {
        campaignId: campaign.id,
        recipient,
        subject: data.subject,
        body: data.body,
        fromSender: data.fromSender,
        status: "SCHEDULED",
        scheduledAt,
        attachments: data.attachments as any,
      },
    });

    const bullJob = await enqueueEmailJob(
      {
        emailJobId: emailJob.id,
        recipient,
        subject: data.subject,
        body: data.body,
        fromSender: data.fromSender,
        attachments: data.attachments as any,
      },
      scheduledAt
    );

    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullJobId: bullJob.id?.toString() },
    });

    created.push(emailJob);
  }

  res.status(201).json({ campaignId: campaign.id, jobsCreated: created.length });
});
