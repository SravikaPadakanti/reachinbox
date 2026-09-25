import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { env } from "../config/env";
import { prisma } from "../db/prisma";
import { EMAIL_QUEUE_NAME, EmailJobPayload, enqueueEmailJob } from "../queues/emailQueue";
import { tryConsumeHourlySlot } from "../services/rateLimiter";
import { sendEmail } from "../services/mailer";
import { reconcileOrphanedJobs } from "../queues/reconcile";

async function processEmailJob(job: Job<EmailJobPayload>) {
  const { emailJobId, recipient, subject, body, fromSender, attachments } = job.data;

  // Idempotency guard: if a previous run already marked this SENT (e.g. crash right after
  // sending but before BullMQ recorded completion), don't send twice.
  const record = await prisma.emailJob.findUnique({ where: { id: emailJobId } });
  if (!record) {
    console.warn(`[worker] EmailJob ${emailJobId} not found in DB, skipping`);
    return;
  }
  if (record.status === "SENT") {
    console.log(`[worker] ${emailJobId} already SENT, skipping duplicate`);
    return;
  }

  // Per-sender hourly rate limit, enforced via Redis-backed atomic counter
  const { allowed, retryAt } = await tryConsumeHourlySlot(fromSender);

  if (!allowed) {
    console.log(
      `[worker] hourly limit hit for ${fromSender}, rescheduling ${emailJobId} -> ${retryAt.toISOString()}`
    );
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: { status: "RESCHEDULED", scheduledAt: retryAt },
    });
    // Re-enqueue into the next hour window. Suffix keeps the jobId unique per attempt.
    await enqueueEmailJob(
      { emailJobId, recipient, subject, body, fromSender, attachments },
      retryAt,
      `resched-${Date.now()}`
    );
    return; // this attempt is "handled", not an error — BullMQ marks it completed
  }

  try {
    const { previewUrl } = await sendEmail({
      emailJobId,
      from: fromSender,
      to: recipient,
      subject,
      html: body,
      attachments,
    });
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        failReason: null,
        previewUrl: previewUrl || null,
      },
    });
    console.log(`[worker] sent ${emailJobId} to ${recipient} — preview: ${previewUrl}`);
  } catch (err: any) {
    const maxAttempts = job.opts.attempts || 3;
    const isFinalAttempt = job.attemptsMade >= maxAttempts - 1;

    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: isFinalAttempt ? "FAILED" : "SCHEDULED",
        failReason: isFinalAttempt
          ? err.message?.slice(0, 500)
          : `Retrying (attempt ${job.attemptsMade + 1}/${maxAttempts}): ${err.message?.slice(0, 300)}`,
      },
    });
    throw err; // let BullMQ retry per defaultJobOptions.attempts
  }
}

export const emailWorker = new Worker<EmailJobPayload>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConnection,
    concurrency: env.workerConcurrency, // configurable, safe for parallel jobs
    limiter: {
      // Global minimum delay between individual sends (mimics provider throttling).
      // 1 job per `minDelayBetweenEmailsMs` window, applied by BullMQ itself.
      max: 1,
      duration: env.minDelayBetweenEmailsMs,
    },
  }
);

emailWorker.on("completed", (job) => console.log(`[worker] job ${job.id} completed`));
emailWorker.on("failed", async (job, err) => {
  console.error(`[worker] job ${job?.id} failed:`, err.message);
  if (job?.data?.emailJobId) {
    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
      try {
        await prisma.emailJob.update({
          where: { id: job.data.emailJobId },
          data: {
            status: "FAILED",
            failReason: err.message?.slice(0, 500) || "Send failed",
          },
        });
      } catch (e: any) {
        console.error(`[worker] failed to update emailJob on failed event:`, e.message);
      }
    }
  }
});

console.log(
  `[worker] started — concurrency=${env.workerConcurrency}, minDelay=${env.minDelayBetweenEmailsMs}ms`
);

// Run once at boot, after the worker is listening, so nothing is stuck from a prior crash.
reconcileOrphanedJobs().catch((err) => console.error("[reconcile] failed:", err));
