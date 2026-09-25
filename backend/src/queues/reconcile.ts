import { prisma } from "../db/prisma";
import { emailQueue, enqueueEmailJob } from "./emailQueue";

/**
 * One-shot startup check — NOT a periodic/cron job, runs once when the worker boots.
 *
 * Covers the one gap BullMQ's own Redis persistence doesn't: a crash between
 * "we wrote the EmailJob row to Postgres" and "we successfully called queue.add()".
 * If that happens, the DB has a SCHEDULED row with no corresponding BullMQ job,
 * and it would otherwise sit there forever.
 *
 * Also covers Redis losing data it hadn't fsynced yet (e.g. a Redis crash without
 * AOF, or a wiped dev volume): a DB row can point at a bullJobId that no longer
 * exists in the queue.
 *
 * Safe to call on every boot: for each non-terminal row, we check whether a live
 * BullMQ job with that id already exists before adding a new one, so a normal
 * restart (where Redis still has everything) re-enqueues nothing.
 */
export async function reconcileOrphanedJobs() {
  const rows = await prisma.emailJob.findMany({
    where: { status: { in: ["SCHEDULED", "PENDING", "RESCHEDULED"] } },
  });

  let requeued = 0;
  for (const row of rows) {
    const existing = row.bullJobId ? await emailQueue.getJob(row.bullJobId) : null;
    if (existing) continue; // queue already has it — nothing to do

    // Send immediately if the original time already passed while we were down.
    const sendAt = row.scheduledAt.getTime() > Date.now() ? row.scheduledAt : new Date();
    const job = await enqueueEmailJob(
      {
        emailJobId: row.id,
        recipient: row.recipient,
        subject: row.subject,
        body: row.body,
        fromSender: row.fromSender,
      },
      sendAt,
      `reconcile-${Date.now()}` // fresh suffix avoids colliding with the dead jobId
    );
    await prisma.emailJob.update({ where: { id: row.id }, data: { bullJobId: job.id?.toString() } });
    requeued++;
  }

  if (requeued > 0) {
    console.log(`[reconcile] re-enqueued ${requeued} orphaned job(s) on startup`);
  } else {
    console.log(`[reconcile] startup check clean — no orphaned jobs`);
  }
}
